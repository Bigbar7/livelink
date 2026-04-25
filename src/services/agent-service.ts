import { prisma } from '@/lib/db';

export async function createAgent(input: {
  displayName: string;
  agentName?: string;
  role?: string;
  city?: string;
}) {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error('Display name is required');
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        displayName,
        role: input.role,
        city: input.city
      }
    });

    const agent = await tx.agent.create({
      data: {
        userId: user.id,
        name: input.agentName ?? `${displayName} 的数字分身`,
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

export async function getCurrentUserSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const agent = await prisma.agent.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' }
  });

  if (!agent) {
    return { user, agent: null, profile: null };
  }

  const profile = await prisma.agentProfile.findFirst({
    where: {
      userId,
      agentId: agent.id,
      status: 'published'
    },
    orderBy: { updatedAt: 'desc' }
  });

  return { user, agent, profile };
}

function parseContactHandle(rawText?: string | null) {
  const text = rawText?.trim();
  if (!text) return '';

  return text.replace(/^联系方式[:：]\s*/, '').trim();
}

export async function resetAgentPersonalInfo(input: { userId: string; agentId: string }) {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findFirst({
      where: {
        id: input.agentId,
        userId: input.userId
      },
      include: {
        user: true
      }
    });

    if (!agent) {
      throw new Error('Agent not found for user');
    }

    const preservedContact = await tx.sourceDocument.findFirst({
      where: {
        userId: input.userId,
        agentId: input.agentId,
        sourceType: 'contact'
      },
      orderBy: { createdAt: 'asc' }
    });

    await tx.agent.update({
      where: { id: input.agentId },
      data: {
        currentWikiId: null,
        currentProfileId: null,
        understandingScore: 5
      }
    });

    await tx.recommendationCandidate.deleteMany({
      where: {
        OR: [{ userId: input.userId }, { targetUserId: input.userId }]
      }
    });
    await tx.connectionRequest.deleteMany({
      where: {
        OR: [{ fromUserId: input.userId }, { toUserId: input.userId }]
      }
    });
    await tx.cardVisit.deleteMany({
      where: {
        profile: { agentId: input.agentId }
      }
    });
    await tx.agentProfile.deleteMany({ where: { agentId: input.agentId } });
    await tx.profileWiki.deleteMany({ where: { agentId: input.agentId } });
    await tx.profileProject.deleteMany({ where: { agentId: input.agentId } });
    await tx.profileFact.deleteMany({ where: { agentId: input.agentId } });
    await tx.sourceDocument.deleteMany({
      where: {
        agentId: input.agentId,
        NOT: { sourceType: 'contact' }
      }
    });

    const [user, resetAgent] = await Promise.all([
      tx.user.update({
        where: { id: input.userId },
        data: {
          role: null,
          city: null,
          avatarUrl: null
        }
      }),
      tx.agent.findUniqueOrThrow({ where: { id: input.agentId } })
    ]);

    return {
      user,
      agent: resetAgent,
      preservedContact,
      contact: parseContactHandle(preservedContact?.rawText)
    };
  });
}
