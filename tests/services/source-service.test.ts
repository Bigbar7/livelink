import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument, listAgentSources } from '@/services/source-service';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('source-service', () => {
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

  it('adds manual source to an agent', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });

    const source = await addSourceDocument({
      userId: user.id,
      agentId: agent.id,
      ...manualGrowthInput
    });

    expect(source.sourceKind).toBe('manual');
    expect(source.fetchStatus).toBe('manual');
    expect(source.extractionStatus).toBe('pending');
    expect(source.cleanedText).toBe(manualGrowthInput.rawText);
  });

  it('lists sources newest first', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput, title: 'first' });
    await addSourceDocument({ userId: user.id, agentId: agent.id, ...manualGrowthInput, title: 'second' });

    const sources = await listAgentSources(agent.id);

    expect(sources).toHaveLength(2);
    expect(sources[0]?.title).toBe('second');
  });

  it('rejects sources for an agent owned by another user', async () => {
    const owner = await createAgent({ displayName: 'Jun' });
    const other = await createAgent({ displayName: 'Lin' });

    await expect(
      addSourceDocument({
        userId: other.user.id,
        agentId: owner.agent.id,
        ...manualGrowthInput
      })
    ).rejects.toThrow('Agent not found for user');

    await expect(prisma.sourceDocument.count()).resolves.toBe(0);
  });
});
