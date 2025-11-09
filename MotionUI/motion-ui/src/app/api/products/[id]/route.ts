import { NextRequest, NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export const runtime = "nodejs";

const client = new Client({
  node: process.env.ELASTIC_URL || "http://localhost:9200",
});

const INDEX = "image_metadata";

/**
 * GET /api/products/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  try {
    const result = await client.get({ index: INDEX, id });

    if (!result.found)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const src = result._source as any;
    return NextResponse.json({
      id: result._id,
      manufacturer: src.manufacturer ?? "Unknown",
      sku_number:
        src.sku_number ?? src.part_number ?? src.sku ?? String(src.id ?? id),
      title:
        src.description ??
        `${src.manufacturer ?? ""} ${src.sku_number ?? ""}`.trim(),
      description: src.description ?? "",
      image_url: src.image_url ?? "",
      confidence_score: src.confidence ?? 0,
      status: src.status ?? "pending",
    });
  } catch (err) {
    console.error("Error fetching product:", err);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/:id
 * Enforce role-based status transitions:
 *   ADMIN → approved / rejected
 *   REVIEWER → pending-approve / pending-reject
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role?.toUpperCase();
  const email = session.user.email ?? "unknown";

  const { status } = await req.json();
  if (!status)
    return NextResponse.json({ error: "Status is required" }, { status: 400 });

  let finalStatus: string | null = null;

  if (status === "approved") {
    if (role === "ADMIN") finalStatus = "approved";
    else if (role === "REVIEWER") finalStatus = "pending-approve";
  } else if (status === "rejected") {
    if (role === "ADMIN") finalStatus = "rejected";
    else if (role === "REVIEWER") finalStatus = "pending-reject";
  }

  if (!finalStatus) {
    return NextResponse.json(
      { error: `Role '${role}' cannot perform status '${status}'.` },
      { status: 403 }
    );
  }

  try {
    const result = await client.update({
      index: INDEX,
      id,
      doc: {
        status: finalStatus,
        updated_by: email,
        updated_at: new Date().toISOString(),
      },
      doc_as_upsert: false,
    });

    return NextResponse.json({ success: true, status: finalStatus, result });
  } catch (err) {
    console.error("Error updating product:", err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
