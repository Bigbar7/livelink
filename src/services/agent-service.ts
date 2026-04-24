import { prisma } from '@/lib/db';

export async function createAgent(input: {
  displayName: string;
  agentName?: string;
  role?: string;
  city?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        displayName: input.displayName,
        role: input.role,
        city: input.city
      }
    });

    const agent = await tx.agent.create({
      data: {
        userId: user.id,
        name: input.agentName ?? `${input.displayName} 的数字分身`,
        understandingScore: 5
      }
    });

    return { user, agent };
  });
}

export async function getMyAgentState(userId: string) {
  const agent = await prisma.agent.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  const [sources, confirmedFacts, projects, currentCard] = await Promise.all([
    prisma.sourceDocument.count({ where: { agentId: agent.id } }),
    prisma.profileFact.count({ where: { agentId: agent.id, status: 'confirmed' } }),
    prisma.profileProject.count({ where: { agentId: agent.id, status: 'confirmed' } }),
    agent.currentProfileId ? prisma.agentProfile.findUnique({ where: { id: agent.currentProfileId } }) : null
  ]);

  return {
    agent,
    understandingScore: agent.understandingScore,
    counts: { sources, confirmedFacts, projects },
    currentCard
  };
}
