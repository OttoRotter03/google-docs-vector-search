# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1.0] - 2026-03-21

### Added
- `--explain` flag for search command that displays detailed scoring breakdown including BM25, vector scores, RRF, and reranking results
- `search:explain` npm script shortcut for running search with explain enabled
- Detailed debug hooks showing query expansion, embedding, and reranking progress when explain is enabled

## [0.1.0.0] - 2026-03-21

### Added
- Initial project setup with Node.js runtime (migrated from Bun)
- Google Docs indexing via QMD vector database
- Interactive setup flow with search mode options
- Full-text and vector search capabilities
- README documentation
