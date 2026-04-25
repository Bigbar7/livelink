import { prisma } from '@/lib/db';

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function scoreText(value: string | null | undefined, query: string, weight: number) {
  return value?.includes(query) ? weight : 0;
}

function scoreList(value: string, query: string, exactWeight: number, containsWeight: number) {
  return parseList(value).reduce((score, item) => {
    if (item === query) return score + exactWeight;
    if (item.includes(query)) return score + containsWeight;
    return score;
  }, 0);
}

export async function searchProfiles(query: string) {
  const normalized = query.trim();
  if (!normalized) return [];

  const profiles = await prisma.agentProfile.findMany({
    where: { status: 'published' },
    include: { user: true },
    orderBy: { updatedAt: 'desc' },
    take: 100
  });

  return profiles
    .map((profile) => {
      const score =
        scoreList(profile.tagsJson, normalized, 30, 14) +
        scoreList(profile.interestsJson, normalized, 10, 5) +
        scoreList(profile.skillsJson, normalized, 24, 10) +
        scoreList(profile.offersJson, normalized, 36, 14) +
        scoreList(profile.wantsJson, normalized, 36, 14) +
        scoreList(profile.icebreakersJson, normalized, 12, 6) +
        scoreText(profile.headline, normalized, 8) +
        scoreText(profile.bio, normalized, 6) +
        scoreText(profile.user.displayName, normalized, 10) +
        scoreText(profile.user.role, normalized, 10) +
        scoreText(profile.user.city, normalized, 4);

      return { profile, score };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return second.profile.updatedAt.getTime() - first.profile.updatedAt.getTime();
    })
    .slice(0, 20)
    .map((item) => item.profile);
}
