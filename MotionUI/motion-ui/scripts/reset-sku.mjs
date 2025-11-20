import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Client } from "@elastic/elasticsearch";
import fs from "fs";
import path from "path";

const INDEX = "image_metadata";
const SKU = "s13463215";

const dataPath = path.resolve("./scripts/data/s13463215.json");
const docs = JSON.parse(fs.readFileSync(dataPath, "utf8"));

console.log(`Loaded ${docs.length} docs from backup file: ${dataPath}`);

const client = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  },
  sniffOnStart: false,
  sniffInterval: false,
  sniffOnConnectionFault: false,
  tls: {
    rejectUnauthorized: false, // Windows local SSL fix
  }
});

async function main() {
  console.log(`Deleting all docs in index '${INDEX}' with sku_number = ${SKU}...`);

  await client.deleteByQuery({
    index: INDEX,
    query: { term: { sku_number: SKU } }
  }).catch((err) => {
    if (err.meta?.body?.error?.type !== "index_not_found_exception") {
      throw err;
    }
  });

  console.log(`Deleted existing docs for SKU.`);

  console.log(`Reinserting ${docs.length} documents from backup file...`);

  for (const doc of docs) {
    const { id, ...body } = doc;

    await client.index({
      index: INDEX,
      id,
      document: body,
    });
  }

  console.log(`Reinserted ${docs.length} docs for SKU ${SKU}.`);
}

main().catch((err) => {
  console.error("Error:", err);
});
