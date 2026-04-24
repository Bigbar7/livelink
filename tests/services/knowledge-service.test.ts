import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { addSourceDocument } from '@/services/source-service';
import { confirmFact, extractKnowledgeFromSource } from '@/services/knowledge-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { manualGrowthInput } from '../fixtures/manual-input';

describe('knowledge-service', () => {
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

  it('extracts draft facts and projects from a source', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({
      userId: user.id,
      agentId: agent.id,
      ...manualGrowthInput
    });

    const result = await extractKnowledgeFromSource(source.id, mockAiClient);
    const updatedSource = await prisma.sourceDocument.findUniqueOrThrow({ where: { id: source.id } });

    expect(result.facts).toHaveLength(3);
    expect(result.projects).toHaveLength(1);
    expect(result.facts.every((fact) => fact.status === 'draft')).toBe(true);
    expect(result.projects[0]?.status).toBe('draft');
    expect(result.projects[0]?.name).toBe('Livelink');
    expect(updatedSource.extractionStatus).toBe('extracted');
  });

  it('confirms a fact and increases understanding score', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({
      userId: user.id,
      agentId: agent.id,
      ...manualGrowthInput
    });
    const result = await extractKnowledgeFromSource(source.id, mockAiClient);

    const confirmed = await confirmFact(result.facts[0].id);
    const updatedAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });

    expect(confirmed.status).toBe('confirmed');
    expect(updatedAgent.understandingScore).toBe(agent.understandingScore + 8);
  });

  it('does not duplicate facts and projects when extracting the same source twice', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({
      userId: user.id,
      agentId: agent.id,
      ...manualGrowthInput
    });

    const first = await extractKnowledgeFromSource(source.id, mockAiClient);
    const second = await extractKnowledgeFromSource(source.id, mockAiClient);

    expect(second.facts.map((fact) => fact.id)).toEqual(first.facts.map((fact) => fact.id));
    expect(second.projects.map((project) => project.id)).toEqual(first.projects.map((project) => project.id));
    await expect(prisma.profileFact.count()).resolves.toBe(3);
    await expect(prisma.profileProject.count()).resolves.toBe(1);
  });

  it('does not increase understanding score when confirming an already confirmed fact', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({
      userId: user.id,
      agentId: agent.id,
      ...manualGrowthInput
    });
    const result = await extractKnowledgeFromSource(source.id, mockAiClient);

    await confirmFact(result.facts[0].id);
    await confirmFact(result.facts[0].id);
    const updatedAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });

    expect(updatedAgent.understandingScore).toBe(agent.understandingScore + 8);
  });

  it('does not increase understanding score twice for concurrent confirms', async () => {
    const { user, agent } = await createAgent({ displayName: 'Jun' });
    const source = await addSourceDocument({
      userId: user.id,
      agentId: agent.id,
      ...manualGrowthInput
    });
    const result = await extractKnowledgeFromSource(source.id, mockAiClient);

    await Promise.all([confirmFact(result.facts[0].id), confirmFact(result.facts[0].id)]);
    const updatedAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });

    expect(updatedAgent.understandingScore).toBe(agent.understandingScore + 8);
  });
});
