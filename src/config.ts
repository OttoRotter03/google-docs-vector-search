import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export type SearchMode = "keyword" | "semantic" | "full";

export interface Config {
  searchMode: SearchMode;
}

const CONFIG_PATH = path.join(import.meta.dir, "..", "config.json");

export function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    console.error("No config.json found. Run `bun run setup` first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

export function writeConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}
