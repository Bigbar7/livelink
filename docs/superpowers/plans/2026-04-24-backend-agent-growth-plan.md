# Backend Agent Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend for Livelink’s “create digital self → continuously add memories → AI extracts knowledge → user confirms → generate public card → discover/connect” flow.

**Architecture:** Use a Next.js App Router backend with API route handlers, Prisma data access, and small service modules. The core domain is not a one-time card form: `users` own a long-lived `agents`, agents receive `source_documents`, AI extracts `profile_facts` and `profile_projects`, confirmed knowledge generates `profile_wikis`, and `agent_profiles` are public card snapshots derived from the agent’s current confirmed knowledge.

**Tech Stack:** Next.js, TypeScript, Prisma, SQLite for local development, Vitest for unit tests, Supertest or route-handler integration tests, Zod for validation, OpenAI-compatible AI client with deterministic mock fallback.

---

## Product Decisions Locked For Backend

- The bottom navigation visual style does not affect backend implementation.
- Backend must model `我的 / 成长 / 发现` as capabilities:
  - `我的`: read current agent state, understanding score, confirmed knowledge, public card status.
  - `成长`: append new source information, extract knowledge, confirm or reject extracted memory.
  - `发现`: search and recommend other agents/cards, then create connection requests.
- Manual input is the required minimum input.
- Resume upload and external links are optional enhancement inputs.
- AI output is always a draft until user confirmation.
- Public card display template is not locked; backend stores structured card data and `templateKey`.

---

## File Structure

Create or modify these files:

```text
package.json
next.config.mjs
tsconfig.json
vitest.config.ts
.env.example
prisma/schema.prisma
prisma/seed.ts
src/app/api/health/route.ts
src/app/api/agents/route.ts
src/app/api/agents/me/route.ts
src/app/api/agents/[agentId]/sources/route.ts
src/app/api/sources/[sourceId]/extract/route.ts
src/app/api/facts/[factId]/confirm/route.ts
src/app/api/wiki/generate/route.ts
src/app/api/cards/generate/route.ts
src/app/api/cards/publish/route.ts
src/app/api/profiles/[slug]/route.ts
src/app/api/search/route.ts
src/app/api/recommendations/route.ts
src/app/api/connections/route.ts
src/lib/db.ts
src/lib/http.ts
src/lib/slug.ts
src/lib/validation.ts
src/services/agent-service.ts
src/services/source-service.ts
src/services/knowledge-service.ts
src/services/wiki-service.ts
src/services/card-service.ts
src/services/search-service.ts
src/services/recommendation-service.ts
src/services/connection-service.ts
src/services/ai/ai-client.ts
src/services/ai/mock-ai-client.ts
src/types/domain.ts
tests/services/agent-service.test.ts
tests/services/source-service.test.ts
tests/services/knowledge-service.test.ts
tests/services/wiki-card-flow.test.ts
tests/services/search-recommendation.test.ts
tests/services/connection-service.test.ts
tests/api/health.test.ts
tests/api/agent-growth-flow.test.ts
tests/fixtures/manual-input.ts
tests/fixtures/source-documents.ts
```

Responsibilities:

- `src/lib/db.ts`: Prisma singleton.
- `src/lib/http.ts`: shared JSON response helpers.
- `src/lib/slug.ts`: stable slug generation.
- `src/lib/validation.ts`: Zod schemas for API input.
- `src/services/*`: business logic, no React or UI concerns.
- `src/services/ai/*`: AI abstraction and deterministic mock fallback.
- `src/app/api/*`: thin HTTP route handlers that validate input and call services.
- `tests/services/*`: fast unit tests for domain behavior.
- `tests/api/*`: integration tests for route contracts.

---

## Task 1: Scaffold Backend Runtime

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `src/lib/http.ts`
- Create: `src/app/api/health/route.ts`
- Test: `tests/api/health.test.ts`

- [ ] **Step 1: Create package scripts and dependencies**

Create `package.json`:

```json
{
  "name": "livelink",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "verify": "npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "prisma": "^5.22.0",
    "tsx": "^4.19.3",
    "typescript": "^5.8.3",
    "vitest": "^3.1.1"
  }
}
```

- [ ] **Step 2: Create TypeScript and Next config**

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {}
};

export default nextConfig;
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: []
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
});
```

Create `.env.example`:

```text
DATABASE_URL="file:./dev.db"
AI_API_KEY=""
AI_BASE_URL=""
AI_MODEL=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 3: Create health endpoint**

Create `src/lib/http.ts`:

```ts
import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ ok: false, error: { message } }, { status: 404 });
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
}
```

Create `src/app/api/health/route.ts`:

```ts
import { ok } from '@/lib/http';

export async function GET() {
  return ok({ status: 'healthy', service: 'livelink-api' });
}
```

- [ ] **Step 4: Add health test**

Create `tests/api/health.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns healthy status', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: { status: 'healthy', service: 'livelink-api' }
    });
  });
});
```

- [ ] **Step 5: Run verification**

Run:

```bash
npm install
npm run typecheck
npm run test -- tests/api/health.test.ts
```

Expected:

```text
TypeScript exits 0
1 test file passes
```

- [ ] **Step 6: Commit**

```bash
git add package.json next.config.mjs tsconfig.json vitest.config.ts .env.example src/lib/http.ts src/app/api/health/route.ts tests/api/health.test.ts
git commit -m "chore: scaffold backend runtime"
```

---

## Task 2: Prisma Schema For Digital Self Growth

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `src/types/domain.ts`
- Create: `prisma/seed.ts`
- Test: `tests/services/agent-service.test.ts`

- [ ] **Step 1: Create Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  displayName String
  role        String?
  city        String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  agents      Agent[]
  sources     SourceDocument[]
  facts       ProfileFact[]
  projects    ProfileProject[]
  wikis       ProfileWiki[]
  cards       AgentProfile[]
  sentConnections     ConnectionRequest[] @relation("ConnectionFrom")
  receivedConnections ConnectionRequest[] @relation("ConnectionTo")
}

