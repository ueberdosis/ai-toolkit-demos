# Multi-document clinical workspace demo

A standalone Next.js app demonstrating Tiptap AI Toolkit across four fictional clinical-trial documents. Chat can mention documents, propose tracked changes, and attach comments explaining each suggestion.

## Run locally

Use Node 24 and pnpm 10. Configure access to the Tiptap Pro registry using your existing npm configuration, then:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. The app starts directly in the study workspace. Each page load starts a new study with seeded documents.

## Configuration

Use the same environment variables as the Tiptap team's `ai-toolkit-demos` Vercel project. Tiptap access control requires `TIPTAP_AUTH_PRIVATE_KEY`, `TIPTAP_AUTH_ENVIRONMENT_ID`, and `TIPTAP_CLOUD_DOCUMENT_SERVER_ID`. Set `NPM_RC` in Vercel for access to the private Tiptap registry. Upstash rate limiting is optional. AI requests use the Vercel AI Gateway, or `OPENAI_API_KEY` when configured without `AI_GATEWAY_API_KEY`.

The hosted toolkit API defaults to https://api.tiptap.dev. Set `TIPTAP_CLOUD_AI_API_URL` only when using another toolkit backend. Configure `TIPTAP_CLOUD_AI_ORIGIN` if the document server requires a specific allowed Origin.

## Vercel

Project: `multi-document-clinical-workspace-demo`, team: `tiptap`.

When deploying from the parent repository, set Root Directory to `apps/multi-document-clinical-workspace-demo`. This directory includes its own package manifest, lockfile, configuration, source, styles, and tests; it can also be copied into a separate repository and deployed independently.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
