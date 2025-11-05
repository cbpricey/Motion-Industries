import { NextRequest, NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";
import type { estypes } from "@elastic/elasticsearch"; // types only; we won't rely on specific agg names

export const runtime = "nodejs";

const client = new Client({ node: process.env.ELASTICSEARCH_URL || "http://localhost:9200" });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Which field to facet on (defaults to manufacturer)
  const field = searchParams.get("field") ?? "manufacturer";

  // SAME FILTERS as products endpoint
  const manufacturer = searchParams.get("manufacturer");
  const sku_number = searchParams.get("sku_number");
  const sku_prefix = searchParams.get("sku_prefix");
  const min_confidence = searchParams.get("min_confidence");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const must: estypes.QueryDslQueryContainer[] = [];
    const should: estypes.QueryDslQueryContainer[] = [];

    if (manufacturer && manufacturer !== "All") {
      must.push({ match: { manufacturer } });
    }

    if (sku_number && sku_number !== "All") {
      should.push(
        { term: { "sku_number.keyword": sku_number } },
        { term: { "part_number.keyword": sku_number } },
        { term: { "sku.keyword": sku_number } }
      );
    }

    if (sku_prefix) {
      must.push({
        bool: {
          should: [
            { prefix: { "sku_number.keyword": sku_prefix } },
            { prefix: { "part_number.keyword": sku_prefix } },
            { prefix: { "sku.keyword": sku_prefix } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    if (min_confidence) {
      const num = Number(min_confidence);
      if (!Number.isNaN(num)) {
        const scaled = num / 100; // scale 0–100 from frontend slider to 0–1 in ES
        must.push({ range: { confidence: { gte: scaled } } });
      }
    }

    if (status && status !== "any") {
      must.push({ term: { "status.keyword": status } });
    }

    if (from || to) {
      must.push({
        range: {
          created_at: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        },
      });
    }

    const query: estypes.QueryDslQueryContainer =
      must.length === 0 && should.length === 0
        ? { match_all: {} }
        : { bool: { must, ...(should.length ? { should, minimum_should_match: 1 } : {}) } };

    // Aggregation-only search
    const raw = await client.search({
      index: "image_metadata",
      size: 0,
      query,
      aggs: {
        facet: {
          terms: {
            field: `${field}.keyword`, // facet on keyword to avoid tokenization
            size: 1000,
            order: { _key: "asc" },
          },
        },
      },
    });

    // Version-agnostic, runtime-safe extraction of terms buckets
    type Bucket = { key: string | number; doc_count?: number } & Record<string, unknown>;
    const aggs = (raw as any)?.aggregations;
    const buckets: Bucket[] = Array.isArray(aggs?.facet?.buckets) ? aggs.facet.buckets : [];

    return NextResponse.json({
      buckets: buckets.map((b) => ({ key: String(b.key), doc_count: b.doc_count ?? 0 })),
    });
  } catch (e) {
    console.error("Facet query failed:", e);
    return NextResponse.json({ error: "Failed to fetch facets" }, { status: 500 });
  }
}
