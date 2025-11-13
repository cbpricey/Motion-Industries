import { NextResponse, NextRequest } from "next/server";
import { Client } from "@elastic/elasticsearch";

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
}

const client = new Client({
  node: "http://localhost:9200",
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
          created_at: {
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
    let sortClause;
    // But if we implement multiple parameters, this switch will need to be refactored
    switch (sort) {
      case "confidence_desc":
        sortClause = [{ confidence: { order: "desc" as const } }];
        break;
      case "newest":
        sortClause = [{ timestamp: { order: "desc" as const } }];
        break;
      case "oldest":
        sortClause = [{ timestamp: { order: "asc" as const } }];
        break;
      case "relevance":
      default:
        // Relevance uses _score, which is default when no sort is set
        sortClause = ["_score"];
        break;
    }

    const result = await client.search({
      index: "image_metadata",
      size: 100,
      query,
      sort: sortClause,
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
        title: (src.title as string) ?? (src.description as string) ?? `${(src.manufacturer as string) ?? ""} ${normalizedSku}`.trim(),
        description: (src.description as string) ?? "",
        image_url: (src.image_url as string) ?? "",
        created_at: src.created_at as string | undefined,
        confidence_score: confidence_score,
        status: (src.status as string) ?? "pending",
        rejection_comment: (src.rejection_comment as string) ?? "",
      };
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Elastic query failed:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Both id and status are required" },
        { status: 400 }
      );
    }

    const result = await client.update({
      index: "image_metadata",
      id,
      doc: { status },
      doc_as_upsert: false, // only update existing docs
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
