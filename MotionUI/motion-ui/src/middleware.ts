export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const config = {
  matcher: ["/admin-crud/:path*", "/review_history/:path*", "/catalog-navigator/:path*"],
};

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  //  Get the database-session cookie
  const cookie =
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  // If no cookie, redirect to sign-in
  if (!cookie) {
    const signInUrl = new URL("/api/auth/signin", nextUrl);
    signInUrl.searchParams.set("callbackUrl", nextUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  //  Look up the session + user role directly in Prisma
  const session = await prisma.session.findUnique({
    where: { sessionToken: cookie.value },
    include: { user: { select: { role: true } } },
  });
  console.log("MIDDLEWARE SESSION RESULT:", JSON.stringify(session, null, 2));


  if (!session || session.expires < new Date()) {
    const signInUrl = new URL("/api/auth/signin", nextUrl);
    signInUrl.searchParams.set("callbackUrl", nextUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  const role = session.user.role as "ADMIN" | "REVIEWER";

  //  Role-based access control
  if (nextUrl.pathname.startsWith("/admin-crud") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }

  if (
    (nextUrl.pathname.startsWith("/review_history") ||
      nextUrl.pathname.startsWith("/catalog-navigator")) &&
    role !== "ADMIN" &&
    role !== "REVIEWER"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }

  //  Allow request through
  return NextResponse.next();
}
