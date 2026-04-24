import { prisma } from '@/lib/db';

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export async function recommendProfiles(userId: string, interests: string[]) {
  const normalizedInterests = interests.map((interest) => interest.trim()).filter(Boolean);
  if (normalizedInterests.length === 0) return [];

  const profiles = await prisma.agentProfile.findMany({
    where: {
      status: 'published',
      userId: { not: userId }
    },
    orderBy: { updatedAt: 'desc' },
    take: 50
  });

  return profiles
    .map((profile) => {
      const fields = [
        ...parseList(profile.tagsJson),
        ...parseList(profile.skillsJson),
        ...parseList(profile.offersJson),
        ...parseList(profile.wantsJson),
        profile.headline,
        profile.bio
      ];
      const matchedInterests = normalizedInterests.filter((interest) =>
        fields.some((field) => field.includes(interest))
      );
      const score = matchedInterests.length * 20;

      return {
        profile,
        score,
        reason:
          score > 0
            ? `你的数字分身显示你关注 ${matchedInterests.join('、')}，对方资料中有相关能力或需求。`
            : '对方资料完整，适合进一步了解。'
      };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 10);
}
