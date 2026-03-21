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

  const { searchMode } = readConfig();
  const store = await createStore({ dbPath: DB_PATH });

  try {
    // Each mode returns different shapes — normalize to { file, score, snippet }
    const results =
      searchMode === "keyword"
        ? (await store.searchLex(query, { limit: 5 })).map((r) => ({
            file: r.filepath,
            score: r.score,
            snippet: r.body?.slice(0, 300) ?? "(no body)",
          }))
        : searchMode === "semantic"
          ? (await store.searchVector(query, { limit: 5 })).map((r) => ({
              file: r.filepath,
              score: r.score,
              snippet: r.body?.slice(0, 300) ?? "(no body)",
            }))
          : (await store.search({ query, limit: 5 })).map((r) => ({
              file: r.file,
              score: r.score,
              snippet: r.bestChunk.slice(0, 300),
            }));

    if (results.length === 0) {
      console.log("No results found.");
    } else {
      console.log(`Found ${results.length} results for "${query}":\n`);
      for (const { file, score, snippet } of results) {
        console.log(`--- ${file} (score: ${score.toFixed(3)}) ---`);
        console.log(snippet);
        console.log();
      }
    }
  } finally {
    await store.close();
  }
}

main().catch(console.error);
