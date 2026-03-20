import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
];

const TOKEN_PATH = path.join(import.meta.dir, "..", "token.json");
const CREDENTIALS_PATH = path.join(import.meta.dir, "..", "credentials.json");

async function getAuthClient() {
  // Try loading saved token first
  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
    const auth = google.auth.fromJSON(token);
    return auth;
  }

  // Otherwise, authenticate via browser
  const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  // Save token for next run
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
  const key = credentials.installed || credentials.web;
  const tokenPayload = {
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: (auth.credentials as any).refresh_token,
  };
  writeFileSync(TOKEN_PATH, JSON.stringify(tokenPayload));
  console.log("Token saved to", TOKEN_PATH);

  return auth;
}

interface GoogleDoc {
  id: string;
  title: string;
  markdown: string;
}

function structuralElementToMarkdown(element: any): string {
  if (element.paragraph) {
    const para = element.paragraph;
    const style = para.paragraphStyle?.namedStyleType || "";

    let text = "";
    for (const el of para.elements || []) {
      if (el.textRun) {
        let run = el.textRun.content || "";
        const ts = el.textRun.textStyle || {};
        if (ts.bold) run = `**${run.trim()}** `;
        if (ts.italic) run = `*${run.trim()}* `;
        if (ts.link?.url) run = `[${run.trim()}](${ts.link.url}) `;
        text += run;
      }
    }

    // Apply heading styles
    if (style === "HEADING_1") return `# ${text.trim()}\n\n`;
    if (style === "HEADING_2") return `## ${text.trim()}\n\n`;
    if (style === "HEADING_3") return `### ${text.trim()}\n\n`;
    if (style === "HEADING_4") return `#### ${text.trim()}\n\n`;

    // Lists
    if (para.bullet) {
      const level = para.bullet.nestingLevel || 0;
      const indent = "  ".repeat(level);
      return `${indent}- ${text.trim()}\n`;
    }

    return text.endsWith("\n") ? text : text + "\n";
  }

  if (element.table) {
    let md = "";
    for (const row of element.table.tableRows || []) {
      const cells = (row.tableCells || []).map((cell: any) => {
        return (cell.content || [])
          .map(structuralElementToMarkdown)
          .join("")
          .trim();
      });
      md += `| ${cells.join(" | ")} |\n`;
    }
    return md + "\n";
  }

  return "";
}

function docToMarkdown(doc: any): string {
  const title = doc.title || "Untitled";
  let md = `# ${title}\n\n`;

  for (const element of doc.body?.content || []) {
    md += structuralElementToMarkdown(element);
  }

  return md;
}

export async function fetchAllGoogleDocs(): Promise<GoogleDoc[]> {
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth: auth as any });
  const docs = google.docs({ version: "v1", auth: auth as any });

  // List all Google Docs
  console.log("Fetching list of Google Docs...");
  const allFiles: any[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document' and trashed=false",
      fields: "nextPageToken, files(id, name, modifiedTime)",
      pageSize: 100,
      pageToken,
    });

    allFiles.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  console.log(`Found ${allFiles.length} Google Docs`);

  // Fetch each doc's content
  const results: GoogleDoc[] = [];
  for (const file of allFiles) {
    try {
      const doc = await docs.documents.get({ documentId: file.id! });
      const markdown = docToMarkdown(doc.data);
      results.push({
        id: file.id!,
        title: file.name!,
        markdown,
      });
      console.log(`  Fetched: ${file.name}`);
    } catch (err: any) {
      console.error(`  Failed to fetch "${file.name}": ${err.message}`);
    }
  }

  return results;
}
