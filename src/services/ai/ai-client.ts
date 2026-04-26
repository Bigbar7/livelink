import type { ExtractedKnowledge } from '@/types/domain';

export type ProfileAnalysis = {
  recentUpdates: string[];
  careerHighlights: string[];
  domainSignals: Array<{
    name: string;
    evidence?: string;
  }>;
  persona?: {
    title?: string;
    description?: string;
    confidence?: number;
  };
  needs: string[];
};

export type GeneratedProfileCard = {
  headline: string;
  bio: string;
  tags: string[];
  skills: string[];
  interests: string[];
  offers: string[];
  wants: string[];
  icebreakers: string[];
  analysis?: ProfileAnalysis;
};

export type GeneratedAgentProfileDraft = ExtractedKnowledge & {
  card: GeneratedProfileCard;
};

export type EvolutionChatMessage = {
  role: 'assistant' | 'user';
  content: string;
};

export type CreationChatMessage = EvolutionChatMessage;

export type CreationProfileSlot = 'identity' | 'currentFocus' | 'projects' | 'skills' | 'offers' | 'wants';
export type CreationDraftProfile = Partial<Record<CreationProfileSlot, string>>;

export type CreationChatState = CreationChatMessage & {
  readiness: 'low' | 'medium' | 'ready';
  filledSlots: CreationProfileSlot[];
  missingSlots: CreationProfileSlot[];
  nextBestQuestion: string;
  suggestedReplies: string[];
  nextAction: 'ask_more' | 'suggest_generate';
  draftProfile: CreationDraftProfile;
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
  chatCreation?(input: {
    message: string;
    conversation: CreationChatMessage[];
    user: { displayName: string };
  }): Promise<CreationChatMessage | CreationChatState>;
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
