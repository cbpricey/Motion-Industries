import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { Client } from "@elastic/elasticsearch";

const elastic = new Client({
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

// GET all users
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await elastic.search({
      index: "users",
      size: 1000,
      query: {
        match_all: {}
      },
      sort: [{ "created_at": "desc" }]
    });

    interface UserDoc {
      email: string;
      name: string;
      role: string;
      created_at: string;
      password?: string;
    }

    const users = result.hits.hits.map((hit) => ({
      id: hit._id,
      ...(hit._source as UserDoc)
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST create new user (optional - if you want manual user creation)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await elastic.search({
      index: "users",
      query: { term: { "email.keyword": email } }
    });

    const total = typeof existing.hits.total === "number"
      ? existing.hits.total
      : existing.hits.total?.value ?? 0;

    if (total > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const result = await elastic.index({
      index: "users",
      document: {
        name,
        email,
        role,
        created_at: new Date().toISOString(),
      }
    });

    return NextResponse.json({
      id: result._id,
      name,
      email,
      role,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import bcrypt from "bcryptjs";

// ... existing code
