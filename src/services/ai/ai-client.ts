import type { ExtractedKnowledge } from '@/types/domain';

export interface AiClient {
  extractKnowledge(input: { text: string; title?: string }): Promise<ExtractedKnowledge>;
  generateWiki(input: { facts: string[]; projects: string[] }): Promise<{
    contentJson: unknown;
    markdown: string;
  }>;
  generateCard(input: { wikiMarkdown: string }): Promise<{
    headline: string;
    bio: string;
    tags: string[];
    skills: string[];
    interests: string[];
    offers: string[];
    wants: string[];
    icebreakers: string[];
  }>;
}
