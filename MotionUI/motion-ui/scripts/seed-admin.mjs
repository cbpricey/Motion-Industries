// Admin Seeder
// Run with: npm run seed:admin
// Make sure Docker/Elasticsearch is running.
// Edit the email/name fields before running to
// seed an admin.

import { Client } from "@elastic/elasticsearch";

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

await client.indices.refresh({ index: "users" }); // immediately searchable

console.log("✅ Indexed:", res);
await client.close();