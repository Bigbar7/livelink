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

  it('keeps public agent profile prompts privacy-minimized and insight-oriented', () => {
    expect(clientSource).toContain('隐私最小化');
    expect(clientSource).toContain('不要把简历原文或完整履历搬到公开展示字段');
    expect(clientSource).toContain('联系方式、手机号、邮箱、证件号、详细住址、生日');
    expect(clientSource).toContain('提取精炼');
    expect(clientSource).toContain('AI 洞察');
    expect(clientSource).toContain('代表性亮点');
  });

  it('asks public agent profile copy to be ultra concise and social-first for tech audiences', () => {
    expect(clientSource).toContain('极简');
    expect(clientSource).toContain('短词或短句');
    expect(clientSource).toContain('不要写成简历');
    expect(clientSource).toContain('不要出现具体项目内容');
    expect(clientSource).toContain('AI 爱好者、投资人、创业者、互联网或科技公司成员');
    expect(clientSource).toContain('愿意建立社交关系');
  });
});
