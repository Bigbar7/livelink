import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { recommendProfiles } from '@/services/recommendation-service';
import { searchProfiles } from '@/services/search-service';
import type { AiClient } from '@/services/ai/ai-client';

describe('search and recommendation', () => {
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

  it('searches published profiles by tags and bio', async () => {
    const account = await createAgent({ displayName: 'Jun' });
    await prisma.agentProfile.create({
      data: {
        userId: account.user.id,
        agentId: account.agent.id,
        slug: 'jun-ai',
        status: 'published',
        headline: 'AI 产品 Builder',
        bio: '关注 AI 社交和推荐系统',
        tagsJson: JSON.stringify(['AI 社交', '推荐系统'])
      }
    });
    await prisma.agentProfile.create({
      data: {
        userId: account.user.id,
        agentId: account.agent.id,
        slug: 'jun-draft',
        status: 'ai_generated',
        headline: '推荐系统草稿',
        bio: '未发布',
        tagsJson: JSON.stringify(['推荐系统'])
      }
    });

    const results = await searchProfiles('推荐系统');

    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('jun-ai');
  });

  it('ranks search results by relevance before recency', async () => {
    const account = await createAgent({ displayName: 'Jun' });
    const stronger = await createAgent({ displayName: 'Enterprise Expert', role: '企业客户顾问' });
    const weaker = await createAgent({ displayName: 'Investor' });

    await prisma.agentProfile.create({
      data: {
        userId: stronger.user.id,
        agentId: stronger.agent.id,
        slug: 'enterprise-expert',
        status: 'published',
        headline: '服务企业客户的数字化转型专家',
        bio: '熟悉企业采购和AI落地。',
        tagsJson: JSON.stringify(['企业客户', '数字化转型']),
        wantsJson: JSON.stringify(['企业客户真实痛点'])
      }
    });
    await prisma.agentProfile.create({
      data: {
        userId: weaker.user.id,
        agentId: weaker.agent.id,
        slug: 'investor-view',
        status: 'published',
        headline: '科技投资人',
        bio: '希望了解企业客户视角。',
        wantsJson: JSON.stringify(['企业客户洞察'])
      }
    });
    await prisma.agentProfile.create({
      data: {
        userId: account.user.id,
        agentId: account.agent.id,
        slug: 'irrelevant-latest',
        status: 'published',
        headline: 'AI工程化',
        bio: '不应命中当前查询。'
      }
    });

    const results = await searchProfiles('企业客户');

    expect(results.map((profile) => profile.slug)).toEqual(['enterprise-expert', 'investor-view']);
  });

  it('recommends other published profiles and excludes current user', async () => {
    const current = await createAgent({ displayName: 'Jun' });
    const target = await createAgent({ displayName: 'Lin' });
    await prisma.agentProfile.create({
      data: {
        userId: current.user.id,
        agentId: current.agent.id,
        slug: 'jun-self',
        status: 'published',
        headline: 'AI 工程化自我资料',
        bio: '当前用户资料',
        skillsJson: JSON.stringify(['AI 工程化'])
      }
    });
    await prisma.agentProfile.create({
      data: {
        userId: target.user.id,
        agentId: target.agent.id,
        slug: 'lin-ai-engineer',
        status: 'published',
        headline: 'AI Engineer',
        bio: '擅长模型接入和后端工程化',
        skillsJson: JSON.stringify(['AI 工程化', '后端']),
        offersJson: JSON.stringify(['模型接入']),
        wantsJson: JSON.stringify(['产品合作'])
      }
    });

    const results = await recommendProfiles(current.user.id, ['AI 工程化']);

    expect(results).toHaveLength(1);
    expect(results[0].profile.slug).toBe('lin-ai-engineer');
    expect(results[0].reason).toContain('AI 工程化');
  });

  it('keeps the recommended profile owner name separate from the headline', async () => {
    const current = await createAgent({ displayName: 'Jun' });
    const target = await createAgent({ displayName: '林晓玲' });
    await prisma.agentProfile.create({
      data: {
        userId: target.user.id,
        agentId: target.agent.id,
        slug: 'lin-ai-engineer',
        status: 'published',
        headline: '专注多模态模型工程化落地，擅长推理优化',
        bio: '擅长模型接入和后端工程化',
        skillsJson: JSON.stringify(['AI 工程化'])
      }
    });

    const results = await recommendProfiles(current.user.id, ['AI 工程化']);

    expect(results[0].profile.user.displayName).toBe('林晓玲');
  });

  it('includes the recommended profile owner contact handle when available', async () => {
    const current = await createAgent({ displayName: 'Jun' });
    const target = await createAgent({ displayName: 'Lin' });
    await prisma.sourceDocument.create({
      data: {
        userId: target.user.id,
        agentId: target.agent.id,
        sourceKind: 'manual',
        sourceType: 'contact',
        rawText: '联系方式：wx_lin_ai'
      }
    });
    await prisma.agentProfile.create({
      data: {
        userId: target.user.id,
        agentId: target.agent.id,
        slug: 'lin-ai-engineer-contact',
        status: 'published',
        headline: 'AI Engineer',
        bio: '擅长模型接入和后端工程化',
        skillsJson: JSON.stringify(['AI 工程化'])
      }
    });

    const results = await recommendProfiles(current.user.id, ['AI 工程化']);

    expect(results[0].contactHandle).toBe('wx_lin_ai');
  });

  it('ranks recommendations by match strength for the requested interest', async () => {
    const current = await createAgent({ displayName: 'Jun' });
    const stronger = await createAgent({ displayName: 'Edge AI Engineer' });
    const weaker = await createAgent({ displayName: 'AI Product PM' });

    await prisma.agentProfile.create({
      data: {
        userId: weaker.user.id,
        agentId: weaker.agent.id,
        slug: 'ai-product-pm',
        status: 'published',
        headline: 'AI产品经理',
        bio: '希望连接AI工程化团队。',
        wantsJson: JSON.stringify(['AI工程化合作'])
      }
    });
    await prisma.agentProfile.create({
      data: {
        userId: stronger.user.id,
        agentId: stronger.agent.id,
        slug: 'edge-ai-engineer',
        status: 'published',
        headline: 'AI工程化落地专家',
        bio: '专注模型部署和性能优化。',
        tagsJson: JSON.stringify(['AI工程化']),
        skillsJson: JSON.stringify(['模型部署', '性能调优']),
        offersJson: JSON.stringify(['AI工程化咨询'])
      }
    });

    const results = await recommendProfiles(current.user.id, ['AI工程化']);

    expect(results.map((item) => item.profile.slug)).toEqual(['edge-ai-engineer', 'ai-product-pm']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('uses AI reranking to include semantically relevant candidates without literal keyword matches', async () => {
    const current = await createAgent({ displayName: 'Jun' });
    const semantic = await createAgent({ displayName: 'Ranking Engineer' });
    const unrelated = await createAgent({ displayName: 'Cafe Operator' });

    const semanticProfile = await prisma.agentProfile.create({
      data: {
        userId: semantic.user.id,
        agentId: semantic.agent.id,
        slug: 'ranking-recall-engineer',
        status: 'published',
        headline: '个性化排序与召回工程师',
        bio: '做过向量检索、候选召回和多目标排序优化。',
        skillsJson: JSON.stringify(['召回算法', '排序优化']),
        offersJson: JSON.stringify(['检索链路诊断'])
      }
    });
    await prisma.agentProfile.create({
      data: {
        userId: unrelated.user.id,
        agentId: unrelated.agent.id,
        slug: 'cafe-operator',
        status: 'published',
        headline: '咖啡品牌运营',
        bio: '关注门店选址和会员活动。'
      }
    });

    const rankRecommendationCandidates = vi.fn(async () => [
      {
        profileId: semanticProfile.id,
        score: 92,
        reason: '对方的召回算法和排序优化经验，和你要找的推荐系统方向高度相关。',
        topic: '可以从召回链路和排序指标设计聊起。'
      }
    ]);
    const aiClient = { rankRecommendationCandidates } as unknown as AiClient;

    const results = await recommendProfiles(current.user.id, ['推荐系统'], aiClient);

    expect(rankRecommendationCandidates).toHaveBeenCalledOnce();
    expect(results.map((item) => item.profile.slug)).toEqual(['ranking-recall-engineer']);
    expect(results[0].score).toBe(92);
    expect(results[0].reason).toContain('召回算法');
    expect(results[0].topic).toContain('排序指标');
  });

  it('falls back to rule-based recommendations when AI reranking fails', async () => {
    const current = await createAgent({ displayName: 'Jun' });
    const target = await createAgent({ displayName: 'Lin' });
    await prisma.agentProfile.create({
      data: {
        userId: target.user.id,
        agentId: target.agent.id,
        slug: 'lin-ai-engineer-fallback',
        status: 'published',
        headline: 'AI 工程化伙伴',
        bio: '擅长模型接入。',
        skillsJson: JSON.stringify(['AI 工程化'])
      }
    });
    const aiClient = {
      rankRecommendationCandidates: vi.fn(async () => {
        throw new Error('AI unavailable');
      })
    } as unknown as AiClient;

    const results = await recommendProfiles(current.user.id, ['AI 工程化'], aiClient);

    expect(results).toHaveLength(1);
    expect(results[0].profile.slug).toBe('lin-ai-engineer-fallback');
    expect(results[0].reason).toContain('AI 工程化');
  });
});
