import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { POST } from '@/app/api/agents/evolution-chat/route';
import { generateAgentProfile } from '@/services/agent-generation-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

const { defaultAiClientMock, chatEvolution } = vi.hoisted(() => {
  const chatEvolution = vi.fn(async () => ({
    role: 'assistant' as const,
    content: '听起来你正在从 AI 社交名片转向硬件 AI。这个变化里最值得沉淀的是项目阶段、你负责的部分和正在寻找的伙伴。'
  }));

  return {
    chatEvolution,
    defaultAiClientMock: {
      async extractKnowledge(input: { text: string }) {
        return {
          facts: [
            {
              factType: 'identity',
              title: 'AI 产品 Builder',
              summary: '关注 AI 社交名片、推荐系统和关系沉淀',
              evidenceText: input.text.slice(0, 120),
              confidence: 0.82
            }
          ],
          projects: []
        };
      },
      async generateWiki() {
        return { contentJson: {}, markdown: '# Wiki' };
      },
      async generateCard() {
        return {
          headline: 'AI 社交名片产品 Builder',
          bio: '关注 AI 如何帮助人更高效地展示价值、发现连接和沉淀关系。',
          tags: ['AI 社交'],
          skills: ['产品闭环'],
          interests: ['主动社交'],
          offers: ['产品设计'],
          wants: ['AI 工程化伙伴'],
          icebreakers: ['AI 如何提升社交匹配效率']
        };
      },
      chatEvolution
    }
  };
});

vi.mock('@/services/ai/default-ai-client', () => ({
  defaultAiClient: defaultAiClientMock
}));

async function clearDb() {
  await prisma.cardVisit.deleteMany();
  await prisma.recommendationCandidate.deleteMany();
  await prisma.connectionRequest.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.profileWiki.deleteMany();
  await prisma.profileProject.deleteMany();
  await prisma.profileFact.deleteMany();
  await prisma.sourceDocument.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();
  chatEvolution.mockClear();
}

describe('POST /api/agents/evolution-chat', () => {
  beforeEach(clearDb);

  it('returns 400 when identifiers are missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/agents/evolution-chat', {
        method: 'POST',
        body: JSON.stringify({ message: '我最近在做硬件 AI' })
      })
    );

    expect(response.status).toBe(400);
  });

  it('asks the real AI client to reply with current profile context', async () => {
    const initial = await generateAgentProfile({ displayName: 'Jun', contact: 'wx_jun7', text: '我在做 AI 社交名片。' }, mockAiClient);
    const response = await POST(
      new Request('http://localhost/api/agents/evolution-chat', {
        method: 'POST',
        body: JSON.stringify({
          userId: initial.user.id,
          agentId: initial.agent.id,
          message: '我最近开始做硬件 AI 项目，想找供应链伙伴。',
          conversation: [{ role: 'assistant', content: '今天想更新哪部分？' }]
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.content).toContain('硬件 AI');
    expect(chatEvolution).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '我最近开始做硬件 AI 项目，想找供应链伙伴。',
        currentProfile: expect.objectContaining({
          headline: initial.profile.headline,
          bio: initial.profile.bio
        }),
        conversation: [{ role: 'assistant', content: '今天想更新哪部分？' }]
      })
    );
    expect(await prisma.sourceDocument.count({ where: { agentId: initial.agent.id, sourceKind: 'evolution' } })).toBe(0);
  });
});
