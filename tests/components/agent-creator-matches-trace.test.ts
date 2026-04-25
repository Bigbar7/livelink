import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('AgentCreator matches A-to-A trace', () => {
  it('shows an optional A-to-A process on the Top Matches screen', () => {
    expect(componentSource).toContain('A-to-A 搜索过程 · 模拟过程');
    expect(componentSource).toContain('不是实时真实 Agent 对话记录');
    expect(componentSource).toContain('matches-trace');
    expect(componentSource).toContain('用户可选查看');
  });

  it('styles the matches trace as a visible expandable module', () => {
    expect(styleSource).toContain('.matches-trace');
    expect(styleSource).toContain('.agent-trace');
  });
});
