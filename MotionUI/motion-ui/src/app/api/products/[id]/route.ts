import { NextRequest, NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";

export const runtime = "nodejs"; // ES client needs Node runtime

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

const INDEX = "image_metadata";

// GET /api/products/:id
// Fetch a single document by its ES _id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const src = (result._source ?? {}) as Record<string, unknown>;

    const confidence = (src.confidence as number) ?? 0
    const confidence_score = confidence * 100

    const product = {
      id: result._id,
      manufacturer: (src.manufacturer as string) ?? "Unknown",
      sku_number:
        (src.sku_number as string) ?? (src.part_number as string) ?? (src.sku as string) ?? String(src.id ?? id),
      title:
        (src.description as string) ??
        `${(src.manufacturer as string) ?? ""} ${(src.sku_number as string) ?? ""}`.trim(),
      description: (src.description as string) ?? "",
      image_url: (src.image_url as string) ?? "",
      confidence_score: confidence_score,
      status: (src.status as string) ?? "pending",
      rejection_comment: (src.rejection_comment as string) ?? "",
    };

    return NextResponse.json(product);
  } catch (e: unknown) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { status, rejection_comment } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Prepare the document update
    const doc: Record<string, unknown> = { status };

    // Include rejection_comment if provided
    if (rejection_comment !== undefined) {
      doc.rejection_comment = rejection_comment;
    }

    const result = await client.update({
      index: INDEX,
      id,
      doc,
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
          rejection_comment: rejection_comment || "", // Include rejection comment if provided
        }),
      }).catch(err => console.error("Feedback recording failed:", err));
    }

    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    console.error("Error updating product:", e);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