model Agent {
  id                   String   @id @default(cuid())
  userId               String
  name                 String
  understandingScore   Int      @default(5)
  currentWikiId        String?
  currentProfileId     String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  sources   SourceDocument[]
  facts     ProfileFact[]
  projects  ProfileProject[]
  wikis     ProfileWiki[]
  cards     AgentProfile[]
}

model SourceDocument {
  id               String   @id @default(cuid())
  userId           String
  agentId          String
  sourceKind       String
  sourceType       String
  url              String?
  title            String?
  description      String?
  rawText          String?
  cleanedText      String?
  contentHash      String?
  fetchStatus      String   @default("manual")
  extractionStatus String   @default("pending")
  userNote         String?
  errorReason      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user     User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  agent    Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)
  facts    ProfileFact[]
}

model ProfileFact {
  id               String   @id @default(cuid())
  userId           String
  agentId          String
  sourceDocumentId String?
  factType         String
  title            String
  summary          String?
  evidenceText     String?
  sourceUrl        String?
  confidence       Float    @default(0.7)
  visibility       String   @default("public")
  status           String   @default("draft")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user     User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  agent    Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)
  source   SourceDocument? @relation(fields: [sourceDocumentId], references: [id], onDelete: SetNull)
}

model ProfileProject {
  id                String   @id @default(cuid())
  userId            String
  agentId           String
  name              String
  role              String?
  summary           String
  techStackJson     String   @default("[]")
  linksJson         String   @default("[]")
  sourceDocumentIds String   @default("[]")
  status            String   @default("draft")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)
}

model ProfileWiki {
  id          String   @id @default(cuid())
  userId      String
  agentId     String
  version     Int
  status      String   @default("generated")
  contentJson String
  markdown    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)
}

model AgentProfile {
  id              String   @id @default(cuid())
  userId          String
  agentId         String
  wikiId          String?
  slug            String   @unique
  status          String   @default("ai_generated")
  headline        String
  bio             String
  tagsJson        String   @default("[]")
  skillsJson      String   @default("[]")
  interestsJson   String   @default("[]")
  offersJson      String   @default("[]")
  wantsJson       String   @default("[]")
  icebreakersJson String   @default("[]")
  templateKey     String   @default("default")
  visibility      String   @default("public")
  publishedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)
}

