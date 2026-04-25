import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagePath = join(process.cwd(), 'src/app/agent-intro-lab/page.tsx');

describe('Agent intro lab comparison page', () => {
  it('exists as a standalone route for comparing the A-to-A discovery and icebreaker flow', () => {
    expect(existsSync(pagePath)).toBe(true);

    const pageSource = readFileSync(pagePath, 'utf8');
    expect(pageSource).toContain('Agent Radar');
    expect(pageSource).toContain('Match Report');
    expect(pageSource).toContain('Intro Brief');
    expect(pageSource).toContain('双方 Agent 预对齐摘要');
    expect(pageSource).toContain('不修改现有发现页和破冰页');
  });

  it('shows an optional agent-to-agent search trace that users can inspect', () => {
    const pageSource = readFileSync(pagePath, 'utf8');
    expect(pageSource).toContain('A-to-A 搜索过程');
    expect(pageSource).toContain('<details className="agent-trace"');
    expect(pageSource).toContain('用户可选查看');
    expect(pageSource).toContain('我的 Agent');
    expect(pageSource).toContain('候选 Agent');
  });

  it('labels the A-to-A transcript as simulated prototype content instead of real agent messages', () => {
    const pageSource = readFileSync(pagePath, 'utf8');
    expect(pageSource).toContain('模拟过程');
    expect(pageSource).toContain('不是实时真实 Agent 对话记录');
    expect(pageSource).toContain('示例预对齐');
  });
});
