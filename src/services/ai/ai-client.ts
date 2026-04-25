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

export interface AiClient {
  extractKnowledge(input: { text: string; title?: string }): Promise<ExtractedKnowledge>;
  generateProfileDraft?(input: { text: string; title?: string }): Promise<GeneratedAgentProfileDraft>;
  generateWiki(input: { facts: string[]; projects: string[] }): Promise<{
    contentJson: unknown;
    markdown: string;
  }>;
  generateCard(input: { wikiMarkdown: string }): Promise<GeneratedProfileCard>;
}