model ConnectionRequest {
  id         String   @id @default(cuid())
  fromUserId String
  toUserId   String
  source     String
  message    String?
  status     String   @default("pending")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  fromUser User @relation("ConnectionFrom", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUser   User @relation("ConnectionTo", fields: [toUserId], references: [id], onDelete: Cascade)
}

model CardVisit {
  id            String   @id @default(cuid())
  profileId     String
  visitorUserId String?
  source        String?
  createdAt     DateTime @default(now())
}

model RecommendationCandidate {
  id           String   @id @default(cuid())
  userId       String
  targetUserId String
  score        Int
  reasonsJson  String
  status       String   @default("new")
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: Create Prisma client singleton**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

Create `src/types/domain.ts`:

```ts
export type SourceKind = 'manual' | 'resume' | 'link';
export type SourceType = 'manual_text' | 'github' | 'gitee' | 'xiaohongshu' | 'portfolio' | 'blog' | 'article' | 'resume' | 'other';
export type DraftStatus = 'draft' | 'confirmed' | 'rejected';
export type PublishStatus = 'ai_generated' | 'user_confirmed' | 'published';

export type ExtractedKnowledge = {
  facts: Array<{
    factType: 'identity' | 'skill' | 'experience' | 'project' | 'topic' | 'offer' | 'want' | 'achievement' | 'link';
    title: string;
    summary?: string;
    evidenceText?: string;
    confidence: number;
  }>;
  projects: Array<{
    name: string;
    role?: string;
    summary: string;
    techStack: string[];
    links: string[];
  }>;
};
```

- [ ] **Step 3: Create seed data**

Create `prisma/seed.ts`:

```ts
import { prisma } from '../src/lib/db';

async function main() {
  await prisma.user.upsert({
    where: { id: 'demo-user-jun' },
    update: {},
    create: {
      id: 'demo-user-jun',
      displayName: 'Jun',
      role: 'AI Product Builder',
      city: 'Shanghai',
      agents: {
        create: {
          id: 'demo-agent-jun',
          name: 'Jun 的数字分身',
          understandingScore: 36
        }
      }
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
```

- [ ] **Step 4: Run migration**

Run:

```bash
cp .env.example .env
npm run db:generate
npm run db:migrate -- --name init_agent_growth
npm run db:seed
```

Expected:

```text
Prisma Client generated
Migration applied
Seed completed without throwing
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts src/lib/db.ts src/types/domain.ts .env.example
git commit -m "feat: add agent growth data model"
```

---

## Task 3: Create Digital Self And My Agent State

**Files:**
- Create: `src/lib/validation.ts`
- Create: `src/services/agent-service.ts`
- Create: `src/app/api/agents/route.ts`
- Create: `src/app/api/agents/me/route.ts`
- Test: `tests/services/agent-service.test.ts`

- [ ] **Step 1: Add validation schemas**

Create `src/lib/validation.ts`:

```ts
import { z } from 'zod';

export const createAgentSchema = z.object({
  displayName: z.string().min(1).max(40),
  agentName: z.string().min(1).max(60).optional(),
  role: z.string().max(80).optional(),
  city: z.string().max(80).optional()
});

export const addSourceSchema = z.object({
  agentId: z.string().min(1),
  sourceKind: z.enum(['manual', 'resume', 'link']),
  sourceType: z.string().min(1),
  url: z.string().url().optional(),
  title: z.string().max(160).optional(),
  rawText: z.string().max(20000).optional(),
  userNote: z.string().max(5000).optional()
}).refine((value) => value.rawText || value.url || value.userNote, {
  message: 'Provide rawText, url, or userNote'
});
```

- [ ] **Step 2: Write failing service tests**

Create `tests/services/agent-service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent, getMyAgentState } from '@/services/agent-service';

describe('agent-service', () => {
  beforeEach(async () => {
    await prisma.recommendationCandidate.deleteMany();
    await prisma.connectionRequest.deleteMany();
    await prisma.agentProfile.deleteMany();
    await prisma.profileWiki.deleteMany();
    await prisma.profileProject.deleteMany();
    await prisma.profileFact.deleteMany();
    await prisma.sourceDocument.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a user and digital self from a display name', async () => {
    const result = await createAgent({ displayName: 'Jun' });

    expect(result.user.displayName).toBe('Jun');
    expect(result.agent.name).toBe('Jun 的数字分身');
    expect(result.agent.understandingScore).toBe(5);
  });

  it('returns my agent state with source and memory counts', async () => {
    const created = await createAgent({ displayName: 'Jun', role: 'AI Product Builder' });
    const state = await getMyAgentState(created.user.id);

    expect(state.agent.id).toBe(created.agent.id);
    expect(state.understandingScore).toBe(5);
    expect(state.counts.sources).toBe(0);
    expect(state.counts.confirmedFacts).toBe(0);
    expect(state.currentCard).toBeNull();
  });
});
```

- [ ] **Step 3: Implement service**

Create `src/services/agent-service.ts`:

```ts
import { prisma } from '@/lib/db';

export async function createAgent(input: {
  displayName: string;
  agentName?: string;
  role?: string;
  city?: string;
}) {
  const user = await prisma.user.create({
    data: {
      displayName: input.displayName,
      role: input.role,
      city: input.city
    }
  });

  const agent = await prisma.agent.create({
    data: {
      userId: user.id,
      name: input.agentName ?? `${input.displayName} 的数字分身`,
      understandingScore: 5
    }
  });

  return { user, agent };
}

export async function getMyAgentState(userId: string) {
  const agent = await prisma.agent.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  const [sources, confirmedFacts, projects, currentCard] = await Promise.all([
    prisma.sourceDocument.count({ where: { agentId: agent.id } }),
    prisma.profileFact.count({ where: { agentId: agent.id, status: 'confirmed' } }),
    prisma.profileProject.count({ where: { agentId: agent.id, status: 'confirmed' } }),
    agent.currentProfileId ? prisma.agentProfile.findUnique({ where: { id: agent.currentProfileId } }) : null
  ]);

  return {
    agent,
    understandingScore: agent.understandingScore,
    counts: { sources, confirmedFacts, projects },
    currentCard
  };
}
```

- [ ] **Step 4: Implement API routes**

Create `src/app/api/agents/route.ts`:

```ts
import { createAgentSchema } from '@/lib/validation';
import { badRequest, ok, serverError } from '@/lib/http';
import { createAgent } from '@/services/agent-service';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest('Invalid agent input', parsed.error.flatten());
  }

  try {
    return ok(await createAgent(parsed.data));
  } catch {
    return serverError();
  }
}
```

Create `src/app/api/agents/me/route.ts`:

```ts
import { badRequest, notFound, ok, serverError } from '@/lib/http';
import { getMyAgentState } from '@/services/agent-service';

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId');

  if (!userId) {
    return badRequest('Missing userId');
  }

  try {
    return ok(await getMyAgentState(userId));
  } catch (error) {
    if (error instanceof Error && error.message === 'Agent not found') {
      return notFound('Agent not found');
    }
    return serverError();
  }
}
```

- [ ] **Step 5: Run verification**

Run:

```bash
npm run test -- tests/services/agent-service.test.ts
npm run typecheck
```

Expected:

```text
2 tests pass
TypeScript exits 0
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation.ts src/services/agent-service.ts src/app/api/agents src/app/api/agents/me tests/services/agent-service.test.ts
git commit -m "feat: create digital self backend"
```

---

## Task 4: Growth Sources - Manual, Resume, Link Inputs

**Files:**
- Create: `src/services/source-service.ts`
- Create: `src/app/api/agents/[agentId]/sources/route.ts`
- Test: `tests/services/source-service.test.ts`
- Test fixture: `tests/fixtures/manual-input.ts`

- [ ] **Step 1: Add fixture**

Create `tests/fixtures/manual-input.ts`:

```ts
export const manualGrowthInput = {
  sourceKind: 'manual' as const,
  sourceType: 'manual_text',
  title: '最近在做 AI 社交名片',
  rawText: '我正在做 Livelink，一个 AI 社交名片产品。我能提供产品闭环梳理、AI 应用落地和原型设计。我想认识 AI 工程化、推荐系统和社交增长方向的伙伴。',
  userNote: '这是用户手动补充的信息'
};
```

- [ ] **Step 2: Write failing tests**

Create `tests/services/source-service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument, listAgentSources } from '@/services/source-service';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('source-service', () => {
  beforeEach(async () => {
    await prisma.sourceDocument.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('adds manual source to an agent', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });

    const source = await addSourceDocument({
      userId: user.id,
      agentId: agent.id,
      ...manualGrowthInput
    });

    expect(source.sourceKind).toBe('manual');
    expect(source.fetchStatus).toBe('manual');
    expect(source.extractionStatus).toBe('pending');
  });

  it('lists sources newest first', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput, title: 'first' });
    await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput, title: 'second' });

    const sources = await listAgentSources(agent.id);

    expect(sources).toHaveLength(2);
    expect(sources[0].title).toBe('second');
  });
});
```

- [ ] **Step 3: Implement source service**

Create `src/services/source-service.ts`:

```ts
import { prisma } from '@/lib/db';
import type { SourceKind } from '@/types/domain';

export async function addSourceDocument(input: {
  userId: string;
  agentId: string;
  sourceKind: SourceKind;
  sourceType: string;
  url?: string;
  title?: string;
  rawText?: string;
  userNote?: string;
}) {
  const fetchStatus = input.sourceKind === 'link' ? 'pending' : 'manual';

  return prisma.sourceDocument.create({
    data: {
      userId: input.userId,
      agentId: input.agentId,
      sourceKind: input.sourceKind,
      sourceType: input.sourceType,
      url: input.url,
      title: input.title,
      rawText: input.rawText,
      cleanedText: input.rawText,
      userNote: input.userNote,
      fetchStatus,
      extractionStatus: 'pending'
    }
  });
}

export async function listAgentSources(agentId: string) {
  return prisma.sourceDocument.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' }
  });
}
```

- [ ] **Step 4: Implement API route**

Create `src/app/api/agents/[agentId]/sources/route.ts`:

```ts
import { addSourceSchema } from '@/lib/validation';
import { badRequest, ok, serverError } from '@/lib/http';
import { addSourceDocument, listAgentSources } from '@/services/source-service';

export async function GET(_request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await context.params;
  return ok(await listAgentSources(agentId));
}

export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await context.params;
  const body = await request.json();
  const parsed = addSourceSchema.safeParse({ ...body, agentId });

  if (!parsed.success) {
    return badRequest('Invalid source input', parsed.error.flatten());
  }

  try {
    return ok(await addSourceDocument({
      userId: body.userId,
      agentId,
      sourceKind: parsed.data.sourceKind,
      sourceType: parsed.data.sourceType,
      url: parsed.data.url,
      title: parsed.data.title,
      rawText: parsed.data.rawText,
      userNote: parsed.data.userNote
    }));
  } catch {
    return serverError();
  }
}
```

- [ ] **Step 5: Run verification**

Run:

```bash
npm run test -- tests/services/source-service.test.ts
npm run typecheck
```

Expected:

```text
2 tests pass
TypeScript exits 0
```

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/manual-input.ts tests/services/source-service.test.ts src/services/source-service.ts src/app/api/agents/[agentId]/sources/route.ts
git commit -m "feat: add growth source ingestion"
```

---

## Task 5: AI Knowledge Extraction And Confirmation

**Files:**
- Create: `src/services/ai/ai-client.ts`
- Create: `src/services/ai/mock-ai-client.ts`
- Create: `src/services/knowledge-service.ts`
- Create: `src/app/api/sources/[sourceId]/extract/route.ts`
- Create: `src/app/api/facts/[factId]/confirm/route.ts`
- Test: `tests/services/knowledge-service.test.ts`

- [ ] **Step 1: Create AI interface and mock**

Create `src/services/ai/ai-client.ts`:

```ts
import type { ExtractedKnowledge } from '@/types/domain';

export interface AiClient {
  extractKnowledge(input: { text: string; title?: string }): Promise<ExtractedKnowledge>;
  generateWiki(input: { facts: string[]; projects: string[] }): Promise<{ contentJson: unknown; markdown: string }>;
  generateCard(input: { wikiMarkdown: string }): Promise<{
    headline: string;
    bio: string;
    tags: string[];
    skills: string[];
    interests: string[];
    offers: string[];
    wants: string[];
    icebreakers: string[];
  }>;
}
```

Create `src/services/ai/mock-ai-client.ts`:

```ts
import type { AiClient } from './ai-client';

export const mockAiClient: AiClient = {
  async extractKnowledge(input) {
    const text = input.text;
    return {
      facts: [
        {
          factType: 'identity',
          title: 'AI 产品 Builder',
          summary: '关注 AI 社交名片、推荐系统和关系沉淀',
          evidenceText: text.slice(0, 120),
          confidence: 0.82
        },
        {
          factType: 'offer',
          title: '产品闭环梳理',
          summary: '可以提供 AI 应用落地和原型设计能力',
          evidenceText: text,
          confidence: 0.78
        },
        {
          factType: 'want',
          title: '寻找 AI 工程化伙伴',
          summary: '希望认识推荐系统、AI 工程化和社交增长方向的人',
          evidenceText: text,
          confidence: 0.8
        }
      ],
      projects: [
        {
          name: 'Livelink',
          role: 'Product Builder',
          summary: 'AI 社交名片和数字分身产品',
          techStack: ['AI', 'Next.js', 'Recommendation'],
          links: []
        }
      ]
    };
  },

  async generateWiki(input) {
    const markdown = `# 个人 Wiki\n\n## Overview\n${input.facts.join('\n')}\n\n## Projects\n${input.projects.join('\n')}`;
    return {
      contentJson: { overview: { headline: 'AI 社交名片产品 Builder', summary: input.facts.join('；') }, projects: input.projects },
      markdown
    };
  },

  async generateCard() {
    return {
      headline: 'AI 社交名片产品 Builder',
      bio: '关注 AI 如何帮助人更高效地展示价值、发现连接和沉淀关系。',
      tags: ['AI 社交', '产品设计', '推荐系统'],
      skills: ['产品闭环', 'AI 应用落地', '原型设计'],
      interests: ['主动社交', '个人知识库'],
      offers: ['产品设计', 'AI 应用落地'],
      wants: ['AI 工程化伙伴', '推荐系统伙伴'],
      icebreakers: ['AI 如何提升社交匹配效率', '个人名片如何变成长期 Agent']
    };
  }
};
```

- [ ] **Step 2: Write failing tests**

Create `tests/services/knowledge-service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument } from '@/services/source-service';
import { extractKnowledgeFromSource, confirmFact } from '@/services/knowledge-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('knowledge-service', () => {
  beforeEach(async () => {
    await prisma.profileProject.deleteMany();
    await prisma.profileFact.deleteMany();
    await prisma.sourceDocument.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('extracts draft facts and projects from a source', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput });

    const result = await extractKnowledgeFromSource(source.id, mockAiClient);

    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.projects.length).toBe(1);
    expect(result.facts[0].status).toBe('draft');
  });

  it('confirms a fact and increases understanding score', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput });
    const result = await extractKnowledgeFromSource(source.id, mockAiClient);

    const confirmed = await confirmFact(result.facts[0].id);
    const updatedAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });

    expect(confirmed.status).toBe('confirmed');
    expect(updatedAgent.understandingScore).toBeGreaterThan(agent.understandingScore);
  });
});
```

- [ ] **Step 3: Implement knowledge service**

Create `src/services/knowledge-service.ts`:

```ts
import { prisma } from '@/lib/db';
import type { AiClient } from '@/services/ai/ai-client';

