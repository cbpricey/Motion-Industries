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
  confidence_score: number; // from doc if present; else _score
  status: string;
  created_at?: string;
}

const client = new Client({
  node: "http://localhost:9200",
});

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
    const must: any[] = [];
    const should: any[] = [];

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

    // Min confidence (assumes you index a numeric field `confidence_score`)
    if (min_confidence) {
      const num = Number(min_confidence);
      if (!Number.isNaN(num)) {
        must.push({ range: { confidence_score: { gte: num } } });
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

    // Sorting
    // - relevance (default): no sort, use ES _score
    // - confidence_desc: sort by confidence_score desc, then _score desc
    // - newest/oldest: sort by created_at
    const sortClause: any[] | undefined =
      sort === "confidence_desc"
        ? [{ confidence_score: { order: "desc", missing: "_last", unmapped_type: "float" } }, { _score: { order: "desc" } }]
        : sort === "newest"
        ? [{ created_at: { order: "desc", missing: "_last", unmapped_type: "date" } }]
        : sort === "oldest"
        ? [{ created_at: { order: "asc", missing: "_last", unmapped_type: "date" } }]
        : undefined;

    const result = await client.search({
      index: "image_metadata",
      size: 100,
      query,
      ...(sortClause ? { sort: sortClause } : {}),
    });

    const docs: ProductDoc[] = (result.hits.hits as any[]).map((hit, i) => {
      const src = hit._source ?? {};

      const normalizedSku: string =
        src.sku_number ?? src.part_number ?? src.sku ?? String(src.id ?? hit._id);

      return {
        id: src.id ?? hit._id ?? i,
        manufacturer: src.manufacturer ?? "Unknown",
        sku_number: normalizedSku,
        title: src.title ?? src.description ?? `${src.manufacturer ?? ""} ${normalizedSku}`.trim(),
        description: src.description ?? "",
        image_url: src.image_url ?? "",
        confidence_score:
          typeof src.confidence_score === "number" ? src.confidence_score : (hit._score ?? 0),
        status: String(src.status ?? "pending"),
        created_at: src.created_at,
      };
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Elastic query failed:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
