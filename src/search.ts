import { createStore } from "@tobilu/qmd";
import { readConfig } from "./config.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "qmd.db");

async function main() {
  const args = process.argv.slice(2);
  const explain = args.includes("--explain");
  const query = args.filter((a) => a !== "--explain").join(" ");
  if (!query) {
    console.error('Usage: npm run search "your query"');
    console.error('       npm run search:explain "your query"');
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
          : (await store.search({
              query,
              limit: 5,
              ...(explain && {
                explain: true,
                hooks: {
                  onStrongSignal: (score: number) =>
                    console.log(`[strong signal] BM25 top score: ${score.toFixed(3)} — skipping expansion\n`),
                  onExpandStart: () =>
                    console.log("[expand] Expanding query via LLM..."),
                  onExpand: (orig: string, expanded: { type: string; query: string }[], ms: number) => {
                    console.log(`[expand] "${orig}" -> ${expanded.length} variants (${ms}ms)`);
                    for (const e of expanded) console.log(`  ${e.type}: ${e.query}`);
                    console.log();
                  },
                  onEmbedStart: (count: number) =>
                    console.log(`[embed] Embedding ${count} queries...`),
                  onEmbedDone: (ms: number) =>
                    console.log(`[embed] Done (${ms}ms)\n`),
                  onRerankStart: (count: number) =>
                    console.log(`[rerank] Scoring ${count} chunks with LLM...`),
                  onRerankDone: (ms: number) =>
                    console.log(`[rerank] Done (${ms}ms)\n`),
                },
              }),
            })).map((r) => ({
              file: r.file,
              score: r.score,
              snippet: r.bestChunk.slice(0, 300),
              ...(explain && { explain: r.explain }),
            }));

    if (results.length === 0) {
      console.log("No results found.");
    } else {
      console.log(`Found ${results.length} results for "${query}":\n`);
      for (const r of results) {
        console.log(`--- ${r.file} (score: ${r.score.toFixed(3)}) ---`);
        if (r.explain) {
          const e = r.explain;
          const parts = [];
          if (e.ftsScores?.length) parts.push(`fts: [${e.ftsScores.map((s: number) => s.toFixed(2)).join(", ")}]`);
          if (e.vectorScores?.length) parts.push(`vec: [${e.vectorScores.map((s: number) => s.toFixed(2)).join(", ")}]`);
          if (e.rrf) parts.push(`rrf: ${e.rrf.totalScore.toFixed(3)}`);
          if (e.rerankScore != null) parts.push(`rerank: ${e.rerankScore.toFixed(3)}`);
          console.log(`  scores: ${parts.join(" | ")}`);
        }
        console.log(r.snippet);
        console.log();
      }
    }
  } finally {
    await store.close();
  }
}

main().catch(console.error);
