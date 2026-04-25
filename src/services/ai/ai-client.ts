import type { ExtractedKnowledge } from '@/types/domain';

export type GeneratedProfileCard = {
  headline: string;
  bio: string;
  tags: string[];
  skills: string[];
  interests: string[];
  offers: string[];
  wants: string[];
  icebreakers: string[];
};

export type GeneratedAgentProfileDraft = ExtractedKnowledge & {
  card: GeneratedProfileCard;
};

export type EvolutionChatMessage = {
  role: 'assistant' | 'user';
  content: string;
};

export type EvolutionProfileContext = {
  headline: string;
  bio: string;
  tags: string[];
  skills: string[];
  interests: string[];
  offers: string[];
  wants: string[];
};

export type RecommendationCandidateForAi = {
  profileId: string;
  headline: string;
  bio: string;
  tags: string[];
  skills: string[];
  interests: string[];
  offers: string[];
  wants: string[];
  icebreakers: string[];
  ruleScore: number;
};

export type RankedRecommendation = {
  profileId: string;
  score: number;
  reason: string;
  topic?: string;
};

export interface AiClient {
  extractKnowledge(input: { text: string; title?: string }): Promise<ExtractedKnowledge>;
  generateProfileDraft?(input: { text: string; title?: string }): Promise<GeneratedAgentProfileDraft>;
  chatEvolution?(input: {
    message: string;
    conversation: EvolutionChatMessage[];
    currentProfile: EvolutionProfileContext | null;
    user: { displayName: string };
  }): Promise<EvolutionChatMessage>;
  generateWiki(input: { facts: string[]; projects: string[] }): Promise<{
    contentJson: unknown;
    markdown: string;
  }>;
  generateCard(input: { wikiMarkdown: string }): Promise<GeneratedProfileCard>;
  rankRecommendationCandidates(input: {
    seeker: { userId: string; interests: string[] };
    candidates: RecommendationCandidateForAi[];
  }): Promise<RankedRecommendation[]>;
}
