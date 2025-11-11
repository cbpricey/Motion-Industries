import NextAuth, { type NextAuthOptions } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { Client } from "@elastic/elasticsearch";
import bcrypt from "bcryptjs";

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

interface UserDoc {
  email: string;
  name: string;
  role: string;
  password?: string;
}

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
      authorization: { params: { prompt: "select_account" } },
    }),
    // Add Credentials Provider for email/password
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter email and password");
        }

        try {
          // Search for user in Elasticsearch
          const result = await elastic.search({
            index: "users",
            query: { term: { "email.keyword": credentials.email } },
          });

          const total = typeof result.hits.total === "number"
            ? result.hits.total
            : result.hits.total?.value ?? 0;

          if (total === 0 || result.hits.hits.length === 0) {
            throw new Error("No user found with this email");
          }

          const hit = result.hits.hits[0];
          const userDoc = hit._source as UserDoc;
          
          // Check if _id exists
          if (!hit._id) {
            throw new Error("User ID not found");
          }
          
          // Check if user has a password (some users might only have OAuth)
          if (!userDoc.password) {
            throw new Error("Please sign in with Google or GitHub");
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            userDoc.password
          );

          if (!isValidPassword) {
            throw new Error("Invalid password");
          }

          // Return user object - ensure id is always a string
          return {
            id: hit._id as string, // Type assertion since we checked above
            email: userDoc.email,
            name: userDoc.name,
            role: userDoc.role,
          };
        } catch (error: unknown) {
          console.error("Auth error:", error);
          throw new Error(error instanceof Error ? error.message : "Authentication failed");
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      // Run upon sign in
      if (user?.email) {
        const result = await elastic.search({
          index: "users",
          query: { term: { "email.keyword": user.email } },
        });

        const userDoc = result.hits.hits[0]?._source as { role?: string };

        const DEFAULT_ROLE = "reviewer";
        token.role = userDoc?.role || DEFAULT_ROLE;
        token.id = result.hits.hits[0]?._id as string; // Type assertion
      }
      return token;
    },
  },
  events: {
    async signIn({ user, account }) {
      // Only create user if they signed in with OAuth (not credentials)
      if (account?.provider === "google" || account?.provider === "github") {
        const existing = await elastic.search({
          index: "users",
          query: { term: { "email.keyword": user.email } },
        });

        const total = typeof existing.hits.total === "number"
          ? existing.hits.total
          : existing.hits.total?.value ?? 0;

        if (total === 0) {
          try {
            await elastic.index({
              index: "users",
              document: {
                name: user.name,
                email: user.email,
                role: "reviewer",
                created_at: new Date().toISOString(),
              },
            });
          } catch (error) {
            console.error("Error indexing new user:", error);
          }
        }
      }
    }
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
