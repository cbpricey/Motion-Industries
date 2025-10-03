import { NextResponse, NextRequest } from "next/server";
import { Client } from "@elastic/elasticsearch";

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
      ? { match: { manufacturer } }
      : { match_all: {} };

    const result = await client.search<ProductDoc>({
      index: "products",
      size: 20,
      query,
    });

    const docs: ProductDoc[] = result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is ProductDoc => !!doc);

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Elastic query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
