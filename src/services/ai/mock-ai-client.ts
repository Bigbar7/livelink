import type { AiClient } from './ai-client';

export const mockAiClient: AiClient = {
  async extractKnowledge(input) {
    const text = input.text;

    return {
      facts: [
        {
          factType: 'identity',
          title: 'AI 产品 Builder',
          summary: '关注 AI 社交名片、推荐系统和关系沉淀',
          evidenceText: text.slice(0, 120),
          confidence: 0.82
        },
        {
          factType: 'offer',
          title: '产品闭环梳理',
          summary: '可以提供 AI 应用落地和原型设计能力',
          evidenceText: text,
          confidence: 0.78
        },
        {
          factType: 'want',
          title: '寻找 AI 工程化伙伴',
          summary: '希望认识推荐系统、AI 工程化和社交增长方向的人',
          evidenceText: text,
          confidence: 0.8
        }
      ],
      projects: [
        {
          name: 'Livelink',
          role: 'Product Builder',
          summary: 'AI 社交名片和数字分身产品',
          techStack: ['AI', 'Next.js', 'Recommendation'],
          links: []
        }
      ]
    };
  },

  async generateWiki(input) {
    const markdown = `# 个人 Wiki\n\n## Overview\n${input.facts.join('\n')}\n\n## Projects\n${input.projects.join('\n')}`;

    return {
      contentJson: {
        overview: {
          headline: 'AI 社交名片产品 Builder',
          summary: input.facts.join('；')
        },
        projects: input.projects
      },
      markdown
    };
  },

  async generateCard() {
    return {
      headline: 'AI 社交名片产品 Builder',
      bio: '关注 AI 如何帮助人更高效地展示价值、发现连接和沉淀关系。',
      tags: ['AI 社交', '产品设计', '推荐系统'],
      skills: ['产品闭环', 'AI 应用落地', '原型设计'],
      interests: ['主动社交', '个人知识库'],
      offers: ['产品设计', 'AI 应用落地'],
      wants: ['AI 工程化伙伴', '推荐系统伙伴'],
      icebreakers: ['AI 如何提升社交匹配效率', '个人名片如何变成长期 Agent'],
      analysis: {
        recentUpdates: ['正在打磨 AI 社交名片和数字分身产品'],
        careerHighlights: ['围绕推荐系统、关系沉淀和个人展示构建产品闭环'],
        domainSignals: [
          { name: 'AI 社交', evidence: '关注 AI 如何提升社交匹配效率' },
          { name: '产品设计', evidence: '可以提供产品设计和 AI 应用落地能力' }
        ],
        persona: {
          title: '产品型连接者',
          description: '擅长把人的能力、需求和连接场景整理成可落地的产品系统',
          confidence: 0.78
        },
        needs: ['AI 工程化伙伴', '推荐系统伙伴']
      }
    };
  },

  async chatEvolution(input) {
    return {
      role: 'assistant',
      content: `我理解了：${input.message}。这次进化我会重点追问可验证的新项目、能力变化和正在寻找的人。`
    };
  },

  async chatCreation(input) {
    return {
      role: 'assistant',
      content: `我理解了：${input.message}。为了生成第一版分身，可以再补充一个代表项目、你能提供的价值，或你现在想认识谁。`,
      readiness: 'medium',
      filledSlots: ['identity', 'currentFocus'],
      missingSlots: ['projects', 'skills', 'offers', 'wants'],
      draftProfile: {
        identity: 'AI 社交产品创造者',
        currentFocus: input.message.slice(0, 36)
      },
      nextBestQuestion: '你能补充一个最近做过的代表项目吗？一句话也可以。',
      suggestedReplies: ['我做过一个...', '最近项目是...', '先直接生成'],
      nextAction: 'ask_more'
    };
  },

  async rankRecommendationCandidates(input) {
    return input.candidates
      .map((candidate) => ({
        profileId: candidate.profileId,
        score: Math.min(100, Math.max(candidate.ruleScore, 60)),
        reason: `对方资料和你关注的 ${input.seeker.interests.join('、')} 存在可聊交集。`,
        topic: candidate.icebreakers[0] ?? '围绕彼此的能力、需求和合作场景展开交流'
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((first, second) => second.score - first.score)
      .slice(0, 10);
  }
};
