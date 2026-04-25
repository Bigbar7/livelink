import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');

describe('AgentCreator navigation copy', () => {
  it('uses product navigation labels instead of generation copy after setup', () => {
    expect(componentSource).toContain('<span>进化</span>');
    expect(componentSource).toContain('<span>分身</span>');
    expect(componentSource).toContain('<span>发现</span>');
    expect(componentSource).not.toContain('<span>生成</span>');
    expect(componentSource).not.toContain('<span>我的分身</span>');
    expect(componentSource).not.toContain('<span>名片</span>');
    expect(componentSource).not.toContain('<span>找人</span>');
  });

  it('does not prefill the nickname before first generation', () => {
    expect(componentSource).toContain("useState('')");
    expect(componentSource).not.toContain("useState('Jun')");
  });

  it('keeps the home CTA focused and reveals resident agents as discovery', () => {
    expect(componentSource).toContain('scroll-cue');
    expect(componentSource).toContain('下面有人');
    expect(componentSource).toContain('已经入住的人');
    expect(componentSource).toContain('launch-transition');
    expect(componentSource).toContain('setTimeout(() => setStep');
  });
});
