import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent, getMyAgentState } from '@/services/agent-service';

describe('agent-service', () => {
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

  it('creates a user and digital self from a display name', async () => {
    const result = await createAgent({ displayName: 'Jun' });

    expect(result.user.displayName).toBe('Jun');
    expect(result.agent.name).toBe('Jun 的数字分身');
    expect(result.agent.understandingScore).toBe(5);
  });

  it('creates user and agent inside a single transaction', async () => {
    await createAgent({ displayName: 'Jun' });

    await expect(prisma.user.count()).resolves.toBe(1);
    await expect(prisma.agent.count()).resolves.toBe(1);
  });

  it('returns my agent state with source and memory counts', async () => {
    const created = await createAgent({ displayName: 'Jun', role: 'AI Product Builder' });
    const state = await getMyAgentState(created.user.id);

    expect(state.agent.id).toBe(created.agent.id);
    expect(state.understandingScore).toBe(5);
    expect(state.counts).toEqual({ sources: 0, confirmedFacts: 0, projects: 0 });
    expect(state.currentCard).toBeNull();
  });
});
