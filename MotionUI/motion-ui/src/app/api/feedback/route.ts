import { NextResponse, NextRequest } from "next/server";
import path from "path";
import { Client } from "@elastic/elasticsearch";

export const runtime = "nodejs"; // ES client needs Node, not Edge

const client = new Client({
  node: "http://localhost:9200", // your Docker ES endpoint
});
const INDEX = "image_metadata";
const FEEDBACK_INDEX = "feedback"

export async function POST(req: NextRequest) {
    try {
        const { id, user_action } = await req.json();
        if (!id || !user_action) {
            return NextResponse.json(
                { error: "id and user_action are required" },
                { status: 400 }
            );
        }

        // If we used our GET endpoint, but hitting ES directly is quicker
        // const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        // const res = await fetch(`${baseUrl}/api/products/${id}`);

        const res = await client.get({
            index: "image_metadata",
            id,
        });

        if (!res.found) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        const src = res._source as any;

        const label = user_action === "approved" ? 1 : 0;
        const feedbackDoc = {
            "original_id": res._id, // to associate with document in image_metadata
            "[<ID>]": src.sku_number,
            "MFR_NAME": src.manufacturer,
            "PRIMARY_IMAGE": src.image_url,
            "Label": label, // approved / rejected from UI
        };

        await client.index({
            index: FEEDBACK_INDEX,
            document: feedbackDoc,
        });

        return NextResponse.json({
            success: true,
            message: `Feedback recorded for ${id}`,
        });
    } catch (e) {
    console.error("Failed to record feedback:", e);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}