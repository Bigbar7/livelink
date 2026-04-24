import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createAgent } from '@/services/agent-service';
import { recommendProfiles } from '@/services/recommendation-service';
import { searchProfiles } from '@/services/search-service';

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
});
