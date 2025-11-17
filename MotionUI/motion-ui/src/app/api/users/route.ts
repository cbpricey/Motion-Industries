import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * GET – list all users (admin only)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const mapped = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.createdAt.toISOString(),
  }));

  return NextResponse.json(mapped);
}

/**
 * POST – create a new user (optional manual admin create)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, role, password } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Hash password if provided
  const hashed = password ? await import("bcryptjs").then((m) => m.hash(password, 10)) : null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: role.toUpperCase(),
      password: hashed,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { ...user, created_at: user.createdAt.toISOString() },
    { status: 201 }
  );
}
