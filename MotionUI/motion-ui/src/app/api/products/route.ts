import { NextResponse, NextRequest } from "next/server";
import { Client } from "@elastic/elasticsearch";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const runtime = "nodejs"; // ES client needs Node, not Edge

interface ProductDoc {
  id: number | string;
  manufacturer: string;
  sku_number: string;
  title: string;
  description: string;
  image_url: string;
  confidence_score: number; // from doc if present
  status: string;
  created_at?: string;
  rejection_comment?: string;
  reviewed_by?: string; 
}

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  auth: process.env.ELASTICSEARCH_API_KEY
    ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
    : process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD
    ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      }
    : undefined,
});

type ESQuery = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Filters your Navigator sends
  const manufacturer = searchParams.get("manufacturer");
  const sku_number = searchParams.get("sku_number");
  const sku_prefix = searchParams.get("sku_prefix");
  const min_confidence = searchParams.get("min_confidence"); // numeric field in ES, if available
  const status = searchParams.get("status"); // pending|approved|rejected
  const from = searchParams.get("from");     // ISO date
  const to = searchParams.get("to");         // ISO date
  const sort = searchParams.get("sort");     // relevance|confidence_desc|newest|oldest

  // "cursor" (the sort value from the last page)
  const searchAfter = searchParams.get("cursor");
  const pageSize = 100;

  try {
    const must: ESQuery[] = [];
    const should: ESQuery[] = [];

    // Manufacturer (analyzed text ok for matching vendor names)
    if (manufacturer && manufacturer !== "All") {
      must.push({ match: { manufacturer } });
    }

    // Exact SKU number (try common fields)
    if (sku_number && sku_number !== "All") {
      should.push(
        { term: { "sku_number.keyword": sku_number } },
        { term: { "part_number.keyword": sku_number } },
        { term: { "sku.keyword": sku_number } }
      );
    }

    // SKU prefix (prefix on keyword fields)
    if (sku_prefix) {
      must.push({
        bool: {
          should: [
            { prefix: { "sku_number.keyword": sku_prefix } },
            { prefix: { "part_number.keyword": sku_prefix } },
            { prefix: { "sku.keyword": sku_prefix } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    // Min confidence
    if (min_confidence) {
      const num = Number(min_confidence);
      if (!Number.isNaN(num)) {
        const scaled = num / 100; // scale 0–100 from frontend slider to 0–1 in ES
        must.push({ range: { confidence: { gte: scaled } } });
      }
    }

    // Status (exact match)
    if (status && status !== "any") {
      must.push({ term: { "status.keyword": status } });
    }

    // Date range
    if (from || to) {
      must.push({
        range: {
          timestamp: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        },
      });
    }

    const query =
      must.length === 0 && should.length === 0
        ? { match_all: {} }
        : { bool: { must, ...(should.length ? { should, minimum_should_match: 1 } : {}) } };


    // ES takes a list of sort parameters, in order of priority
    // But if we implement multiple parameters, this switch will need to be refactored
    // Sort must be deterministic when using search_after
    let sortClause;
    switch (sort) {
      case "confidence_desc":
        sortClause = [{ confidence: {order: "desc" as const} }, { timestamp: {order: "asc" as const} }];
        break;
      case "newest":
        sortClause = [{ timestamp: {order: "desc" as const} }, { confidence: {order: "desc" as const} }];
        break;
      case "oldest":
        sortClause = [{ timestamp: {order: "asc" as const} }, { confidence: {order: "desc" as const} }];
        break;
      default:
        sortClause = [{ _score: {order: "desc" as const} }, { timestamp: {order: "asc" as const} }];
        break;
    }

    const searchAfterArray = searchAfter ? JSON.parse(searchAfter) : undefined;

    const result = await client.search({
      index: "image_metadata",
      size: pageSize,
      query,
      sort: sortClause,
      ...(searchAfterArray ? { search_after: searchAfterArray } : {}),
    });

    const docs: ProductDoc[] = result.hits.hits.map((hit) => {
      const src = (hit._source ?? {}) as Record<string, unknown>;

      const normalizedSku: string =
        (src.sku_number as string) ?? (src.part_number as string) ?? (src.sku as string) ?? String(src.id ?? hit._id);

      const confidence = (src.confidence as number) ?? 0
      const confidence_score = confidence * 100

      return {
        id: (src.id ?? hit._id ?? `unknown-${Date.now()}`) as string | number,
        manufacturer: (src.manufacturer as string) ?? "Unknown",
        sku_number: normalizedSku,
        title:
          (src.title as string) ??
          (src.description as string) ??
          `${(src.manufacturer as string) ?? ""} ${normalizedSku}`.trim(),
        description: (src.description as string) ?? "",
        image_url: (src.image_url as string) ?? "",
        created_at:
          (src.updated_at as string) ??
          (src.timestamp as string) ??
          undefined,
        confidence_score,
        status: (src.status as string) ?? "pending",
        rejection_comment: (src.rejection_comment as string) ?? "",
        reviewed_by: (src.updated_by as string) ?? undefined,
      };
    });

    // Include sort values of last hit for next request
    const nextSearchAfter =
      result.hits.hits.length > 0
        ? result.hits.hits[result.hits.hits.length - 1].sort
        : null;

    return NextResponse.json({
      results: docs ?? [],
      nextCursor: nextSearchAfter, // use this as search_after in next request
      total: result.hits.total?.valueOf ?? 0,
    });
  } catch (error) {
    console.error("Elastic query failed:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email ?? "unknown";

    const { id, status, rejection_comment } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Both id and status are required" },
        { status: 400 }
      );
    }

    const result = await client.update({
      index: "image_metadata",
      id,
      doc: {
        status,
        updated_by: email,
        updated_at: new Date().toISOString(),
        ...(rejection_comment !== undefined
          ? { rejection_comment }
          : {}),
      },
      doc_as_upsert: false,
    });

    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error("Failed to update status:", e);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}

