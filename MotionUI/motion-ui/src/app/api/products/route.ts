import { NextResponse, NextRequest } from "next/server";
import { Client } from "@elastic/elasticsearch";

export const runtime = "nodejs"; // ES client needs Node, not Edge

interface ProductDoc {
  id: number;
  manufacturer: string;
  sku_number: string;             // ← expose sku_number (not `sku`) for the UI
  title: string;
  description: string;
  image_url: string;
  confidence_score: number;
  status: string;
}

// Create Elastic client
const client = new Client({
  node: "http://localhost:9200", // Docker Elastic endpoint
});

// Handle GET /api/products
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const manufacturer = searchParams.get("manufacturer");
  const sku_number = searchParams.get("sku_number");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort");

  try {
    const must: any[] = [];
    const should: any[] = [];

    // Filter by manufacturer
    if (manufacturer && manufacturer !== "All") {
      must.push({ term: { "manufacturer.keyword": manufacturer } });
    }

    // Filter by SKU number
    if (sku_number && sku_number !== "All") {
      should.push(
        { term: { "sku_number.keyword": sku_number } },
        { term: { "part_number.keyword": sku_number } },
        { term: { "sku.keyword": sku_number } }
      );
    }

    // Filter by status (pending, approved, rejected)
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      must.push({ term: { "status.keyword": status } });
    }

    // Build query
    const query =
      must.length === 0 && should.length === 0
        ? { match_all: {} }
        : {
            bool: {
              must,
              ...(should.length ? { should, minimum_should_match: 1 } : {}),
            },
          };


    // ES takes a list of sort parameters, in order of priority
    let sortClause: any = [];
    // But if we implement multiple parameters, this switch will need to be refactored
    switch (sort) {
      case "confidence_desc":
        sortClause = [{ confidence: { order: "desc" } }];
        break;
      case "newest":
        sortClause = [{ timestamp: { order: "desc" } }];
        break;
      case "oldest":
        sortClause = [{ timestamp: { order: "asc" } }];
        break;
      case "relevance":
      default:
        // Relevance uses _score, which is default when no sort is set
        sortClause = ["_score"];
        break;
    }

    // Execute search
    const result = await client.search({
      index: "image_metadata",
      size: 100,
      query,
      sort: sortClause,
    });

    const docs: ProductDoc[] = (result.hits.hits as any[]).map((hit) => {
      const src = hit._source ?? {};
      const normalizedSku =
        src.sku_number ??
        src.part_number ??
        src.sku ??
        String(src.id ?? hit._id);

      return {
        id: hit._id,
        manufacturer: src.manufacturer ?? "Unknown",
        sku_number: normalizedSku,
        title:
          src.description ??
          `${src.manufacturer ?? ""} ${normalizedSku}`.trim(),
        description: src.description ?? "",
        image_url: src.image_url ?? "",
        confidence_score: src.confidence ?? 0,
        status: src.status ?? "pending",
      };
    });

    return NextResponse.json(docs);
  } catch (e) {
    console.error("Elastic query failed:", e);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
