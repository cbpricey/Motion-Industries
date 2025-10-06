import { NextResponse, NextRequest } from "next/server";
import { Client } from "@elastic/elasticsearch";

export const runtime = "nodejs"; // ES client needs Node, not Edge

interface ProductDoc {
  id: number;
  manufacturer: string;
  sku: string;
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

  try {
    const query = manufacturer
      ? { match: { manufacturer } } // minimal: analyzed text match
      : { match_all: {} };

    const result = await client.search({
      index: "image_metadata", // your sample index name
      size: 20,
      query,
    });

    const docs: ProductDoc[] = result.hits.hits.map((hit, i) => {
      const src: any = hit._source ?? {};
      return {
        id: i, // minimal: numeric key for UI; fine for a first run
        manufacturer: src.manufacturer ?? "Unknown",
        sku: src.part_number ?? "Unknown",
        title:
          src.description ??
          `${src.manufacturer ?? ""} ${src.part_number ?? ""}`.trim(),
        description: src.description ?? "",
        image_url: src.image_url ?? "",
        confidence_score: (hit as any)._score ?? 0,
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
