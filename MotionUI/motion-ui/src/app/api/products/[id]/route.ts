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

    try {
      const userIndex = session.user.id!; // Prisma user.id from session
      interface ReviewLog {
        review_id: string;
        product_id: string;
        action: string;
        final_status: string;
        reviewer_id: string;
        reviewer_email: string;
        reviewer_role?: string;
        timestamp: string;
        manufacturer?: string;
        image_url?: string;
        confidence?: number | null;
      }
      const logEntry : ReviewLog = {
        review_id: crypto.randomUUID(),
        product_id: id,
        action: status.toUpperCase(),     // requested action
        final_status: finalStatus,        // actual stored status
        reviewer_id: userIndex,
        reviewer_email: email,
        reviewer_role: role,
        timestamp: new Date().toISOString(),
      };

      
      try {
        const existing = await client.get({ index: INDEX, id });
        if (existing.found) {
          const src = existing._source as any;
          logEntry.manufacturer = src.manufacturer ?? "";
          logEntry.image_url = src.image_url ?? "";
          logEntry.confidence = src.confidence ?? null;
        }
      } catch (e) {
        console.warn(`[Review Log] Could not fetch existing doc for ${id}:`, e);
      }

      await client.index({
        index: userIndex, // user index
        document: logEntry,
      });

      console.log(`[Review Log] Logged review for ${email} in index ${userIndex}`);
    } catch (logErr) {
      console.error("[Review Log] Failed to log review:", logErr);
    }

    return NextResponse.json({ success: true, status: finalStatus, result });
  } catch (err) {
    console.error("Error updating product:", err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
