export type SourceKind = 'manual' | 'resume' | 'link';
export type SourceType =
  | 'manual_text'
  | 'github'
  | 'gitee'
  | 'xiaohongshu'
  | 'portfolio'
  | 'blog'
  | 'article'
  | 'resume'
  | 'other';
export type DraftStatus = 'draft' | 'confirmed' | 'rejected';
export type PublishStatus = 'ai_generated' | 'user_confirmed' | 'published';

export type ExtractedKnowledge = {
  facts: Array<{
    factType: 'identity' | 'skill' | 'experience' | 'project' | 'topic' | 'offer' | 'want' | 'achievement' | 'link';
    title: string;
    summary?: string;
    evidenceText?: string;
    confidence: number;
  }>;
  projects: Array<{
    name: string;
    role?: string;
    summary: string;
    techStack: string[];
    links: string[];
  }>;
};