export async function extractKnowledgeFromSource(sourceId: string, aiClient: AiClient) {
  const source = await prisma.sourceDocument.findUniqueOrThrow({ where: { id: sourceId } });
  const text = source.cleanedText ?? source.rawText ?? source.userNote ?? '';
  const extracted = await aiClient.extractKnowledge({ text, title: source.title ?? undefined });

  const facts = await Promise.all(extracted.facts.map((fact) => prisma.profileFact.create({
    data: {
      userId: source.userId,
      agentId: source.agentId,
      sourceDocumentId: source.id,
      factType: fact.factType,
      title: fact.title,
      summary: fact.summary,
      evidenceText: fact.evidenceText,
      sourceUrl: source.url,
      confidence: fact.confidence,
      status: 'draft'
    }
  })));

  const projects = await Promise.all(extracted.projects.map((project) => prisma.profileProject.create({
    data: {
      userId: source.userId,
      agentId: source.agentId,
      name: project.name,
      role: project.role,
      summary: project.summary,
      techStackJson: JSON.stringify(project.techStack),
      linksJson: JSON.stringify(project.links),
      sourceDocumentIds: JSON.stringify([source.id]),
      status: 'draft'
    }
  })));

  await prisma.sourceDocument.update({
    where: { id: source.id },
    data: { extractionStatus: 'extracted' }
  });

  return { facts, projects };
}

