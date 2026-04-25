import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('AgentCreator waiting page', () => {
  it('shows a warm, transparent generation experience', () => {
    expect(componentSource).toContain('正在搭建');
    expect(componentSource).toContain('不是卡住了');
    expect(componentSource).toContain('预计 10-30 秒');
    expect(componentSource).toContain('你可以先想想第一位想认识的人');
    expect(componentSource).toContain('aria-live="polite"');
    expect(componentSource).toContain('generation-orbit');
    expect(componentSource).toContain('generation-step active');
  });

  it('includes animated waiting page styles', () => {
    expect(styleSource).toContain('.generation-hero');
    expect(styleSource).toContain('.generation-orbit');
    expect(styleSource).toContain('.generation-step.active');
    expect(styleSource).toContain('@keyframes orbit-spin');
    expect(styleSource).toContain('@keyframes progress-sweep');
  });
});
