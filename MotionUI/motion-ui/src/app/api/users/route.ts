import { NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const elastic = new Client({ node: "http://localhost:9200" });

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  // Check role
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all users from Elastic
  const result = await elastic.search({
    index: "users",
    size: 1000, // limit for safety
    query: { match_all: {} },
  });

  const users = result.hits.hits.map((hit) => hit._source);

  return NextResponse.json(users);
}
