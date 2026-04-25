import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import type { AiClient } from '@/services/ai/ai-client';
import { generateAgentProfile } from '@/services/agent-generation-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

describe('agent-generation-service', () => {
  beforeEach(async () => {
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
  });

  it('uses one combined AI call to extract knowledge and publish the card when supported', async () => {
    const generateProfileDraft = vi.fn<NonNullable<AiClient['generateProfileDraft']>>(async () => ({
      ...(await mockAiClient.extractKnowledge({ text: '我是 AI 产品经理，想找硬件工程师。' })),
      card: await mockAiClient.generateCard({ wikiMarkdown: 'combined' })
    }));
    const aiClient: AiClient = {
      ...mockAiClient,
      extractKnowledge: vi.fn(mockAiClient.extractKnowledge),
      generateCard: vi.fn(mockAiClient.generateCard),
      generateWiki: vi.fn(mockAiClient.generateWiki),
      generateProfileDraft
    };

    const result = await generateAgentProfile(
      {
        displayName: 'Jun',
        text: '我是 AI 产品经理，想找硬件工程师。'
      },
      aiClient
    );

    const factsCount = await prisma.profileFact.count({ where: { agentId: result.agent.id, status: 'confirmed' } });
    const projectsCount = await prisma.profileProject.count({ where: { agentId: result.agent.id, status: 'confirmed' } });

    expect(result.profile.status).toBe('published');
    expect(result.profile.headline).toBe('AI 社交名片产品 Builder');
    expect(factsCount).toBeGreaterThan(0);
    expect(projectsCount).toBeGreaterThan(0);
    expect(generateProfileDraft).toHaveBeenCalledTimes(1);
    expect(aiClient.extractKnowledge).not.toHaveBeenCalled();
    expect(aiClient.generateCard).not.toHaveBeenCalled();
    expect(aiClient.generateWiki).not.toHaveBeenCalled();
  });
});
