# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + DB migrations)
npm run setup

# Development server (with Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Reset the database
npm run db:reset
```

Set `ANTHROPIC_API_KEY` in `.env` to use the real Claude API. Without it, a `MockLanguageModel` is used that returns static component code.

## Architecture

UIGen is a Next.js 15 app (App Router) where users chat with an AI to generate React components, which are previewed live in an iframe.

### Core data flow

1. **Chat** (`src/app/api/chat/route.ts`) — the only AI-facing API route. It receives the full message history plus a serialized `VirtualFileSystem`, calls Claude via Vercel AI SDK's `streamText` with two tools (`str_replace_editor`, `file_manager`), and streams the response back. On finish, it saves updated messages + file state to the project in SQLite.

2. **Virtual File System** (`src/lib/file-system.ts`) — an in-memory tree of `FileNode` objects. All generated code lives here; nothing is written to disk. The VFS is serialized to JSON to pass between client and server. The AI manipulates it exclusively through the two tools.

3. **AI tools** — `str_replace_editor` (`src/lib/tools/str-replace.ts`) handles `view`/`create`/`str_replace`/`insert` commands. `file_manager` (`src/lib/tools/file-manager.ts`) handles `rename`/`delete`. Both receive the VFS instance and mutate it directly.

4. **Live preview** (`src/components/preview/PreviewFrame.tsx`) — renders files from the VFS by transpiling JSX/TSX with Babel Standalone, creating blob URLs for each file, injecting an ES module import map into an iframe's `srcdoc`, and loading the entry point (`/App.jsx` by default). Third-party imports are resolved via `esm.sh`.

5. **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`) — wraps the VFS in React state. The `handleToolCall` method is called by the chat stream consumer to apply each AI tool call to the client-side VFS, triggering a preview refresh via `refreshTrigger`.

### Auth

JWT-based sessions via `jose` (`src/lib/auth.ts`), stored as an `httpOnly` cookie. Auth is server-only. Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem`. Users can use the app as anonymous (projects not saved) or sign up to persist projects.

### Database

Prisma with SQLite (`prisma/dev.db`). Two models: `User` and `Project`. A `Project` stores `messages` (JSON array) and `data` (serialized VFS JSON). Client is generated to `src/generated/prisma`.

### Provider / model

`src/lib/provider.ts` exports `getLanguageModel()`. If `ANTHROPIC_API_KEY` is missing, returns a `MockLanguageModel` that streams hardcoded counter/form/card components. Otherwise returns `claude-haiku-4-5` via `@ai-sdk/anthropic`.

### Testing

Vitest with jsdom + React Testing Library. Tests live alongside source in `__tests__` subdirectories. Uses `vite-tsconfig-paths` so `@/` path aliases work in tests.
