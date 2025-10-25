import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { Client } from "@elastic/elasticsearch";

const elastic = new Client({ node: "http://localhost:9200" });

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: { params: { prompt: "login" } },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: "select_account" } }, // ✅ shows account chooser each time
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Run upon sign in
      if (user?.email) {
        const result = await elastic.search({
          index: "users",
          query: { term: { "email.keyword": user.email } },
        });

        const userDoc = result.hits.hits[0]?._source as { role?: string };
        
        token.role = userDoc?.role || "reviewer"; // fallback
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    }
  },
  events: {
    async signIn({ user }) {
      // Check if user already exists in Elastic
      const existing = await elastic.search({
        index: "users",
        query: { term: { "email.keyword": user.email } },
      });

      const total =
      typeof existing.hits.total === "number"
        ? existing.hits.total
        : existing.hits.total?.value ?? 0;

      if (total === 0) {
        await elastic.index({
          index: "users",
          document: {
            name: user.name,
            email: user.email,
            role: "reviewer",
            created_at: new Date().toISOString(),
          }
        })
      }
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
