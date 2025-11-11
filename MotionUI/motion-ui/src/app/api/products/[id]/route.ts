import { NextRequest, NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";

export const runtime = "nodejs"; // ES client needs Node runtime

const client = new Client({
  node: "http://localhost:9200", // your Docker ES endpoint
});

const INDEX = "image_metadata";

// GET /api/products/:id
// Fetch a single document by its ES _id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  try {
    const result = await client.get({
      index: INDEX,
      id,
    });

    if (!result.found) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const src = result._source as any;

    const confidence = src.confidence ?? 0
    const confidence_score = confidence * 100

    const product = {
      id: result._id,
      manufacturer: src.manufacturer ?? "Unknown",
      sku_number:
        src.sku_number ?? src.part_number ?? src.sku ?? String(src.id ?? id),
      title:
        src.description ??
        `${src.manufacturer ?? ""} ${src.sku_number ?? ""}`.trim(),
      description: src.description ?? "",
      image_url: src.image_url ?? "",
      confidence_score: confidence_score,
      status: src.status ?? "pending",
    };

    return NextResponse.json(product);
  } catch (e: any) {
    console.error("Error fetching product by ID:", e);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PATCH /api/products/:id
// Update the "status" (or any other fields) of a product by _id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const result = await client.update({
      index: INDEX,
      id,
      doc: { status },
      doc_as_upsert: false, // do not create if it doesn't already exist
    });

    if (status === "approved" || status === "rejected"){
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      // Not async bc UI shouldn't wait for feedback to be recorded
      fetch(`${baseUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          user_action: status, // "approved" or "rejected"
        }),
      }).catch(err => console.error("Feedback recording failed:", err));
    }

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error("Error updating product:", e);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
