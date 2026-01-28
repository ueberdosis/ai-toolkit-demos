# Tiptap AI Toolkit Demos

A Next.js application demonstrating the Tiptap AI Toolkit capabilities for AI-powered document editing.

## Architecture

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Backend API routes for each demo
│   │   ├── chat/          # Main chatbot API
│   │   ├── comments/      # Comments AI agent API
│   │   ├── comments-workflow/
│   │   ├── insert-content-workflow/
│   │   ├── multi-document/
│   │   ├── proofreader/
│   │   ├── schema-awareness/
│   │   ├── selection-awareness/
│   │   ├── tiptap-edit-workflow/
│   │   └── tool-streaming/
│   ├── ai-agent-chatbot/  # Basic AI chatbot demo
│   ├── comments/          # Comments management demo
│   ├── comments-workflow/
│   ├── insert-content-workflow/
│   ├── multi-document/    # Multi-document editing demo
│   ├── proofreader/       # Proofreading workflow demo
│   ├── review-changes/    # Change review with suggestions
│   ├── review-changes-as-summary/
│   ├── schema-awareness/  # Custom schema handling demo
│   ├── selection-awareness/
│   ├── tiptap-edit-workflow/
│   ├── tool-streaming/    # Tool call streaming demo
│   └── page.tsx           # Home page with demo links
├── demos/                  # Reusable demo components
│   └── comments/          # Comments feature React components
└── lib/                   # Shared utilities
    └── rate-limit.ts      # Upstash rate limiting
```

Each demo has a corresponding page component (client-side) and API route (server-side). The API routes use the Vercel AI SDK to stream responses and integrate with Tiptap AI Toolkit for document manipulation.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type safety |
| Tiptap | Rich text editor framework |
| @tiptap-pro/ai-toolkit | AI-powered document editing tools |
| AI SDK (Vercel) | LLM integration and streaming |
| OpenAI / Anthropic | LLM providers |
| Tailwind CSS 4 | Styling |
| Sass | Component-specific styles |
| Yjs | Real-time collaboration |
| Upstash Redis | Rate limiting |
| pnpm | Package manager |

## Branches

**Default Branch:** `main`

| Branch | Purpose |
|--------|---------|
| main | Production-ready code |
| feat/aiCursor | AI cursor feature development |
| feature/comments | Comments functionality |
| feature/inline-edits-demo | Inline editing demonstration |
| feature/insert-content-workflow | Content insertion workflow |
| feature/server-ai-toolkit | Server-side AI toolkit integration |

## QA Tools

### Linting

```bash
pnpm lint
```

Uses Biome for linting with recommended rules. Checks `src/**/*.{js,jsx,ts,tsx,json}`.

### Formatting

```bash
pnpm lint:fix
```

Uses Biome with 2-space indentation. Also runs TypeScript type checking.

### Type Checking

```bash
npx tsc --noEmit
```

TypeScript strict mode checking (included in `lint:fix`).

### Testing

No test framework configured. This is a demo application.

### Manual UI Testing

```bash
pnpm dev
```

Opens at [http://localhost:3000](http://localhost:3000). Uses Turbopack for fast development builds.

**Demo pages to test:**
- `/ai-agent-chatbot` - Basic AI chatbot
- `/review-changes` - Suggestion review flow
- `/multi-document` - Multi-document editing
- `/proofreader` - Proofreading workflow
- `/comments` - Comments management
- `/schema-awareness` - Custom node handling
- `/selection-awareness` - Selection-based AI

## Best Practices

- Each demo is self-contained with its own page and API route
- API routes use streaming for responsive AI interactions
- Use the Tiptap AI Toolkit extensions for document manipulation
- Rate limiting is implemented via Upstash Redis (optional)
- Environment variables required: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Follow Biome linting rules for consistent code style
