import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { confirmAgentKnowledge, extractKnowledgeFromSource } from '@/services/knowledge-service';
import { addSourceDocument } from '@/services/source-service';
import { generatePublishedCardFromKnowledge } from '@/services/card-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('fast card generation', () => {
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

  it('publishes an agent card from confirmed knowledge without generating wiki first', async () => {
    const aiClient = {
      ...mockAiClient,
      generateWiki: vi.fn(mockAiClient.generateWiki),
      generateCard: vi.fn(mockAiClient.generateCard)
    };
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput });

    await extractKnowledgeFromSource(source.id, aiClient);
    await confirmAgentKnowledge(agent.id);

    const card = await generatePublishedCardFromKnowledge(agent.id, aiClient);
    const updatedAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });
    const wikiCount = await prisma.profileWiki.count({ where: { agentId: agent.id } });

    expect(card.status).toBe('published');
    expect(card.headline).toBe('AI 社交名片产品 Builder');
    expect(updatedAgent.currentProfileId).toBe(card.id);
    expect(updatedAgent.currentWikiId).toBeNull();
    expect(wikiCount).toBe(0);
    expect(aiClient.generateWiki).not.toHaveBeenCalled();
    expect(aiClient.generateCard).toHaveBeenCalledTimes(1);
  });
});