export async function confirmFact(factId: string) {
  const fact = await prisma.profileFact.update({
    where: { id: factId },
    data: { status: 'confirmed' }
  });

  await prisma.agent.update({
    where: { id: fact.agentId },
    data: { understandingScore: { increment: 8 } }
  });

  return fact;
}
```

- [ ] **Step 4: Implement routes**

Create `src/app/api/sources/[sourceId]/extract/route.ts`:

```ts
import { ok, serverError } from '@/lib/http';
import { extractKnowledgeFromSource } from '@/services/knowledge-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

export async function POST(_request: Request, context: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await context.params;

  try {
    return ok(await extractKnowledgeFromSource(sourceId, mockAiClient));
  } catch {
    return serverError();
  }
}
```

Create `src/app/api/facts/[factId]/confirm/route.ts`:

```ts
import { ok, serverError } from '@/lib/http';
import { confirmFact } from '@/services/knowledge-service';

export async function POST(_request: Request, context: { params: Promise<{ factId: string }> }) {
  const { factId } = await context.params;

  try {
    return ok(await confirmFact(factId));
  } catch {
    return serverError();
  }
}
```

- [ ] **Step 5: Run verification**

Run:

```bash
npm run test -- tests/services/knowledge-service.test.ts
npm run typecheck
```

Expected:

```text
2 tests pass
TypeScript exits 0
```

- [ ] **Step 6: Commit**

```bash
git add src/services/ai src/services/knowledge-service.ts src/app/api/sources/[sourceId]/extract src/app/api/facts/[factId]/confirm tests/services/knowledge-service.test.ts
git commit -m "feat: extract and confirm agent memories"
```

---

## Task 6: Generate Wiki And Public Card Snapshot

**Files:**
- Create: `src/lib/slug.ts`
- Create: `src/services/wiki-service.ts`
- Create: `src/services/card-service.ts`
- Create: `src/app/api/wiki/generate/route.ts`
- Create: `src/app/api/cards/generate/route.ts`
- Create: `src/app/api/cards/publish/route.ts`
- Create: `src/app/api/profiles/[slug]/route.ts`
- Test: `tests/services/wiki-card-flow.test.ts`

- [ ] **Step 1: Create slug helper**

Create `src/lib/slug.ts`:

```ts
export function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'agent';
}
```

- [ ] **Step 2: Write flow test**

Create `tests/services/wiki-card-flow.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument } from '@/services/source-service';
import { confirmFact, extractKnowledgeFromSource } from '@/services/knowledge-service';
import { generateWiki } from '@/services/wiki-service';
import { generateCardFromWiki, publishCard, getPublicProfile } from '@/services/card-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('wiki and card flow', () => {
  beforeEach(async () => {
    await prisma.agentProfile.deleteMany();
    await prisma.profileWiki.deleteMany();
    await prisma.profileProject.deleteMany();
    await prisma.profileFact.deleteMany();
    await prisma.sourceDocument.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('generates wiki, card draft, and published public profile', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput });
    const extracted = await extractKnowledgeFromSource(source.id, mockAiClient);
    await confirmFact(extracted.facts[0].id);

    const wiki = await generateWiki(agent.id, mockAiClient);
    const card = await generateCardFromWiki(wiki.id, mockAiClient);
    const published = await publishCard(card.id);
    const publicProfile = await getPublicProfile(published.slug);

    expect(wiki.status).toBe('generated');
    expect(card.status).toBe('ai_generated');
    expect(published.status).toBe('published');
    expect(publicProfile?.headline).toBe('AI 社交名片产品 Builder');
  });
});
```

- [ ] **Step 3: Implement wiki service**

Create `src/services/wiki-service.ts`:

```ts
import { prisma } from '@/lib/db';
import type { AiClient } from '@/services/ai/ai-client';

