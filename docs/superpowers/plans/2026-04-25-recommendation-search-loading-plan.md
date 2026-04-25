# Recommendation Search Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Agent-to-Agent recommendation search loading page while `/api/recommendations` is pending.

**Architecture:** The existing `AgentCreator` flow already uses a `FlowStep` state machine. Add a new `searching` step between `find` and `matches`, render a recommendation-specific full-screen loader, and route success/error transitions through the existing `findPeople` function.

**Tech Stack:** Next.js App Router, React client component state, plain CSS in `src/app/globals.css`, Vitest source-level component tests.

---

## File Structure

- Modify `src/components/agent-creator.tsx`: extend `FlowStep`, update `findPeople`, render the new search loading screen.
- Modify `src/app/globals.css`: add loading screen styles and keyframes using the existing dark generation visual language.
- Create `tests/components/agent-creator-recommendation-loading.test.ts`: assert the flow step, transition, loading copy, accessibility, and CSS hooks.

### Task 1: Add Recommendation Search Loading Tests

**Files:**
- Create: `tests/components/agent-creator-recommendation-loading.test.ts`

- [ ] **Step 1: Write the failing component source test**

Create `tests/components/agent-creator-recommendation-loading.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('AgentCreator recommendation search loading page', () => {
  it('adds a dedicated searching step before showing recommendation matches', () => {
    expect(componentSource).toContain("'searching'");
    expect(componentSource).toContain("setStep('searching');");
    expect(componentSource.indexOf("setStep('searching');")).toBeLessThan(
      componentSource.indexOf("readApi<RecommendationItem[]>(`/api/recommendations?")
    );
    expect(componentSource).toContain("setStep('matches');");
    expect(componentSource).toContain("setStep('find');");
  });

  it('renders an Agent-to-Agent recommendation search loading experience', () => {
    expect(componentSource).toContain("step === 'searching'");
    expect(componentSource).toContain('aria-live="polite"');
    expect(componentSource).toContain('Searching Agents');
    expect(componentSource).toContain('正在搜寻');
    expect(componentSource).toContain('高匹配推荐');
    expect(componentSource).toContain('正在让你的 Agent 访问候选分身');
    expect(componentSource).toContain('拆解需求');
    expect(componentSource).toContain('探测候选 Agent');
    expect(componentSource).toContain('生成推荐理由');
  });

  it('includes animated styles for the recommendation search loader', () => {
    expect(styleSource).toContain('.recommendation-search-screen');
    expect(styleSource).toContain('.search-orbit');
    expect(styleSource).toContain('.search-step.active');
    expect(styleSource).toContain('@keyframes search-orbit-spin');
    expect(styleSource).toContain('@keyframes search-node-pulse');
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm test -- tests/components/agent-creator-recommendation-loading.test.ts
```

Expected: FAIL because the test file exists but `AgentCreator` does not yet contain `searching`, the recommendation loading copy, or the new CSS classes.

### Task 2: Add the Searching Flow Step and Screen

**Files:**
- Modify: `src/components/agent-creator.tsx`

- [ ] **Step 1: Extend the flow step type**

Change the `FlowStep` type near the top of `src/components/agent-creator.tsx` from:

```ts
type FlowStep = 'home' | 'input' | 'generating' | 'card' | 'share' | 'find' | 'matches' | 'candidate' | 'icebreaker';
```

to:

```ts
type FlowStep = 'home' | 'input' | 'generating' | 'card' | 'share' | 'find' | 'searching' | 'matches' | 'candidate' | 'icebreaker';
```

- [ ] **Step 2: Move to searching before the recommendation request**

In `findPeople`, change:

```ts
    try {
      const data = await readApi<RecommendationItem[]>(`/api/recommendations?${search.toString()}`);
      const candidates = data.map(profileToCandidate);
      setRecommendations(candidates);
      if (candidates[0]) setSelectedCandidate(candidates[0]);
      setStep('matches');
    } catch (recommendationError) {
      setError(recommendationError instanceof Error ? recommendationError.message : '推荐失败');
    }
```

to:

```ts
    setStep('searching');

    try {
      const data = await readApi<RecommendationItem[]>(`/api/recommendations?${search.toString()}`);
      const candidates = data.map(profileToCandidate);
      setRecommendations(candidates);
      if (candidates[0]) setSelectedCandidate(candidates[0]);
      setStep('matches');
    } catch (recommendationError) {
      setError(recommendationError instanceof Error ? recommendationError.message : '推荐失败');
      setStep('find');
    }
```

- [ ] **Step 3: Render the new loading page**

Insert this block between the existing `find` screen and `matches` screen:

```tsx
          {step === 'searching' && (
            <section className="recommendation-search-screen" aria-live="polite">
              <Header title="Searching Agents" action="◎" />
              <div className="content recommendation-search-content">
                <div className="search-hero">
                  <div className="search-orbit" aria-hidden="true">
                    <span>{firstLetter(nickname)}</span>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <p className="search-kicker">正在让你的 Agent 访问候选分身</p>
                  <h2 className="page-title">
                    正在搜寻
                    <br />
                    <mark>高匹配推荐</mark>
                  </h2>
                  <p className="muted light">
                    Agent 正在拆解你的需求，读取已发布名片，并整理最适合开场的连接理由。
                  </p>
                </div>
                <div className="search-progress" aria-hidden="true">
                  <span />
                </div>
                <div className="search-steps">
                  <div className="search-step active">
                    <b>01 拆解需求</b>
                    <span>识别你想认识的人、可交换价值和这次搜索的约束条件</span>
                  </div>
                  <div className="search-step">
                    <b>02 探测候选 Agent</b>
                    <span>按标签、需求、能力和公开资料筛选候选分身</span>
                  </div>
                  <div className="search-step">
                    <b>03 生成推荐理由</b>
                    <span>整理匹配分、推荐原因和适合第一句开启的话题</span>
                  </div>
                </div>
              </div>
              <div className="toast search-tip">A-to-A 搜索会先看互补价值，再把值得认识的人放进推荐列表。</div>
            </section>
          )}
```

- [ ] **Step 4: Run the test and confirm only CSS assertions still fail**

Run:

```bash
npm test -- tests/components/agent-creator-recommendation-loading.test.ts
```

Expected: FAIL only on missing style strings such as `.recommendation-search-screen` and `@keyframes search-orbit-spin`.

### Task 3: Add Loader Styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add recommendation search loading CSS**

Add this CSS near the existing `.generation-*` loading styles:

```css
.recommendation-search-screen {
  min-height: 100%;
  background:
    radial-gradient(circle at 18% 16%, rgb(167 201 255 / 18%), transparent 150px),
    radial-gradient(circle at 86% 38%, rgb(217 255 85 / 14%), transparent 150px),
    var(--ink);
  color: #fff8e7;
}

.recommendation-search-content {
  padding-bottom: 96px;
}

.search-hero {
  position: relative;
  overflow: hidden;
  margin-top: 8px;
  padding: 16px;
  border: 2px solid rgb(255 248 231 / 22%);
  border-radius: 30px;
  background: linear-gradient(145deg, rgb(255 250 240 / 12%), rgb(255 250 240 / 4%));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 18%), 0 18px 50px rgb(0 0 0 / 22%);
}

.search-orbit {
  position: relative;
  width: 132px;
  height: 132px;
  display: grid;
  place-items: center;
  margin: 4px auto 18px;
  border: 2px dashed rgb(255 248 231 / 35%);
  border-radius: 50%;
  animation: search-orbit-spin 7s linear infinite;
}

.search-orbit span {
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  border: 3px solid var(--line);
  border-radius: 24px;
  background: var(--blue);
  color: var(--ink);
  box-shadow: 6px 6px 0 rgb(0 0 0 / 65%);
  font-family: "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: 28px;
  font-weight: 1000;
  animation: search-orbit-counter-spin 7s linear infinite;
}

.search-orbit i {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid var(--line);
  border-radius: 50%;
  background: var(--lime);
  animation: search-node-pulse 1.6s ease-in-out infinite;
}

.search-orbit i:nth-of-type(1) {
  top: 8px;
  left: 28px;
}

.search-orbit i:nth-of-type(2) {
  right: 6px;
  top: 58px;
  background: var(--peach);
  animation-delay: .2s;
}

.search-orbit i:nth-of-type(3) {
  left: 36px;
  bottom: 4px;
  background: var(--mint);
  animation-delay: .4s;
}

.search-orbit i:nth-of-type(4) {
  right: 34px;
  bottom: 14px;
  background: var(--violet);
  animation-delay: .6s;
}

.search-kicker {
  width: fit-content;
  margin: 0 0 10px;
  padding: 7px 10px;
  border: 2px solid rgb(255 248 231 / 26%);
  border-radius: 999px;
  background: rgb(217 255 85 / 14%);
  color: var(--lime);
  font-family: "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: 11px;
  font-weight: 1000;
}

.search-progress {
  overflow: hidden;
  height: 12px;
  margin: 18px 2px 16px;
  border: 2px solid rgb(255 248 231 / 22%);
  border-radius: 999px;
  background: rgb(255 248 231 / 10%);
}

.search-progress span {
  display: block;
  width: 44%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--blue), var(--lime), var(--peach));
  box-shadow: 0 0 18px rgb(167 201 255 / 42%);
  animation: progress-sweep 2.2s ease-in-out infinite;
}

