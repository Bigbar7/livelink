import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const clientSource = readFileSync(join(process.cwd(), 'src/services/ai/openai-compatible-client.ts'), 'utf8');

describe('OpenAI compatible profile prompts', () => {
  it('instructs profile generation to leave unknown lists empty instead of inventing details', () => {
    expect(clientSource).toContain('信息不足');
    expect(clientSource).toContain('留空数组');
    expect(clientSource).toContain('不要补全');
    expect(clientSource).toContain('不要生成虚构百分比');
  });

  it('asks profile generation for dedicated personal analysis sections', () => {
    expect(clientSource).toContain('analysis');
    expect(clientSource).toContain('recentUpdates');
    expect(clientSource).toContain('careerHighlights');
    expect(clientSource).toContain('domainSignals');
    expect(clientSource).toContain('persona');
    expect(clientSource).toContain('confidence');
    expect(clientSource).toContain('个人分析页');
    expect(clientSource).toContain('每条 facts 元素必须包含 factType');
  });
});
