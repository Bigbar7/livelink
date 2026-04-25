import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/agents/route';
import { POST as generateProfilePOST } from '@/app/api/agents/generate-profile/route';
import { prisma } from '@/lib/db';

vi.mock('@/services/ai/default-ai-client', () => ({
  defaultAiClient: {
    async extractKnowledge(input: { text: string }) {
      return {
        facts: [
          {
            factType: 'identity',
            title: 'AI 产品 Builder',
            summary: '关注 AI 社交名片、推荐系统和关系沉淀',
            evidenceText: input.text.slice(0, 120),
            confidence: 0.82
          }
        ],
        projects: []
      };
    },
    async generateWiki() {
      return { contentJson: {}, markdown: '# Wiki' };
    },
    async generateCard() {
      return {
        headline: 'AI 社交名片产品 Builder',
        bio: '关注 AI 如何帮助人更高效地展示价值、发现连接和沉淀关系。',
        tags: ['AI 社交'],
        skills: ['产品闭环'],
        interests: ['主动社交'],
        offers: ['产品设计'],
        wants: ['AI 工程化伙伴'],
        icebreakers: ['AI 如何提升社交匹配效率']
      };
    }
  }
}));

async function clearDb() {
  await prisma.cardVisit.deleteMany();
  await prisma.recommendationCandidate.deleteMany();
  await prisma.connectionRequest.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.profileWiki.deleteMany();
  await prisma.profileProject.deleteMany();
  await prisma.profileFact.deleteMany();
  await prisma.sourceDocument.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();
}

describe('POST /api/agents', () => {
  beforeEach(clearDb);
  afterEach(clearDb);

  it('returns 400 for malformed JSON', async () => {
    const request = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: '{bad-json'
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: { message: 'Malformed JSON' }
    });
  });

  it('returns 400 when displayName is only whitespace', async () => {
    const response = await POST(new Request('http://localhost/api/agents', {
      method: 'POST',
      body: JSON.stringify({ displayName: '   ' })
    }));

    expect(response.status).toBe(400);
  });

  it('returns 400 for profile generation when displayName is only whitespace', async () => {
    const response = await generateProfilePOST(new Request('http://localhost/api/agents/generate-profile', {
      method: 'POST',
      body: JSON.stringify({ displayName: '   ', text: '我在做 AI 社交名片。' })
    }));

    expect(response.status).toBe(400);
  });

  it('returns 400 for profile generation when contact is missing', async () => {
    const response = await generateProfilePOST(new Request('http://localhost/api/agents/generate-profile', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Jun', text: '我在做 AI 社交名片。' })
    }));

    expect(response.status).toBe(400);
  });
});
