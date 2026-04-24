import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { createConnectionRequest, listConnections } from '@/services/connection-service';

describe('connection-service', () => {
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

  it('creates a pending connection request', async () => {
    const from = await createAgent({ displayName: 'Jun' });
    const to = await createAgent({ displayName: 'Lin' });

    const request = await createConnectionRequest({
      fromUserId: from.user.id,
      toUserId: to.user.id,
      source: 'recommendation',
      message: '想聊聊 AI 工程化。'
    });

    expect(request.status).toBe('pending');
    expect(request.message).toBe('想聊聊 AI 工程化。');
  });

  it('lists sent and received connection requests for a user', async () => {
    const from = await createAgent({ displayName: 'Jun' });
    const to = await createAgent({ displayName: 'Lin' });

    const request = await createConnectionRequest({
      fromUserId: from.user.id,
      toUserId: to.user.id,
      source: 'search'
    });

    const connections = await listConnections(to.user.id);

    expect(connections.map((connection) => connection.id)).toContain(request.id);
  });

  it('rejects connecting to yourself', async () => {
    const account = await createAgent({ displayName: 'Jun' });

    await expect(
      createConnectionRequest({
        fromUserId: account.user.id,
        toUserId: account.user.id,
        source: 'profile_scan'
      })
    ).rejects.toThrow('Cannot connect to yourself');
  });
});
