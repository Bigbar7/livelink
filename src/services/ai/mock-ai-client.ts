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
      icebreakers: ['AI 如何提升社交匹配效率', '个人名片如何变成长期 Agent']
    };
  }
};
