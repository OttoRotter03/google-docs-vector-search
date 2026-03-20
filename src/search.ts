import { createStore } from "@tobilu/qmd";
import path from "path";

const DB_PATH = path.join(import.meta.dir, "..", "qmd.db");

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Usage: bun run search <query>");
    process.exit(1);
  }

  const store = await createStore({ dbPath: DB_PATH });

  // Try hybrid search first, fall back to lexical if embeddings aren't available
  try {
    const results = await store.search({
      query,
      limit: 5,
      rerank: false,
    });

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
  } catch {
    // Fall back to lexical search if hybrid fails
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
  }

  await store.close();
}

main().catch(console.error);
