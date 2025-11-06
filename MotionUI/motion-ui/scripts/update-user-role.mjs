// Update User Role Script
// Run with: node scripts/update-user-role.mjs
// This updates an existing user's role in Elasticsearch

import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200"
});

// CHANGE THESE VALUES
const EMAIL = "kimberly05lim@gmail.com";  // The email of the user to update
const NEW_ROLE = "admin";                  // "admin" or "reviewer"

try {
  // Find the user by email
  const searchResult = await client.search({
    index: "users",
    query: { term: { "email.keyword": EMAIL } },
  });

  const total = typeof searchResult.hits.total === "number"
    ? searchResult.hits.total
    : searchResult.hits.total?.value ?? 0;

  if (total === 0) {
    console.error("❌ No user found with email:", EMAIL);
    process.exit(1);
  }

  const hit = searchResult.hits.hits[0];
  const userId = hit._id;
  const currentUser = hit._source;

  console.log("📧 Found user:", currentUser);
  console.log("🔑 User ID:", userId);
  console.log("📝 Current role:", currentUser.role);
  console.log("➡️  New role:", NEW_ROLE);

  // Update the user's role
  const updateResult = await client.update({
    index: "users",
    id: userId,
    doc: { role: NEW_ROLE },
  });

  await client.indices.refresh({ index: "users" });

  console.log("✅ Successfully updated user role!");
  console.log("🔄 Result:", updateResult);
  console.log("\n⚠️  Remember to sign out and sign back in to refresh your session!");

} catch (error) {
  console.error("❌ Error updating user:", error);
} finally {
  await client.close();
}
