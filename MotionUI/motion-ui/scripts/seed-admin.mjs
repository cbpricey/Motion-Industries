// Admin Seeder
// Run with: npm run seed:admin
// Make sure Docker/Elasticsearch is running.
// Edit the email/name fields before running to
// seed an admin.

import { Client } from "@elastic/elasticsearch";
import bcrypt from "bcryptjs";

const client = new Client({
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

// Hash password for test user
const hashedPassword = await bcrypt.hash("password", 10);

const res = await client.index({
  index: "users",
  document: {
    email: "kimberly05lim@gmail.com",
    name: "Kimberly Lim",
    role: "admin",
    created_at: new Date().toISOString(),
  },
});

const res2 = await client.index({
  index: "users",
  document: {
    email: "test.reviewer@example.com",
    name: "Test Reviewer",
    role: "reviewer",
    password: hashedPassword,
    created_at: new Date().toISOString(),
  },
});

await client.indices.refresh({ index: "users" }); // immediately searchable

console.log("✅ Indexed admin:", res);
console.log("✅ Indexed reviewer:", res2);
await client.close();