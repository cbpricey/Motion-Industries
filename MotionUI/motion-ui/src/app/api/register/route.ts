// app/api/register/route.ts
import { NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";
import bcrypt from "bcryptjs";
import { z } from "zod";

const elastic = new Client({ node: process.env.ELASTICSEARCH_URL || "http://localhost:9200" });
const USERS_INDEX = "users";

// Basic validation (tweak as needed)
const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be <= 72 characters")
    // optional: basic complexity checks
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[0-9]/, "Add a number"),
});

async function ensureUsersIndex() {
  const exists = await elastic.indices.exists({ index: USERS_INDEX });
  if (!exists) {
    await elastic.indices.create({
      index: USERS_INDEX,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          name: { type: "text" },
          email: { type: "keyword" },        // keyword for exact matching
          password: { type: "keyword", index: false }, // store hash; don't index
          role: { type: "keyword" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
          provider: { type: "keyword" },
        },
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await ensureUsersIndex();

    const { name, email, password } = parsed.data;

    // Check if email already exists
    const existing = await elastic.search({
      index: USERS_INDEX,
      size: 1,
      query: { term: { "email": email } }, // field is keyword
    });

    const total =
      typeof existing.hits.total === "number"
        ? existing.hits.total
        : existing.hits.total?.value ?? 0;

    if (total > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await elastic.index({
      index: USERS_INDEX,
      document: {
        name,
        email,
        password: passwordHash,
        role: "reviewer",         // default role
        provider: "credentials",  // who created it
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      refresh: "wait_for",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
