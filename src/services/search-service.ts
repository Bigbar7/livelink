import { prisma } from '@/lib/db';

export async function searchProfiles(query: string) {
  const normalized = query.trim();
  if (!normalized) return [];

  return prisma.agentProfile.findMany({
    where: {
      status: 'published',
      OR: [
        { headline: { contains: normalized } },
        { bio: { contains: normalized } },
        { tagsJson: { contains: normalized } },
        { skillsJson: { contains: normalized } },
        { offersJson: { contains: normalized } },
        { wantsJson: { contains: normalized } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: 20
  });
}