export async function generateWiki(agentId: string, aiClient: AiClient) {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
  const facts = await prisma.profileFact.findMany({ where: { agentId, status: 'confirmed' } });
  const projects = await prisma.profileProject.findMany({ where: { agentId } });
  const nextVersion = await prisma.profileWiki.count({ where: { agentId } }).then((count) => count + 1);

  const generated = await aiClient.generateWiki({
    facts: facts.map((fact) => `${fact.title}: ${fact.summary ?? ''}`),
    projects: projects.map((project) => `${project.name}: ${project.summary}`)
  });

  const wiki = await prisma.profileWiki.create({
    data: {
      userId: agent.userId,
      agentId,
      version: nextVersion,
      status: 'generated',
      contentJson: JSON.stringify(generated.contentJson),
      markdown: generated.markdown
    }
  });

  await prisma.agent.update({ where: { id: agentId }, data: { currentWikiId: wiki.id } });

  return wiki;
}
```

- [ ] **Step 4: Implement card service**

Create `src/services/card-service.ts`:

```ts
import { prisma } from '@/lib/db';
import { slugifyName } from '@/lib/slug';
import type { AiClient } from '@/services/ai/ai-client';

export async function generateCardFromWiki(wikiId: string, aiClient: AiClient) {
  const wiki = await prisma.profileWiki.findUniqueOrThrow({ where: { id: wikiId } });
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: wiki.agentId } });
  const generated = await aiClient.generateCard({ wikiMarkdown: wiki.markdown });
  const slug = `${slugifyName(agent.name)}-${Date.now().toString(36)}`;

  return prisma.agentProfile.create({
    data: {
      userId: wiki.userId,
      agentId: wiki.agentId,
      wikiId,
      slug,
      status: 'ai_generated',
      headline: generated.headline,
      bio: generated.bio,
      tagsJson: JSON.stringify(generated.tags),
      skillsJson: JSON.stringify(generated.skills),
      interestsJson: JSON.stringify(generated.interests),
      offersJson: JSON.stringify(generated.offers),
      wantsJson: JSON.stringify(generated.wants),
      icebreakersJson: JSON.stringify(generated.icebreakers),
      templateKey: 'default'
    }
  });
}

export async function publishCard(cardId: string) {
  const card = await prisma.agentProfile.update({
    where: { id: cardId },
    data: { status: 'published', publishedAt: new Date() }
  });

  await prisma.agent.update({
    where: { id: card.agentId },
    data: { currentProfileId: card.id }
  });

  return card;
}

export async function getPublicProfile(slug: string) {
  return prisma.agentProfile.findFirst({ where: { slug, status: 'published' } });
}
```

- [ ] **Step 5: Implement routes**

Create `src/app/api/wiki/generate/route.ts`:

```ts
import { badRequest, ok, serverError } from '@/lib/http';
import { generateWiki } from '@/services/wiki-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

export async function POST(request: Request) {
  const { agentId } = await request.json();
  if (!agentId) return badRequest('Missing agentId');

  try {
    return ok(await generateWiki(agentId, mockAiClient));
  } catch {
    return serverError();
  }
}
```

Create `src/app/api/cards/generate/route.ts`:

```ts
import { badRequest, ok, serverError } from '@/lib/http';
import { generateCardFromWiki } from '@/services/card-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

export async function POST(request: Request) {
  const { wikiId } = await request.json();
  if (!wikiId) return badRequest('Missing wikiId');

  try {
    return ok(await generateCardFromWiki(wikiId, mockAiClient));
  } catch {
    return serverError();
  }
}
```

Create `src/app/api/cards/publish/route.ts`:

```ts
import { badRequest, ok, serverError } from '@/lib/http';
import { publishCard } from '@/services/card-service';

export async function POST(request: Request) {
  const { cardId } = await request.json();
  if (!cardId) return badRequest('Missing cardId');

  try {
    return ok(await publishCard(cardId));
  } catch {
    return serverError();
  }
}
```

Create `src/app/api/profiles/[slug]/route.ts`:

```ts
import { notFound, ok } from '@/lib/http';
import { getPublicProfile } from '@/services/card-service';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const profile = await getPublicProfile(slug);

  if (!profile) return notFound('Profile not found');
  return ok(profile);
}
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run test -- tests/services/wiki-card-flow.test.ts
npm run typecheck
```

Expected:

```text
1 test passes
TypeScript exits 0
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/slug.ts src/services/wiki-service.ts src/services/card-service.ts src/app/api/wiki src/app/api/cards src/app/api/profiles tests/services/wiki-card-flow.test.ts
git commit -m "feat: generate wiki and public card"
```

---

## Task 7: Search, Recommendation, And Connections

**Files:**
- Create: `src/services/search-service.ts`
- Create: `src/services/recommendation-service.ts`
- Create: `src/services/connection-service.ts`
- Create: `src/app/api/search/route.ts`
- Create: `src/app/api/recommendations/route.ts`
- Create: `src/app/api/connections/route.ts`
- Test: `tests/services/search-recommendation.test.ts`
- Test: `tests/services/connection-service.test.ts`

- [ ] **Step 1: Write search and recommendation tests**

Create `tests/services/search-recommendation.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { searchProfiles } from '@/services/search-service';
import { recommendProfiles } from '@/services/recommendation-service';

