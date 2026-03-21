import { fetchAllGoogleDocs } from "./google.ts";
import { createStore } from "@tobilu/qmd";
import { readConfig } from "./config.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "..", "docs");
const DB_PATH = path.join(__dirname, "..", "qmd.db");

async function main() {
  const config = readConfig();

  // 1. Fetch all Google Docs
  const googleDocs = await fetchAllGoogleDocs();

  if (googleDocs.length === 0) {
    console.log("No documents found.");
    return;
  }

  // 2. Write docs as markdown files
  mkdirSync(DOCS_DIR, { recursive: true });

  for (const doc of googleDocs) {
    const safeName = doc.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
    const filename = `${safeName}.md`;
    writeFileSync(path.join(DOCS_DIR, filename), doc.markdown);
  }
  console.log(`\nWrote ${googleDocs.length} markdown files to ${DOCS_DIR}`);

  // 3. Index with qmd
  console.log("\nIndexing documents...");
  const store = await createStore({
    dbPath: DB_PATH,
    config: {
      collections: {
        "google-docs": {
          path: DOCS_DIR,
          pattern: "**/*.md",
        },
      },
    },
  });

  const updateResult = await store.update({
    onProgress: ({ file, current, total }) => {
      console.log(`  [${current}/${total}] ${file}`);
    },
  });
  console.log(
    `Indexed: ${updateResult.indexed} new, ${updateResult.updated} updated, ${updateResult.removed} removed`
  );

  // 4. Generate embeddings (only if semantic or full mode)
  if (config.searchMode !== "keyword") {
    console.log("\nGenerating embeddings (this may take a while on first run)...");
    const embedResult = await store.embed({
      onProgress: ({ chunksEmbedded, totalChunks }) => {
        if (chunksEmbedded % 10 === 0 || chunksEmbedded === totalChunks) {
          console.log(`  Embedded ${chunksEmbedded}/${totalChunks} chunks`);
        }
      },
    });
    console.log("Embedding complete.");
  } else {
    console.log("\nSkipping embeddings (keyword-only mode).");
  }

  await store.close();
  console.log('\nDone! Run `npm run search "your query"` to search your docs.');
}

main().catch(console.error);
