# VectorFlow — AI Document Ingestion & Knowledge Platform

## Overview
A full SaaS-style web application UI for an AI document ingestion and knowledge platform. Users can upload files, extract content, chunk it, build embeddings, store vectors, and use the data in RAG systems or LLM training workflows.

Design aesthetic: Notion AI × Linear × Vercel × OpenAI dashboard — clean, modern, enterprise-ready.

## Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom indigo primary theme
- **UI Components**: Shadcn UI (Radix UI primitives)
- **State Management**: Zustand
- **Routing**: React Router v7
- **Data Fetching**: Axios + SWR (for future API integration)
- **Animations**: Framer Motion
- **i18n**: i18next / react-i18next
- **Validation**: Zod
- **Package Manager**: pnpm

## Project Structure

```
src/
├── components/
│   ├── app/           # App-wide layout components
│   │   ├── sidebar.tsx        # Left sidebar navigation
│   │   ├── topbar.tsx         # Top navigation bar
│   │   └── status-badge.tsx   # Status pill components
│   └── ui/            # Shadcn base components
├── data/
│   └── mock.ts        # All mock data and TypeScript types
├── pages/
│   ├── private/       # Authenticated app pages
│   │   ├── layout.tsx         # App shell (sidebar + content)
│   │   ├── dashboard/         # Dashboard home
│   │   ├── datasets/          # Datasets list + detail
│   │   ├── documents/         # Documents list + detail
│   │   ├── ingestions/        # New / Auto / Guided mode
│   │   ├── chunks/            # Chunk explorer
│   │   ├── retrieval/         # Retrieval testing
│   │   ├── activity/          # Ingestion logs
│   │   └── settings/          # App settings
│   └── public/        # Auth, error pages
└── router.tsx         # All route definitions
```

## Pages & Routes

| Route | Page |
|-------|------|
| `/` | Dashboard — stats, recent ingestions, system status |
| `/datasets` | Datasets list — grid/list view, search, create |
| `/datasets/:id` | Dataset detail — docs, ingestions, metadata, permissions |
| `/documents` | Documents list |
| `/documents/:id` | Document detail — chunks, metadata, logs |
| `/ingestions/new` | New Ingestion — upload, dataset select, mode choice |
| `/ingestions/auto` | Auto Mode — live progress, logs, success/error states |
| `/ingestions/guided` | Guided Mode — 8-step wizard |
| `/chunks` | Chunk Explorer — filter, raw vs embed text, metadata |
| `/retrieval` | Retrieval Test — semantic search with scored results |
| `/activity` | Activity Logs — ingestion history with detail drawer |
| `/settings` | Settings — models, chunking, vector store, permissions |

## Key Features
- Workspace/tenant switcher in sidebar
- Indigo primary color theme throughout
- All pages use mock data from `src/data/mock.ts`
- Auto Mode page: animated pipeline steps + live log stream
- Guided Mode: 8-step wizard with all review/approve stages
- Responsive cards, tables, drawers, modals
- StatusBadge, ModeBadge, ContentTypeBadge, VisibilityBadge components

## Development
- Workflow: `pnpm run dev` on port 5000
- Vite dev server: `host: "0.0.0.0"`, `allowedHosts: true` for Replit proxy

## Deployment
- Configured as **static** deployment
- Build: `pnpm run build`
- Public dir: `dist`
