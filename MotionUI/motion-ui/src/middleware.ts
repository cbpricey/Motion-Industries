export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const config = {
  matcher: ["/admin/:path*", "/review-history/:path*", "/catalog-navigator/:path*"],
};

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // 1️⃣  Get the database-session cookie
  const cookie =
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  // If no cookie, redirect to sign-in
  if (!cookie) {
    const signInUrl = new URL("/api/auth/signin", nextUrl);
    signInUrl.searchParams.set("callbackUrl", nextUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  // 2️⃣  Look up the session + user role directly in Prisma
  const session = await prisma.session.findUnique({
    where: { sessionToken: cookie.value },
    include: { user: { select: { role: true } } },
  });

  if (!session || session.expires < new Date()) {
    const signInUrl = new URL("/api/auth/signin", nextUrl);
    signInUrl.searchParams.set("callbackUrl", nextUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  const role = session.user.role as "ADMIN" | "REVIEWER";

  // 3️⃣  Role-based access control
  if (nextUrl.pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }

  if (
    (nextUrl.pathname.startsWith("/review-history") ||
      nextUrl.pathname.startsWith("/catalog-navigator")) &&
    role !== "ADMIN" &&
    role !== "REVIEWER"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }

  // 4️⃣  Allow request through
  return NextResponse.next();
}
