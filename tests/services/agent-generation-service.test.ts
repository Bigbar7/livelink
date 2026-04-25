import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import type { AiClient } from '@/services/ai/ai-client';
import { generateAgentProfile } from '@/services/agent-generation-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import type { LinkImportResult } from '@/services/github-import-service';

describe('agent-generation-service', () => {
  beforeEach(async () => {
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
  });

  it('uses one combined AI call to extract knowledge and publish the card when supported', async () => {
    const generateProfileDraft = vi.fn<NonNullable<AiClient['generateProfileDraft']>>(async () => ({
      ...(await mockAiClient.extractKnowledge({ text: '我是 AI 产品经理，想找硬件工程师。' })),
      card: await mockAiClient.generateCard({ wikiMarkdown: 'combined' })
    }));
    const aiClient: AiClient = {
      ...mockAiClient,
      extractKnowledge: vi.fn(mockAiClient.extractKnowledge),
      generateCard: vi.fn(mockAiClient.generateCard),
      generateWiki: vi.fn(mockAiClient.generateWiki),
      generateProfileDraft
    };

    const result = await generateAgentProfile(
      {
        displayName: 'Jun',
        text: '我是 AI 产品经理，想找硬件工程师。'
      },
      aiClient
    );

    const factsCount = await prisma.profileFact.count({ where: { agentId: result.agent.id, status: 'confirmed' } });
    const projectsCount = await prisma.profileProject.count({ where: { agentId: result.agent.id, status: 'confirmed' } });

    expect(result.profile.status).toBe('published');
    expect(result.profile.headline).toBe('AI 社交名片产品 Builder');
    expect(factsCount).toBeGreaterThan(0);
    expect(projectsCount).toBeGreaterThan(0);
    expect(generateProfileDraft).toHaveBeenCalledTimes(1);
    expect(aiClient.extractKnowledge).not.toHaveBeenCalled();
    expect(aiClient.generateCard).not.toHaveBeenCalled();
    expect(aiClient.generateWiki).not.toHaveBeenCalled();
  });

  it('persists dedicated profile analysis for the personal analysis page', async () => {
    const generateProfileDraft = vi.fn<NonNullable<AiClient['generateProfileDraft']>>(async () => ({
      facts: [],
      projects: [],
      card: {
        headline: 'AI 产品 Builder',
        bio: '正在做 Livelink',
        tags: ['AI 社交'],
        skills: ['产品定义'],
        interests: ['价值社交'],
        offers: ['AI 产品设计'],
        wants: ['推荐系统工程师'],
        icebreakers: ['聊聊 AI 如何理解人'],
        analysis: {
          recentUpdates: ['正在把个人资料转成可推荐的 Agent Profile'],
          careerHighlights: ['从 0 到 1 搭建 AI 社交名片产品'],
          domainSignals: [{ name: 'AI 社交', evidence: '用户明确提到 Livelink 和价值社交' }],
          persona: {
            title: '产品型连接者',
            description: '倾向于把抽象关系问题拆成可落地的产品系统',
            confidence: 0.82
          },
          needs: ['寻找推荐系统工程师']
        }
      }
    }));

    const result = await generateAgentProfile(
      {
        displayName: 'Jun',
        text: '我在做 Livelink，希望把个人资料转成可推荐的 Agent Profile，想找推荐系统工程师。'
      },
      { ...mockAiClient, generateProfileDraft }
    );

    const analysisJson = (result.profile as unknown as { analysisJson?: string }).analysisJson;

    expect(analysisJson).toBeTruthy();
    expect(JSON.parse(analysisJson ?? '{}')).toMatchObject({
      recentUpdates: ['正在把个人资料转成可推荐的 Agent Profile'],
      persona: {
        title: '产品型连接者'
      },
      needs: ['寻找推荐系统工程师']
    });
  });

  it('normalizes AI facts that are missing factType before persisting', async () => {
    const generateProfileDraft = vi.fn<NonNullable<AiClient['generateProfileDraft']>>(async () => ({
      facts: [
        {
          title: '个人基本信息',
          summary: 'Lavine，香港城市大学计算机科学硕士在读，定位后端软件工程师。',
          evidenceText: 'Lavine，香港城市大学计算机科学硕士在读，后端软件工程师。',
          confidence: 0.86
        }
      ] as Awaited<ReturnType<NonNullable<AiClient['generateProfileDraft']>>>['facts'],
      projects: [],
      card: await mockAiClient.generateCard({ wikiMarkdown: 'profile' })
    }));

    const result = await generateAgentProfile(
      {
        displayName: 'Lavine',
        text: 'Lavine，香港城市大学计算机科学硕士在读，定位后端软件工程师。'
      },
      { ...mockAiClient, generateProfileDraft }
    );

    const fact = await prisma.profileFact.findFirstOrThrow({ where: { agentId: result.agent.id } });

    expect(fact.title).toBe('个人基本信息');
    expect(fact.factType).toBe('identity');
  });

  it('adds imported GitHub material to the combined AI draft input', async () => {
    const generateProfileDraft = vi.fn<NonNullable<AiClient['generateProfileDraft']>>(async (input) => ({
      facts: [
        {
          factType: 'project',
          title: 'GitHub project',
          summary: input.text,
          evidenceText: 'README 摘要',
          confidence: 0.8
        }
      ],
      projects: [],
      card: await mockAiClient.generateCard({ wikiMarkdown: 'github' })
    }));
    const importGithubProfile = vi.fn(async (): Promise<LinkImportResult> => ({
      sourceType: 'github',
      title: 'GitHub: Jun (@jun7)',
      url: 'https://github.com/jun7',
      rawText: 'GitHub 用户：Jun\n仓库：livelink\nREADME 摘要：AI social profile builder',
      cleanedText: 'GitHub 用户：Jun\n仓库：livelink\nREADME 摘要：AI social profile builder',
      fetchStatus: 'fetched'
    }));

    const result = await generateAgentProfile(
      {
        displayName: 'Jun',
        links: [{ url: 'https://github.com/jun7' }]
      },
      { ...mockAiClient, generateProfileDraft },
      { importGithubProfile }
    );

    const source = await prisma.sourceDocument.findFirstOrThrow({ where: { agentId: result.agent.id } });
    expect(source.fetchStatus).toBe('fetched');
    expect(source.rawText).toContain('AI social profile builder');
    expect(generateProfileDraft.mock.calls[0]?.[0].text).toContain('README 摘要：AI social profile builder');
    expect(importGithubProfile).toHaveBeenCalledWith({ url: 'https://github.com/jun7' });
  });
});
