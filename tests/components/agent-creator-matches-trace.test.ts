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

  it('shows when a connection has been recorded before external sending', () => {
    expect(componentSource).toContain('recordedConnectionIds');
    expect(componentSource).toContain('connectionFeedback');
    expect(componentSource).toContain('已记录连接，文案已复制');
    expect(componentSource).toContain('已经记录连接请求');
    expect(componentSource).toContain('disabled={isSelectedConnectionRecorded}');
  });

  it('styles recorded connection feedback as part of the icebreaker flow', () => {
    expect(styleSource).toContain('.connection-feedback');
    expect(styleSource).toContain('.connection-status-pill');
  });
});
