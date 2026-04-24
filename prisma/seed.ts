import { prisma } from '../src/lib/db';

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 'demo-user-jun' },
    update: {
      displayName: 'Jun',
      role: 'AI Product Builder',
      city: 'Shanghai'
    },
    create: {
      id: 'demo-user-jun',
      displayName: 'Jun',
      role: 'AI Product Builder',
      city: 'Shanghai'
    }
  });

  await prisma.agent.upsert({
    where: { id: 'demo-agent-jun' },
    update: {
      userId: user.id,
      name: 'Jun 的数字分身',
      understandingScore: 36
    },
    create: {
      id: 'demo-agent-jun',
      userId: user.id,
      name: 'Jun 的数字分身',
      understandingScore: 36
    }
  });

  const residents = [
    {
      userId: 'demo-user-liang',
      agentId: 'demo-agent-liang',
      displayName: '梁景辰',
      role: '硬件工程师',
      city: '深圳',
      slug: 'liang-hardware-agent',
      headline: '梁景辰 · 硬件工程师',
      bio: '擅长嵌入式硬件、机器人控制板和供应链打样，适合一起做可演示的硬件 Demo。',
      tags: ['嵌入式', '供应链', '硬件 Demo'],
      skills: ['嵌入式开发', '控制板打样', '机器人原型'],
      offers: ['硬件原型', '控制板', '供应链打样'],
      wants: ['AI 产品伙伴', '路演 Demo', '用户场景'],
      icebreakers: ['把 Agent 名片做成 NFC 贴纸或线下硬件 Demo']
    },
    {
      userId: 'demo-user-chen',
      agentId: 'demo-agent-chen',
      displayName: '陈若宁',
      role: '早期投资人',
      city: '北京',
      slug: 'chen-ai-investor-agent',
      headline: '陈若宁 · 早期投资人',
      bio: '关注 AI Native 应用、效率工具和人才连接方向，愿意看早期 Demo 和团队能力。',
      tags: ['AI 应用', '早期投资', '效率工具'],
      skills: ['融资建议', '商业化判断', '早期资源'],
      offers: ['融资建议', '商业判断', '早期资源'],
      wants: ['AI Native 创业者', '高质量 Demo', '垂直场景'],
      icebreakers: ['AI 价值连接工具的冷启动和商业化']
    },
    {
      userId: 'demo-user-mia',
      agentId: 'demo-agent-mia',
      displayName: 'Mia Zhao',
      role: '增长设计师',
      city: '上海',
      slug: 'mia-growth-designer-agent',
      headline: 'Mia Zhao · 增长设计师',
      bio: '擅长小红书、B站内容冷启动和分享海报设计，可以帮助产品获得第一批种子用户。',
      tags: ['增长', '视觉设计', '内容冷启动'],
      skills: ['小红书增长', '分享海报', '社区运营'],
      offers: ['增长素材', '分享海报', '社区运营'],
      wants: ['AI 产品', '可传播名片', '冷启动项目'],
      icebreakers: ['如何让用户愿意分享自己的 Agent 名片']
    }
  ];

  for (const resident of residents) {
    await prisma.user.upsert({
      where: { id: resident.userId },
      update: {
        displayName: resident.displayName,
        role: resident.role,
        city: resident.city
      },
      create: {
        id: resident.userId,
        displayName: resident.displayName,
        role: resident.role,
        city: resident.city
      }
    });

    await prisma.agent.upsert({
      where: { id: resident.agentId },
      update: {
        userId: resident.userId,
        name: `${resident.displayName} 的数字分身`,
        understandingScore: 80
      },
      create: {
        id: resident.agentId,
        userId: resident.userId,
        name: `${resident.displayName} 的数字分身`,
        understandingScore: 80
      }
    });

    const profile = await prisma.agentProfile.upsert({
      where: { slug: resident.slug },
      update: {
        headline: resident.headline,
        bio: resident.bio,
        status: 'published',
        tagsJson: JSON.stringify(resident.tags),
        skillsJson: JSON.stringify(resident.skills),
        offersJson: JSON.stringify(resident.offers),
        wantsJson: JSON.stringify(resident.wants),
        icebreakersJson: JSON.stringify(resident.icebreakers),
        publishedAt: new Date()
      },
      create: {
        userId: resident.userId,
        agentId: resident.agentId,
        slug: resident.slug,
        status: 'published',
        headline: resident.headline,
        bio: resident.bio,
        tagsJson: JSON.stringify(resident.tags),
        skillsJson: JSON.stringify(resident.skills),
        offersJson: JSON.stringify(resident.offers),
        wantsJson: JSON.stringify(resident.wants),
        icebreakersJson: JSON.stringify(resident.icebreakers),
        publishedAt: new Date()
      }
    });

    await prisma.agent.update({
      where: { id: resident.agentId },
      data: { currentProfileId: profile.id }
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