describe('search and recommendation', () => {
  beforeEach(async () => {
    await prisma.agentProfile.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('searches published profiles by tags and bio', async () => {
    const a = await createAgent({ displayName: 'Jun' });
    await prisma.agentProfile.create({
      data: {
        userId: a.user.id,
        agentId: a.agent.id,
        slug: 'jun-ai',
        status: 'published',
        headline: 'AI 产品 Builder',
        bio: '关注 AI 社交和推荐系统',
        tagsJson: JSON.stringify(['AI 社交', '推荐系统'])
      }
    });

    const results = await searchProfiles('推荐系统');

    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('jun-ai');
  });

  it('recommends other published profiles and excludes current user', async () => {
    const current = await createAgent({ displayName: 'Jun' });
    const target = await createAgent({ displayName: 'Lin' });

    await prisma.agentProfile.create({
      data: {
        userId: target.user.id,
        agentId: target.agent.id,
        slug: 'lin-ai-engineer',
        status: 'published',
        headline: 'AI Engineer',
        bio: '擅长模型接入和后端工程化',
        skillsJson: JSON.stringify(['AI 工程化', '后端']),
        offersJson: JSON.stringify(['模型接入']),
        wantsJson: JSON.stringify(['产品合作'])
      }
    });

    const results = await recommendProfiles(current.user.id, ['AI 工程化']);

    expect(results[0].profile.slug).toBe('lin-ai-engineer');
    expect(results[0].reason).toContain('AI 工程化');
  });
});
```

- [ ] **Step 2: Implement search and recommendation services**

Create `src/services/search-service.ts`:

```ts
import { prisma } from '@/lib/db';

export async function searchProfiles(query: string) {
  const normalized = query.trim();
  if (!normalized) return [];

  return prisma.agentProfile.findMany({
    where: {
      status: 'published',
      OR: [
        { headline: { contains: normalized } },
        { bio: { contains: normalized } },
        { tagsJson: { contains: normalized } },
        { skillsJson: { contains: normalized } },
        { offersJson: { contains: normalized } },
        { wantsJson: { contains: normalized } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: 20
  });
}
```

Create `src/services/recommendation-service.ts`:

```ts
import { prisma } from '@/lib/db';

function parseList(value: string) {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

export async function recommendProfiles(userId: string, interests: string[]) {
  const profiles = await prisma.agentProfile.findMany({
    where: {
      status: 'published',
      userId: { not: userId }
    },
    take: 50
  });

  return profiles
    .map((profile) => {
      const fields = [
        ...parseList(profile.tagsJson),
        ...parseList(profile.skillsJson),
        ...parseList(profile.offersJson),
        ...parseList(profile.wantsJson),
        profile.headline,
        profile.bio
      ];
      const score = interests.reduce((sum, interest) => sum + (fields.some((field) => field.includes(interest)) ? 20 : 0), 0);
      return {
        profile,
        score,
        reason: score > 0 ? `你的数字分身显示你关注 ${interests.join('、')}，对方资料中有相关能力或需求。` : '对方资料完整，适合进一步了解。'
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
```

- [ ] **Step 3: Write connection test**

Create `tests/services/connection-service.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { createConnectionRequest } from '@/services/connection-service';

describe('connection-service', () => {
  beforeEach(async () => {
    await prisma.connectionRequest.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a pending connection request', async () => {
    const from = await createAgent({ displayName: 'Jun' });
    const to = await createAgent({ displayName: 'Lin' });

    const request = await createConnectionRequest({
      fromUserId: from.user.id,
      toUserId: to.user.id,
      source: 'recommendation',
      message: '想聊聊 AI 工程化。'
    });

    expect(request.status).toBe('pending');
    expect(request.message).toBe('想聊聊 AI 工程化。');
  });
});
```

- [ ] **Step 4: Implement connection service and routes**

Create `src/services/connection-service.ts`:

```ts
import { prisma } from '@/lib/db';

export async function createConnectionRequest(input: {
  fromUserId: string;
  toUserId: string;
  source: 'profile_scan' | 'search' | 'recommendation' | 'shared_link';
  message?: string;
}) {
  if (input.fromUserId === input.toUserId) {
    throw new Error('Cannot connect to yourself');
  }

  return prisma.connectionRequest.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      source: input.source,
      message: input.message,
      status: 'pending'
    }
  });
}

export async function listConnections(userId: string) {
  return prisma.connectionRequest.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }]
    },
    orderBy: { createdAt: 'desc' }
  });
}
```

Create `src/app/api/search/route.ts`:

```ts
import { badRequest, ok } from '@/lib/http';
import { searchProfiles } from '@/services/search-service';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q');
  if (!query) return badRequest('Missing q');
  return ok(await searchProfiles(query));
}
```

Create `src/app/api/recommendations/route.ts`:

```ts
import { badRequest, ok } from '@/lib/http';
import { recommendProfiles } from '@/services/recommendation-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const interests = url.searchParams.getAll('interest');

  if (!userId) return badRequest('Missing userId');
  return ok(await recommendProfiles(userId, interests));
}
```

Create `src/app/api/connections/route.ts`:

```ts
import { badRequest, ok, serverError } from '@/lib/http';
import { createConnectionRequest, listConnections } from '@/services/connection-service';

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return badRequest('Missing userId');
  return ok(await listConnections(userId));
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.fromUserId || !body.toUserId || !body.source) {
    return badRequest('Missing fromUserId, toUserId, or source');
  }

  try {
    return ok(await createConnectionRequest(body));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Connection failed');
  }
}
```

- [ ] **Step 5: Run verification**

Run:

```bash
npm run test -- tests/services/search-recommendation.test.ts tests/services/connection-service.test.ts
npm run typecheck
```

Expected:

```text
3 tests pass
TypeScript exits 0
```

- [ ] **Step 6: Commit**

```bash
git add src/services/search-service.ts src/services/recommendation-service.ts src/services/connection-service.ts src/app/api/search src/app/api/recommendations src/app/api/connections tests/services/search-recommendation.test.ts tests/services/connection-service.test.ts
git commit -m "feat: add discovery and connections backend"
```

---

## Task 8: End-To-End Backend Flow Verification

**Files:**
- Create: `tests/api/agent-growth-flow.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add integration test for full backend flow**

