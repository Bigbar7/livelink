import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import type { AiClient } from '@/services/ai/ai-client';
import { evolveAgentProfile, generateAgentProfile } from '@/services/agent-generation-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

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
}

describe('agent evolution service', () => {
  beforeEach(clearDb);

  it('evolves an existing agent instead of creating a duplicate user or agent', async () => {
    const initial = await generateAgentProfile(
      {
        displayName: 'Jun',
        contact: 'wx_jun7',
        text: '我在做 AI 社交名片，想找 AI 工程化伙伴。'
      },
      mockAiClient
    );
    const generateProfileDraft = vi.fn<NonNullable<AiClient['generateProfileDraft']>>(async () => ({
      ...(await mockAiClient.extractKnowledge({ text: '我最近开始做硬件 AI 项目，想找供应链和嵌入式伙伴。' })),
      card: {
        ...(await mockAiClient.generateCard({ wikiMarkdown: 'evolved' })),
        headline: '硬件 AI 产品创始人',
        wants: ['供应链伙伴', '嵌入式工程师']
      }
    }));
    const aiClient: AiClient = { ...mockAiClient, generateProfileDraft };

    const evolved = await evolveAgentProfile(
      {
        userId: initial.user.id,
        agentId: initial.agent.id,
        text: '我最近开始做硬件 AI 项目，想找供应链和嵌入式伙伴。',
        conversation: [
          { role: 'assistant', content: '今天想更新哪部分？' },
          { role: 'user', content: '硬件 AI 项目和供应链需求。' }
        ]
      },
      aiClient
    );

    expect(evolved.user.id).toBe(initial.user.id);
    expect(evolved.agent.id).toBe(initial.agent.id);
    expect(evolved.profile.id).not.toBe(initial.profile.id);
    expect(evolved.profile.headline).toBe('硬件 AI 产品创始人');
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.agent.count()).toBe(1);
    expect(await prisma.sourceDocument.count({ where: { agentId: initial.agent.id, sourceKind: 'evolution' } })).toBe(1);
    expect(generateProfileDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '分身进化对话',
        text: expect.stringContaining('硬件 AI 项目')
      })
    );
  });
});
