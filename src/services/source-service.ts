import { prisma } from '@/lib/db';
import type { SourceKind } from '@/types/domain';

export async function addSourceDocument(input: {
  userId: string;
  agentId: string;
  sourceKind: SourceKind;
  sourceType: string;
  url?: string;
  title?: string;
  rawText?: string;
  userNote?: string;
}) {
  const agent = await prisma.agent.findUnique({
    where: { id: input.agentId },
    select: { userId: true }
  });

  if (!agent || agent.userId !== input.userId) {
    throw new Error('Agent not found for user');
  }

  const fetchStatus = input.sourceKind === 'link' ? 'pending' : 'manual';

  return prisma.sourceDocument.create({
    data: {
      userId: input.userId,
      agentId: input.agentId,
      sourceKind: input.sourceKind,
      sourceType: input.sourceType,
      url: input.url,
      title: input.title,
      rawText: input.rawText,
      cleanedText: input.rawText,
      userNote: input.userNote,
      fetchStatus,
      extractionStatus: 'pending'
    }
  });
}

export async function listAgentSources(agentId: string) {
  return prisma.sourceDocument.findMany({
    where: { agentId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });
}
