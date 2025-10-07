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
  const sku_number = searchParams.get("sku_number");  // ← new

  try {
    // Build a flexible query that supports manufacturer and/or sku_number
    const must: any[] = [];
    const should: any[] = [];

    if (manufacturer && manufacturer !== "All") {
      must.push({ match: { manufacturer } }); // analyzed text
    }

    if (sku_number && sku_number !== "All") {
      // Try exact matches on common fields. Adjust to your index as needed.
      should.push(
        { term: { "sku_number.keyword": sku_number } },
        { term: { "part_number.keyword": sku_number } },
        { term: { "sku.keyword": sku_number } }
      );
    }

    const query =
      must.length === 0 && should.length === 0
        ? { match_all: {} }
        : {
            bool: {
              must,
              ...(should.length ? { should, minimum_should_match: 1 } : {}),
            },
          };

    const result = await client.search({
      index: "image_metadata",   // ← your index
      size: 100,                 // grab enough to fill the grid
      query,
    });

    const docs: ProductDoc[] = (result.hits.hits as any[]).map((hit, i) => {
      const src = hit._source ?? {};

      // Normalize a sku_number for the UI:
      // prefer explicit field, then part_number/sku, otherwise fallback to ES _id
      const normalizedSku: string =
        src.sku_number ??
        src.part_number ??
        src.sku ??
        String(src.id ?? hit._id);

      return {
        id: i, // UI key; if you have a stable numeric id, use that instead
        manufacturer: src.manufacturer ?? "Unknown",
        sku_number: normalizedSku,
        title:
          src.description ??
          `${src.manufacturer ?? ""} ${normalizedSku}`.trim(),
        description: src.description ?? "",
        image_url: src.image_url ?? "",
        confidence_score: hit._score ?? 0,
        status: "pending",
      };
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Elastic query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
