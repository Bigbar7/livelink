import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { POST } from '@/app/api/agents/evolve/route';
import { generateAgentProfile } from '@/services/agent-generation-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

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

describe('POST /api/agents/evolve', () => {
  beforeEach(clearDb);

  it('returns 400 when required identifiers are missing', async () => {
    const response = await POST(new Request('http://localhost/api/agents/evolve', {
      method: 'POST',
      body: JSON.stringify({ text: '更新近况' })
    }));

    expect(response.status).toBe(400);
  });

  it('updates an existing agent profile from evolution text', async () => {
    const initial = await generateAgentProfile({ displayName: 'Jun', text: '我在做 AI 社交名片。' }, mockAiClient);
    const response = await POST(new Request('http://localhost/api/agents/evolve', {
      method: 'POST',
      body: JSON.stringify({
        userId: initial.user.id,
        agentId: initial.agent.id,
        text: '我最近开始做硬件 AI 项目，想找供应链伙伴。',
        conversation: [{ role: 'user', content: '更新硬件 AI 方向' }]
      })
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.agent.id).toBe(initial.agent.id);
    expect(body.data.profile.id).not.toBe(initial.profile.id);
    expect(await prisma.agent.count()).toBe(1);
  });
});
