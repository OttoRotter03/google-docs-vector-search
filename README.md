# Google Docs Vector Search

**Find anything in your Google Docs — instantly.**

If your Google Workspace has turned into a sprawling mess of documents, meeting notes, project specs, and half-finished drafts, you know the pain: you *know* the information is somewhere, but Google's built-in search just isn't cutting it. You end up opening doc after doc, skimming headings, trying to remember what you titled that one document three months ago.

This tool fixes that. It pulls all your Google Docs, converts them to Markdown, and builds a local vector database so you can search by *meaning*, not just keywords. Ask "what was the onboarding plan for new engineers?" and find it — even if the doc is titled "Q3 People Ops Notes."

## How It Works

1. **Ingest** — Fetches every Google Doc from your Drive, converts it to Markdown, and indexes it into a local SQLite vector database with semantic embeddings.
2. **Search** — Run a natural-language query from the command line. Results are ranked by relevance using hybrid search (semantic + keyword matching).

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- Google Cloud OAuth credentials (see below)

### Getting Your Google Credentials

You need a `credentials.json` file from Google Cloud Console. Here's how to get one:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. **Enable the APIs:**
   - Navigate to **APIs & Services > Library**
   - Search for and enable **Google Drive API**
   - Search for and enable **Google Docs API**
4. **Set up the OAuth consent screen:**
   - Go to **APIs & Services > OAuth consent screen**
   - Choose **External** user type (or Internal if you're on a Workspace org)
   - Fill in the required fields (app name, support email)
   - Add the scopes: `drive.readonly` and `documents.readonly`
   - Add your Google account as a test user
5. **Create OAuth credentials:**
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Choose **Desktop app** as the application type
   - Give it a name and click **Create**
   - Click **Download JSON** on the created credential
6. **Save the file** as `credentials.json` in the project root

### Setup

```bash
# Install dependencies
bun install
```

### Usage

```bash
# Step 1: Ingest all your Google Docs (run this first, and again whenever you want to re-sync)
bun run ingest

# Step 2: Search your docs
bun run search "quarterly budget breakdown"
```

On first run, a browser window will open for Google authentication. Your token is cached locally so you won't need to log in again.

## What Gets Created

| File/Directory | Purpose |
|---|---|
| `docs/` | Your Google Docs exported as Markdown files |
| `qmd.db` | Local SQLite vector database |
| `token.json` | Cached OAuth token |

All of these are gitignored.

## Search Features

- **Semantic search** — finds documents by meaning, not just exact word matches
- **Keyword fallback** — if embeddings aren't available, falls back to lexical search
- **Top 5 results** — each result shows the file name, relevance score, and a preview of the best matching section

## Tech Stack

- **Bun** + **TypeScript** — fast runtime with type safety
- **Google APIs** (`googleapis`) — read-only access to Drive and Docs
- **qmd** (`@tobilu/qmd`) — vector embeddings, indexing, and hybrid search over Markdown
