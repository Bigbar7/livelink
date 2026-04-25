import { prisma } from '@/lib/db';
import type { AiClient, RecommendationCandidateForAi } from '@/services/ai/ai-client';
import type { Prisma } from '@prisma/client';

type RecommendedProfile = Prisma.AgentProfileGetPayload<{
  include: {
    user: {
      select: {
        displayName: true;
        role: true;
        city: true;
      };
    };
  };
}>;

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function scoreText(value: string | null | undefined, interest: string, weight: number) {
  return value?.includes(interest) ? weight : 0;
}

function scoreList(value: string, interest: string, exactWeight: number, containsWeight: number) {
  return parseList(value).reduce((score, item) => {
    if (item === interest) return score + exactWeight;
    if (item.includes(interest)) return score + containsWeight;
    return score;
  }, 0);
}

function scoreProfileForInterest(
  profile: {
    tagsJson: string;
    interestsJson: string;
    skillsJson: string;
    offersJson: string;
    wantsJson: string;
    headline: string;
    bio: string;
  },
  interest: string
) {
  return (
    scoreList(profile.tagsJson, interest, 40, 18) +
    scoreList(profile.interestsJson, interest, 34, 16) +
    scoreList(profile.skillsJson, interest, 28, 12) +
    scoreList(profile.offersJson, interest, 28, 12) +
    scoreList(profile.wantsJson, interest, 28, 12) +
    scoreText(profile.headline, interest, 18) +
    scoreText(profile.bio, interest, 8)
  );
}

type RecommendationResult = {
  profile: RecommendedProfile;
  score: number;
  reason: string;
  topic?: string;
};

function sanitizeAiScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
}

function profileToAiCandidate(
  profile: RecommendedProfile,
  ruleScore: number
): RecommendationCandidateForAi {
  return {
    profileId: profile.id,
    headline: profile.headline,
    bio: profile.bio,
    tags: parseList(profile.tagsJson),
    skills: parseList(profile.skillsJson),
    interests: parseList(profile.interestsJson),
    offers: parseList(profile.offersJson),
    wants: parseList(profile.wantsJson),
    icebreakers: parseList(profile.icebreakersJson),
    ruleScore
  };
}

export async function recommendProfiles(
  userId: string,
  interests: string[],
  aiClient?: Pick<AiClient, 'rankRecommendationCandidates'>
): Promise<RecommendationResult[]> {
  const normalizedInterests = interests.map((interest) => interest.trim()).filter(Boolean);
  if (normalizedInterests.length === 0) return [];

  const profiles = await prisma.agentProfile.findMany({
    where: {
      status: 'published',
      userId: { not: userId }
    },
    include: {
      user: {
        select: { displayName: true, role: true, city: true }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 50
  });

  const scored = profiles
    .map((profile) => {
      const interestScores = normalizedInterests.map((interest) => ({
        interest,
        score: scoreProfileForInterest(profile, interest)
      }));
      const matchedInterests = interestScores.filter((item) => item.score > 0).map((item) => item.interest);
      const score = interestScores.reduce((sum, item) => sum + item.score, 0);

      return {
        profile,
        score,
        reason:
          score > 0
            ? `你的数字分身显示你关注 ${matchedInterests.join('、')}，对方资料中有相关能力或需求。`
            : '对方资料完整，适合进一步了解。'
      };
    });

  try {
    if (!aiClient) throw new Error('AI reranking not configured');
    const candidatePool = [...scored]
      .sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        return second.profile.updatedAt.getTime() - first.profile.updatedAt.getTime();
      })
      .slice(0, 30);
    const ranked = await aiClient.rankRecommendationCandidates({
      seeker: { userId, interests: normalizedInterests },
      candidates: candidatePool.map((item) => profileToAiCandidate(item.profile, item.score))
    });
    const byId = new Map(scored.map((item) => [item.profile.id, item]));
    const recommendations = ranked
      .map<RecommendationResult | null>((item) => {
        const fallback = byId.get(item.profileId);
        if (!fallback) return null;
        const score = sanitizeAiScore(item.score);
        if (score <= 0) return null;
        return {
          profile: fallback.profile,
          score,
          reason: item.reason?.trim() || fallback.reason,
          topic: item.topic?.trim()
        };
      })
      .filter((item): item is RecommendationResult => Boolean(item))
      .sort((first, second) => second.score - first.score)
      .slice(0, 10);

    if (recommendations.length > 0) return recommendations;
  } catch {
    // If AI reranking is unavailable, keep the product usable with deterministic scoring.
  }

  return scored
    .filter((item) => item.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return second.profile.updatedAt.getTime() - first.profile.updatedAt.getTime();
    })
    .slice(0, 10);
}
