import { writeConfig, type SearchMode } from "./config.ts";
import { $ } from "bun";

function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

async function main() {
  console.log(`
Welcome to Google Docs Vector Search!

Choose your search mode:

  1. Keyword only (no model downloads)
     Fast BM25 full-text search. Matches exact words and stems.
     Good for finding documents when you know the right terms.
     No AI models needed — works immediately.

  2. Semantic search (~300MB model download)
     Vector similarity search using a local embedding model.
     Finds conceptually related documents even without exact keyword matches.
     e.g. searching "compensation" finds docs about "salary" and "pay".

  3. Full hybrid search (~2GB model download)
     Query expansion + BM25 + vector search + LLM reranking.
     Best search quality. Automatically rewrites your query into multiple
     sub-queries, combines keyword and vector signals, then uses a local
     LLM to re-score and rank the final results.
`);

  const answer = await prompt("Enter 1, 2, or 3: ");

  const modeMap: Record<string, SearchMode> = {
    "1": "keyword",
    "2": "semantic",
    "3": "full",
  };

  const mode = modeMap[answer];
  if (!mode) {
    console.error("Invalid choice. Please enter 1, 2, or 3.");
    process.exit(1);
  }

  writeConfig({ searchMode: mode });
  console.log(`\nSearch mode set to: ${mode}`);

  // Download models via qmd CLI if needed
  if (mode !== "keyword") {
    console.log("\nDownloading required models (this may take a few minutes)...\n");
    await $`npx qmd pull`
    console.log("Models downloaded.");
  }

  console.log("\nSetup complete! Next steps:");
  console.log("  1. Place your credentials.json in the project root");
  console.log("  2. Run `bun run ingest` to fetch and index your Google Docs");
  console.log('  3. Run `bun run search "your query"` to search');
}

main().catch(console.error);
