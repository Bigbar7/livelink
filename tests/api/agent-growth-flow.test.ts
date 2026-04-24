import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument } from '@/services/source-service';
import { confirmFact, extractKnowledgeFromSource } from '@/services/knowledge-service';
import { generateWiki } from '@/services/wiki-service';
import { generateCardFromWiki, publishCard } from '@/services/card-service';
import { searchProfiles } from '@/services/search-service';
import { recommendProfiles } from '@/services/recommendation-service';
import { createConnectionRequest } from '@/services/connection-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('agent growth backend flow', () => {
  beforeEach(async () => {
    await prisma.recommendationCandidate.deleteMany();
    await prisma.connectionRequest.deleteMany();
    await prisma.cardVisit.deleteMany();
    await prisma.agentProfile.deleteMany();
    await prisma.profileWiki.deleteMany();
    await prisma.profileProject.deleteMany();
    await prisma.profileFact.deleteMany();
    await prisma.sourceDocument.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates agent, adds memory, confirms AI extraction, publishes card, discovers and connects', async () => {
    const jun = await createAgent({ displayName: 'Jun' });
    const lin = await createAgent({ displayName: 'Lin' });

    const source = await addSourceDocument({ userId: jun.user.id, agentId: jun.agent.id, ...manualGrowthInput });
    const extracted = await extractKnowledgeFromSource(source.id, mockAiClient);
    await confirmFact(extracted.facts[0].id);
    await prisma.profileProject.update({
      where: { id: extracted.projects[0].id },
      data: { status: 'confirmed' }
    });
    const wiki = await generateWiki(jun.agent.id, mockAiClient);
    const card = await generateCardFromWiki(wiki.id, mockAiClient);
    const published = await publishCard(card.id);

    await prisma.agentProfile.create({
      data: {
        userId: lin.user.id,
        agentId: lin.agent.id,
        slug: 'lin-ai-engineer',
        status: 'published',
        headline: 'AI Engineer',
        bio: '擅长 AI 工程化和模型接入',
        skillsJson: JSON.stringify(['AI 工程化'])
      }
    });

    const searchResults = await searchProfiles('AI 社交');
    const recommendations = await recommendProfiles(jun.user.id, ['AI 工程化']);
    const connection = await createConnectionRequest({
      fromUserId: jun.user.id,
      toUserId: lin.user.id,
      source: 'recommendation',
      message: '想聊聊 AI 工程化。'
    });

    expect(published.status).toBe('published');
    expect(searchResults.some((profile) => profile.slug === published.slug)).toBe(true);
    expect(recommendations[0].profile.slug).toBe('lin-ai-engineer');
    expect(connection.status).toBe('pending');
  });
});