Create `tests/api/agent-growth-flow.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument } from '@/services/source-service';
import { extractKnowledgeFromSource, confirmFact } from '@/services/knowledge-service';
import { generateWiki } from '@/services/wiki-service';
import { generateCardFromWiki, publishCard } from '@/services/card-service';
import { searchProfiles } from '@/services/search-service';
import { recommendProfiles } from '@/services/recommendation-service';
import { createConnectionRequest } from '@/services/connection-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('agent growth backend flow', () => {
  beforeEach(async () => {
    await prisma.recommendationCandidate.deleteMany();
    await prisma.connectionRequest.deleteMany();
    await prisma.cardVisit.deleteMany();
    await prisma.agentProfile.deleteMany();
    await prisma.profileWiki.deleteMany();
    await prisma.profileProject.deleteMany();
    await prisma.profileFact.deleteMany();
    await prisma.sourceDocument.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates agent, adds memory, confirms AI extraction, publishes card, discovers and connects', async () => {
    const jun = await createAgent({ displayName: 'Jun' });
    const lin = await createAgent({ displayName: 'Lin' });

    const source = await addSourceDocument({ userId: jun.user.id, agentId: jun.agent.id, ...manualGrowthInput });
    const extracted = await extractKnowledgeFromSource(source.id, mockAiClient);
    await confirmFact(extracted.facts[0].id);
    const wiki = await generateWiki(jun.agent.id, mockAiClient);
    const card = await generateCardFromWiki(wiki.id, mockAiClient);
    const published = await publishCard(card.id);

    await prisma.agentProfile.create({
      data: {
        userId: lin.user.id,
        agentId: lin.agent.id,
        slug: 'lin-ai-engineer',
        status: 'published',
        headline: 'AI Engineer',
        bio: '擅长 AI 工程化和模型接入',
        skillsJson: JSON.stringify(['AI 工程化'])
      }
    });

    const searchResults = await searchProfiles('AI 社交');
    const recommendations = await recommendProfiles(jun.user.id, ['AI 工程化']);
    const connection = await createConnectionRequest({
      fromUserId: jun.user.id,
      toUserId: lin.user.id,
      source: 'recommendation',
      message: '想聊聊 AI 工程化。'
    });

    expect(published.status).toBe('published');
    expect(searchResults.some((profile) => profile.slug === published.slug)).toBe(true);
    expect(recommendations[0].profile.slug).toBe('lin-ai-engineer');
    expect(connection.status).toBe('pending');
  });
});
```

- [ ] **Step 2: Run full backend verification**

Run:

```bash
npm run test
npm run typecheck
npm run build
```

Expected:

```text
All test files pass
TypeScript exits 0
Next build exits 0
```

- [ ] **Step 3: Manual API smoke test**

Run app:

```bash
npm run dev
```

In another terminal, run:

```bash
curl -s http://localhost:3000/api/health
```

Expected JSON:

```json
{"ok":true,"data":{"status":"healthy","service":"livelink-api"}}
```

Create a digital self:

```bash
curl -s -X POST http://localhost:3000/api/agents \
  -H 'content-type: application/json' \
  -d '{"displayName":"Jun","role":"AI Product Builder","city":"Shanghai"}'
```

Expected:

```text
Response has ok:true, data.user.id, data.agent.id, and data.agent.name = "Jun 的数字分身"
```

- [ ] **Step 4: Commit**

```bash
git add tests/api/agent-growth-flow.test.ts package.json
git commit -m "test: verify backend agent growth flow"
```

---

## Backend Verification Plan

Run verification in this order during development:

1. **Unit test after every service task**
   - Command: `npm run test -- tests/services/<file>.test.ts`
   - Required result: target test file passes.

2. **Typecheck after every API route task**
   - Command: `npm run typecheck`
   - Required result: exits 0.

3. **Migration verification after schema changes**
   - Command: `npm run db:generate && npm run db:migrate -- --name <name>`
   - Required result: Prisma client generated and migration applied.

4. **Full backend test before handoff**
   - Command: `npm run test`
   - Required result: all tests pass.

5. **Build verification before claiming completion**
   - Command: `npm run build`
   - Required result: Next build exits 0.

6. **Manual API smoke verification**
   - Start: `npm run dev`
   - Health: `curl -s http://localhost:3000/api/health`
   - Create agent: `curl -s -X POST http://localhost:3000/api/agents -H 'content-type: application/json' -d '{"displayName":"Jun"}'`
   - Required result: both return `ok:true`.

7. **Regression rule**
   - If a bug appears in source ingestion, extraction, confirmation, card generation, search, recommendation, or connection creation, add a failing test first in the closest `tests/services/*.test.ts` file, confirm it fails, then implement the fix.

---

## Scope Deferred From First Backend Build

These are intentionally not in the first backend implementation:

- OAuth or real login.
- Production file storage for resumes.
- OCR for image resumes.
- Real xiaohongshu scraping.
- Vector search.
- Agent-to-agent autonomous negotiation.
- Payment or commercial analytics.
- Admin dashboard.

---

## Self-Review

**Spec coverage:**
- Create digital self: Task 3.
- My agent state: Task 3.
- Continuous growth source input: Task 4.
- AI draft extraction: Task 5.
- User confirmation before memory write: Task 5.
- Wiki generation: Task 6.
- Public card snapshot: Task 6.
- Search/recommend/discover: Task 7.
- Connections: Task 7.
- Full validation: Task 8.

**Placeholder scan:**
- No `TBD`, `TODO`, or unowned “implement later” steps.
- Deferred scope is explicit and not required for first backend build.

**Type consistency:**
- `Agent`, `SourceDocument`, `ProfileFact`, `ProfileProject`, `ProfileWiki`, `AgentProfile`, and `ConnectionRequest` names match Prisma model names and service usage.
- `sourceKind`, `sourceType`, `status`, and `templateKey` are represented as strings in Prisma for SQLite simplicity and constrained in TypeScript where needed.
