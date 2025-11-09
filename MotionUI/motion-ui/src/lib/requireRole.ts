import { auth } from "@/auth";

export async function requireRole(required: "ADMIN" | "REVIEWER") {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  const role = (session.user as any).role as "ADMIN" | "REVIEWER" | undefined;

  if (required === "ADMIN" && role !== "ADMIN") {
    throw new Error("Admin only");
  }
  if (required === "REVIEWER" && !(role === "REVIEWER" || role === "ADMIN")) {
    throw new Error("Reviewer only");
  }
  return session;
}
