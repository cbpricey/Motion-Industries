import { NextResponse, NextRequest } from "next/server";
import { Client } from "@elastic/elasticsearch";

export const runtime = "nodejs"; // ES client needs Node, not Edge

// Create Elastic client
const client = new Client({
    node: "http://localhost:9200", // Docker Elastic endpoint
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const field = searchParams.get("field");

    if (!field) {
        return NextResponse.json({ error: "Missing field parameter" }, { status: 400 });
    }

    const result = await client.search({
    index: "image_metadata",
    size: 0,
    aggs: {
            facet: {
                terms: {
                    field: `${field}.keyword`,
                    size: 100,
                },
            },
        },
    });

    const buckets = (result.aggregations?.facet as Record<string, any>)?.buckets ?? [];
    const values = buckets.map((b: any) => b.key);

    return NextResponse.json(values);
}