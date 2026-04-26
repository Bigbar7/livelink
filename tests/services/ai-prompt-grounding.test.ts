import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openAiCompatibleClient } from '@/services/ai/openai-compatible-client';

const clientSource = readFileSync(join(process.cwd(), 'src/services/ai/openai-compatible-client.ts'), 'utf8');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

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

  it('makes first-time creation chat detect profile gaps and stop when ready', () => {
    expect(clientSource).toContain('filledSlots');
    expect(clientSource).toContain('missingSlots');
    expect(clientSource).toContain('draftProfile');
    expect(clientSource).toContain('nextBestQuestion');
    expect(clientSource).toContain('nextAction');
    expect(clientSource).toContain('最多问 1 个主问题');
    expect(clientSource).toContain('现在可以点击“生成我的分身”');
  });

  it('guides evolution chat to fill missing slots and stop looping once enough context exists', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };

      expect(body.messages[0]).toMatchObject({ role: 'system' });
      expect(body.messages[0]?.content).toContain('6 个资料槽位');
      expect(body.messages[0]?.content).toContain('最多问 1 个主问题');
      expect(body.messages[0]?.content).toContain('不要围绕同一个话题连续追问');
      expect(body.messages[0]?.content).toContain('必须收束并建议用户生成新版分身');
      expect(body.messages[1]?.content).toContain('当前可能缺失的信息：代表项目或经历、可提供资源、正在寻找的人');

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '现在可以基于这些变化生成新版分身，也可以再补一个代表项目。' } }]
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    });

    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_BASE_URL', 'https://example.test/v1');
    vi.stubEnv('AI_MODEL', 'test-model');
    vi.stubEnv('AI_WIRE_API', 'chat');
    vi.stubGlobal('fetch', fetchMock);

    const result = await openAiCompatibleClient.chatEvolution!({
      message: '还是硬件 AI 方向，最近在做样机。',
      conversation: [
        { role: 'assistant', content: '这个硬件 AI 项目现在到什么阶段了？' },
        { role: 'user', content: '还在样机阶段。' }
      ],
      currentProfile: {
        headline: 'AI 产品 Builder',
        bio: '关注 AI 社交名片。',
        tags: ['AI 社交'],
        skills: ['产品设计'],
        interests: ['价值社交'],
        offers: [],
        wants: []
      },
      user: { displayName: 'Jun' }
    });

    expect(result.content).toContain('生成新版分身');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
