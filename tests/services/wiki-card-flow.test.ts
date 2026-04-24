import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument } from '@/services/source-service';
import { confirmFact, extractKnowledgeFromSource } from '@/services/knowledge-service';
import { generateWiki } from '@/services/wiki-service';
import { generateCardFromWiki, getPublicProfile, publishCard } from '@/services/card-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('wiki and card flow', () => {
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

  it('generates wiki, card draft, and published public profile', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput });
    const extracted = await extractKnowledgeFromSource(source.id, mockAiClient);
    await confirmFact(extracted.facts[0].id);

    const wiki = await generateWiki(agent.id, mockAiClient);
    const card = await generateCardFromWiki(wiki.id, mockAiClient);
    const published = await publishCard(card.id);
    const publicProfile = await getPublicProfile(published.slug);
    const updatedAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });

    expect(wiki.status).toBe('generated');
    expect(wiki.version).toBe(1);
    expect(updatedAgent.currentWikiId).toBe(wiki.id);
    expect(card.status).toBe('ai_generated');
    expect(published.status).toBe('published');
    expect(updatedAgent.currentProfileId).toBe(published.id);
    expect(publicProfile?.headline).toBe('AI 社交名片产品 Builder');
  });

  it('only exposes published profiles publicly', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput });
    const extracted = await extractKnowledgeFromSource(source.id, mockAiClient);
    await confirmFact(extracted.facts[0].id);

    const wiki = await generateWiki(agent.id, mockAiClient);
    const draftCard = await generateCardFromWiki(wiki.id, mockAiClient);

    await expect(getPublicProfile(draftCard.slug)).resolves.toBeNull();
  });

  it('generates wiki from confirmed knowledge only', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput });
    const extracted = await extractKnowledgeFromSource(source.id, mockAiClient);
    await confirmFact(extracted.facts[0].id);
    await prisma.profileProject.update({
      where: { id: extracted.projects[0].id },
      data: { status: 'confirmed' }
    });
    await prisma.profileProject.create({
      data: {
        userId: user.id,
        agentId: agent.id,
        name: 'Draft Only',
        summary: '这还是未确认项目',
        status: 'draft'
      }
    });

    const wiki = await generateWiki(agent.id, mockAiClient);

    expect(wiki.markdown).toContain('Livelink');
    expect(wiki.markdown).not.toContain('Draft Only');
  });
});
