import { prisma } from '@/lib/db';

type ConnectionSource = 'profile_scan' | 'search' | 'recommendation' | 'shared_link';

export async function createConnectionRequest(input: {
  fromUserId: string;
  toUserId: string;
  source: ConnectionSource;
  message?: string;
}) {
  if (input.fromUserId === input.toUserId) {
    throw new Error('Cannot connect to yourself');
  }

  const existing = await prisma.connectionRequest.findFirst({
    where: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      status: 'pending'
    }
  });

  if (existing) {
    return prisma.connectionRequest.update({
      where: { id: existing.id },
      data: {
        source: input.source,
        message: input.message
      }
    });
  }

  return prisma.connectionRequest.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      source: input.source,
      message: input.message,
      status: 'pending'
    }
  });
}

export async function listConnections(userId: string) {
  return prisma.connectionRequest.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }]
    },
    orderBy: { createdAt: 'desc' }
  });
}
