import { createStore } from "@tobilu/qmd";
import { readConfig } from "./config.ts";
import path from "path";

const DB_PATH = path.join(import.meta.dir, "..", "qmd.db");

async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.error('Usage: bun run search "your query"');
    process.exit(1);
  }

  const config = readConfig();
  const store = await createStore({ dbPath: DB_PATH });

  try {
    if (config.searchMode === "keyword") {
      const results = await store.searchLex(query, { limit: 5 });

      if (results.length === 0) {
        console.log("No results found.");
      } else {
        console.log(`Found ${results.length} results for "${query}":\n`);
        for (const result of results) {
          console.log(`--- ${result.filepath} (score: ${result.score.toFixed(3)}) ---`);
          console.log(result.body?.slice(0, 300) || "(no body)");
          console.log();
        }
      }
    } else if (config.searchMode === "semantic") {
      const results = await store.searchVector(query, { limit: 5 });

      if (results.length === 0) {
        console.log("No results found.");
      } else {
        console.log(`Found ${results.length} results for "${query}":\n`);
        for (const result of results) {
          console.log(`--- ${result.filepath} (score: ${result.score.toFixed(3)}) ---`);
          console.log(result.body?.slice(0, 300) || "(no body)");
          console.log();
        }
      }
    } else {
      const results = await store.search({ query, limit: 5 });

      if (results.length === 0) {
        console.log("No results found.");
      } else {
        console.log(`Found ${results.length} results for "${query}":\n`);
        for (const result of results) {
          console.log(`--- ${result.file} (score: ${result.score.toFixed(3)}) ---`);
          console.log(result.bestChunk.slice(0, 300));
          console.log();
        }
      }
    }
  } finally {
    await store.close();
  }
}

main().catch(console.error);
