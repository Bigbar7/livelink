import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('AgentCreator recommendation search loading page', () => {
  it('adds a dedicated searching step before returning to the discovery results', () => {
    expect(componentSource).toContain("'searching'");
    expect(componentSource).toContain("setStep('searching');");
    expect(componentSource.indexOf("setStep('searching');")).toBeLessThan(
      componentSource.indexOf("readApi<RecommendationItem[]>(`/api/recommendations?")
    );
    expect(componentSource).toContain("setStep('find');");
  });

  it('searches from the needs shown on the agent profile page', () => {
    expect(componentSource).toContain('const activeFindQuery = nextFindQuery ?? findQuery;');
    expect(componentSource).toContain('const discoveryInterests = [...profileNeeds, ...activeFindQuery.split');
    expect(componentSource).toContain('const interests = Array.from(new Set(discoveryInterests)).slice(0, 8);');
  });

  it('uses the discovery page as the default resident profile directory', () => {
    expect(componentSource).toContain('const discoveryCandidates = useMemo');
    expect(componentSource).toContain('residentProfiles.map(profileToResidentCandidate)');
    expect(componentSource).toContain("const discoveryList = recommendations.length > 0 ? recommendations : discoveryCandidates;");
    expect(componentSource).toContain('已经入驻的人');
    expect(componentSource).toContain('按需求搜索');
  });

  it('keeps recommendation search results on the discovery page with a resident fallback', () => {
    expect(componentSource).toContain('setDiscoveryMode');
    expect(componentSource).toContain("setDiscoveryMode(candidates.length > 0 ? 'search' : 'fallback');");
    expect(componentSource).toContain('没有精确匹配，先看看这些已入驻的人');
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
