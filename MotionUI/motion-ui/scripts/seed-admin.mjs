// scripts/seed-admin.mjs
import { Client } from "@elastic/elasticsearch";

// ✅ Hardcode your shared Elastic instance URL here
// If you’re running locally:
const client = new Client({ node: "http://localhost:9200" });

const res = await client.index({
  index: "users",
  document: {
    email: "omcmenaman@gmail.com",
    name: "Owen McMenaman",
    role: "admin",
    created_at: new Date().toISOString(),
  },
});

await client.indices.refresh({ index: "users" }); // make it immediately searchable

console.log("✅ Indexed:", res);
await client.close();