.search-steps {
  display: grid;
  gap: 10px;
  font-family: "PingFang SC", "Hiragino Sans GB", sans-serif;
}

.search-step {
  position: relative;
  padding: 13px 14px 13px 46px;
  border: 2px solid rgb(255 248 231 / 16%);
  border-radius: 20px;
  background: rgb(255 250 240 / 8%);
  color: #fff8e7;
}

.search-step::before {
  content: "";
  position: absolute;
  top: 16px;
  left: 16px;
  width: 14px;
  height: 14px;
  border: 2px solid rgb(255 248 231 / 35%);
  border-radius: 50%;
  background: rgb(255 248 231 / 12%);
}

.search-step.active {
  border-color: rgb(167 201 255 / 78%);
  background: rgb(167 201 255 / 12%);
}

.search-step.active::before {
  border-color: var(--line);
  background: var(--blue);
  box-shadow: 0 0 0 6px rgb(167 201 255 / 16%);
  animation: pulse 1.35s ease-in-out infinite;
}

.search-step b,
.search-step span {
  display: block;
}

.search-step b {
  margin-bottom: 5px;
  font-size: 13px;
}

.search-step span {
  color: #d8ceb6;
  font-size: 11px;
  line-height: 1.45;
}

.search-tip {
  background: #eaf4ff;
}

@keyframes search-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes search-orbit-counter-spin {
  to {
    transform: rotate(-360deg);
  }
}

@keyframes search-node-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.28);
  }
}
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm test -- tests/components/agent-creator-recommendation-loading.test.ts
```

Expected: PASS.

### Task 4: Regression Verification

**Files:**
- Test only

- [ ] **Step 1: Run related component tests**

Run:

```bash
npm test -- tests/components/agent-creator-recommendation-loading.test.ts tests/components/agent-creator-find-prompts.test.ts tests/components/agent-creator-matches-trace.test.ts tests/components/agent-creator-navigation.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git diff -- src/components/agent-creator.tsx src/app/globals.css tests/components/agent-creator-recommendation-loading.test.ts
```

Expected: Diff only contains the recommendation loading page, its styles, and its focused test.
