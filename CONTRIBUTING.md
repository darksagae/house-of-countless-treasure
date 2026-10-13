# Contributing

Fork the public GitHub repository and create a branch for your change. Install the pinned dependencies with `pnpm install --frozen-lockfile`, run `pnpm test` and `pnpm build`, and open a pull request describing the problem, result and verification.

Never include credentials, authentication codes, real customer photographs or private result URLs in commits, issues, test fixtures or screenshots. API integration tests use mocked provider responses; PostgreSQL quota tests use an isolated local database. Check the README for live setup instructions.

The full tool catalog is reference-driven. Changes to a tool's input schema must update both `public/catalog.json` and `lib/catalog.json`. Tool illustrations belong in `public/assets/tools/`; their metadata belongs in `public/tool-visuals.json`.
