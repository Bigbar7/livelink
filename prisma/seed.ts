import { prisma } from '../src/lib/db';

const mainUser = {
  id: 'demo-user-jun',
  agentId: 'demo-agent-jun',
  displayName: '张明远',
  role: 'AI产品负责人',
  city: '上海',
  agentName: '张明远的数字分身',
  understandingScore: 36,
  interestsForRecommendation: ['AI工程化', '增长黑客', '出海', '硬件IoT', '社区运营']
};

const residents = [
  {
    userId: 'demo-user-ai-engineer-lin',
    agentId: 'demo-agent-ai-engineer-lin',
    displayName: '林晓玲',
    role: 'AI算法工程师',
    city: '北京',
    slug: 'ai-engineer-lin',
    headline: '专注多模态模型工程化落地，擅长推理优化',
    bio: '前大厂AI Lab成员，主导过千万级用户的内容理解系统。热爱开源和模型轻量化，希望和产品经理、硬件团队合作，让AI跑在边缘设备上。',
    tags: ['AI工程化', '多模态', '模型推理', '开源'],
    interests: ['AI工程化', '硬件IoT', '边缘硬件IoT'],
    skills: ['PyTorch', 'ONNX', '模型量化', 'Python', '性能调优'],
    offers: ['模型部署咨询', '推理加速方案', '技术分享', '代码审查'],
    wants: ['懂硬件的AI产品经理', '边缘计算场景', '开源协作伙伴', '算力资源'],
    icebreakers: ['你最近在优化哪个模型的推理速度？', '聊聊ONNX和TensorRT的踩坑经历']
  },
  {
    userId: 'demo-user-pm-chen-siyuan',
    agentId: 'demo-agent-pm-chen-siyuan',
    displayName: '陈思远',
    role: 'AI产品经理',
    city: '深圳',
    slug: 'pm-chen-siyuan',
    headline: '从0到1打造过3款AI工具，擅长场景挖掘和商业化',
    bio: '连续产品创业者，孵化过智能客服、AI写作助手。对用户需求和市场敏锐，追求技术与价值的结合。希望结识增长专家、硬件团队和内容创作者。',
    tags: ['AI产品', '商业化', '场景挖掘', '出海'],
    interests: ['AI工程化', '硬件IoT', '出海产品'],
    skills: ['产品规划', '用户研究', 'PRD撰写', '数据分析', 'MVP设计'],
    offers: ['产品策略咨询', '用户需求访谈', '原型评审', '出海市场分析'],
    wants: ['增长黑客', '硬件/IoT合作方', '内容分发渠道', '早期投资'],
    icebreakers: ['你觉得AI next big thing会是什么场景？', '出海产品如何做本地化？']
  },
  {
    userId: 'demo-user-growth-wang-jingjing',
    agentId: 'demo-agent-growth-wang-jingjing',
    displayName: '王晶晶',
    role: '增长运营专家',
    city: '杭州',
    slug: 'growth-wang-jingjing',
    headline: '擅长AI产品的用户裂变和社区冷启动，GMV增长3倍',
    bio: '前头部SaaS公司增长负责人，操盘过社群+内容+活动组合打法。相信价值社交是最高效的获客方式。期待和产品、内容创作者、投资人多交流。',
    tags: ['增长黑客', '社区运营', '内容营销', '出海'],
    interests: ['出海', '出海增长', '出海运营', '内容创作', '内容创作增长', '社区运营', '增长黑客'],
    skills: ['用户分层', '裂变活动设计', 'SEO/ASO', '数据分析', 'KOL合作'],
    offers: ['增长策略建议', '社区搭建框架', '爆款话题策划', '用户留存方案'],
    wants: ['有流量的内容创作者', '数据分析工具', 'A/B测试平台', '投资人的增长视角'],
    icebreakers: ['你做过最成功的增长实验是什么？', 'AI产品冷启动最难的点在哪？']
  },
  {
    userId: 'demo-user-designer-li-zeyan',
    agentId: 'demo-agent-designer-li-zeyan',
    displayName: '李泽言',
    role: 'UI/UX设计师',
    city: '上海',
    slug: 'designer-li-zeyan',
    headline: '专注AI原生界面和交互设计，让技术有温度',
    bio: '曾为多家AI初创公司设计旗舰产品，精通动效和品牌语言。相信好的设计能降低用户认知负担。希望和工程师、产品经理共创下一代 AI 体验。',
    tags: ['AI设计', 'UX研究', '动效设计', '设计系统'],
    interests: ['内容创作', '硬件', '硬件设计', '硬件产品'],
    skills: ['Figma', '用户旅程地图', '原型制作', '视觉设计', '可用性测试'],
    offers: ['产品设计评审', '设计系统搭建', '品牌视觉方案', '用户体验咨询'],
    wants: ['前沿AI技术demo', '用户行为数据', '硬件产品的设计挑战', '内容创作视觉素材'],
    icebreakers: ['AI产品如何让用户感到信任？', '你最喜欢的AI交互案例是哪个？']
  },
  {
    userId: 'demo-user-investor-gao-tianyang',
    agentId: 'demo-agent-investor-gao-tianyang',
    displayName: '高天阳',
    role: '科技投资人',
    city: '北京',
    slug: 'investor-gao-tianyang',
    headline: '专注早期AI、SaaS、出海赛道，已投10+初创',
    bio: '前战略咨询顾问，乐于帮助创始人梳理商业模式和融资节奏。寻找有技术壁垒和清晰场景的团队。愿和工程师、产品、增长专家深度交流。',
    tags: ['早期投资', 'AI', '出海', 'SaaS', '硬科技'],
    interests: ['出海', '企业客户'],
    skills: ['财务建模', '尽职调查', '市场分析', '投后赋能', '商业谈判'],
    offers: ['BP打磨建议', '融资节奏指导', '行业资源对接', '商业模式诊断'],
    wants: ['高潜力早期项目', '行业专家冷眼', '创业者真实痛点', '趋势数据'],
    icebreakers: ['你所在赛道明年最大的变量是什么？', '如何从0验证一个AI产品的PMF？']
  },
  {
    userId: 'demo-user-iot-zhao-yihang',
    agentId: 'demo-agent-iot-zhao-yihang',
    displayName: '赵一航',
    role: '硬件/IoT工程师',
    city: '深圳',
    slug: 'iot-zhao-yihang',
    headline: '边缘AI硬件方案专家，嵌入式+模型部署全栈',
    bio: '做过智能家居、可穿戴设备，熟悉瑞芯微、树莓派等平台。希望将大模型能力带到端侧。寻找AI算法、产品经理和内容创作者合作。',
    tags: ['边缘AI', '嵌入式', 'IoT', '模型部署', '硬件设计', '硬件'],
    interests: ['AI工程化', '硬件IoT', '边缘AI硬件IoT', '硬件'],
    skills: ['C++', '嵌入式Linux', 'TensorFlow Lite', '电路设计', 'RTOS'],
    offers: ['硬件选型咨询', '边缘计算demo开发', '原型机制作', '功耗优化'],
    wants: ['轻量级模型', '真实场景数据', '内容创作者的测评合作', '量产资源'],
    icebreakers: ['边缘AI最值得落地的场景是？', '模型量化到8bit的经验分享']
  },
  {
    userId: 'demo-user-creator-liu-yuyan',
    agentId: 'demo-agent-creator-liu-yuyan',
    displayName: '刘语嫣',
    role: '内容创作者/AI科普博主',
    city: '成都',
    slug: 'creator-liu-yuyan',
    headline: '全网50w粉丝，专注AI工具测评和行业解读',
    bio: '用通俗语言拆解复杂技术，帮助小白和企业选型AI工具。擅长制作视频和图解。希望结识产品创始人、设计师和增长专家，一起创作优质内容。',
    tags: ['内容创作', 'AI科普', '视频制作', 'KOL', '社区'],
    interests: ['内容创作', '社区运营'],
    skills: ['脚本撰写', '视频剪辑', '信息图设计', '热点捕捉', '社群运营'],
    offers: ['产品测评曝光', '内容共创', '粉丝社群种草', '行业报告解读'],
    wants: ['有亮点的AI工具内测', '设计师做视觉呈现', '增长专家帮忙扩散', '品牌合作'],
    icebreakers: ['你最近发现什么有意思的AI产品？', '如何把技术内容做得不枯燥？']
  },
  {
    userId: 'demo-user-global-business-wu',
    agentId: 'demo-agent-global-business-wu',
    displayName: '吴大伟',
    role: '出海业务负责人',
    city: '广州',
    slug: 'global-business-wu',
    headline: '帮助3家AI公司进入北美和东南亚市场，本地化实战派',
    bio: '熟悉海外合规、支付、渠道和用户获取。相信全球化产品需要本土化运营。期待和产品、增长、投资伙伴探讨出海策略。',
    tags: ['出海', '本地化', '海外增长', '合规', 'SaaS'],
    interests: ['出海'],
    skills: ['市场调研', '渠道分销', '多语言SEO', '支付集成', '跨文化沟通'],
    offers: ['出海市场准入咨询', '本地化资源对接', '海外营销渠道', '合规风控提醒'],
    wants: ['有出海意向的AI产品', '海外内容创作者', '当地支付解决方案', '海外人才'],
    icebreakers: ['出海第一站选北美还是东南亚？', '如何应对GDPR和CCPA？']
  },
  {
    userId: 'demo-user-enterprise-xu-jingya',
    agentId: 'demo-agent-enterprise-xu-jingya',
    displayName: '徐静雅',
    role: '企业客户/数字化转型专家',
    city: '上海',
    slug: 'enterprise-xu-jingya',
    headline: '服务过10+家世界500强，帮企业落地AI提效',
    bio: '专注制造业和零售业的AI应用，从试点到规模化。理解大企业的采购周期和决策链。希望连接AI产品团队和解决方案提供商。',
    tags: ['企业服务', '数字化转型', '大客户', '制造业AI', '零售AI'],
    interests: ['企业客户'],
    skills: ['需求分析', '解决方案设计', '项目交付', 'ROI测算', '内部推广'],
    offers: ['企业真实痛点场景', '试点项目机会', '采购流程指导', '标杆案例背书'],
    wants: ['成熟的AI产品', '懂行业的工程师', '低成本POC方案', '行业白皮书'],
    icebreakers: ['AI在企业落地最大的阻力是什么？', '如何向老板证明AI投资的回报？']
  },
  {
    userId: 'demo-user-community-zhou-ziheng',
    agentId: 'demo-agent-community-zhou-ziheng',
    displayName: '周子衡',
    role: '社区运营/DAO组织者',
    city: '香港',
    slug: 'community-zhou-ziheng',
    headline: '建过2个千人AI开发者社区，擅长线上活动和激励设计',
    bio: '信奉开放式协作，运营过技术社区和创作者DAO。希望通过连接产生意外价值。寻找内容创作者、增长专家和投资人来丰富社区生态。',
    tags: ['社区运营', 'DAO', '开发者关系', '线上活动', 'Web3'],
    interests: ['社区运营', '增长黑客'],
    skills: ['社群搭建', '活动策划', 'Token设计', '内容激励', '冲突调解'],
    offers: ['社区冷启动方案', '会员增长策略', '线上黑客松组织', '贡献者激励'],
    wants: ['技术KOL入驻', '赞助商和奖品', '治理工具', '数据分析仪表盘'],
    icebreakers: ['如何让社区用户主动贡献内容？', 'DAO和传统社区的本质区别？']
  }
];

async function clearGeneratedData() {
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

async function seedMainUser() {
  await prisma.user.create({
    data: {
      id: mainUser.id,
      displayName: mainUser.displayName,
      role: mainUser.role,
      city: mainUser.city
    }
  });

  await prisma.agent.create({
    data: {
      id: mainUser.agentId,
      userId: mainUser.id,
      name: mainUser.agentName,
      understandingScore: mainUser.understandingScore
    }
  });
}

async function seedResidents() {
  for (const resident of residents) {
    await prisma.user.create({
      data: {
        id: resident.userId,
        displayName: resident.displayName,
        role: resident.role,
        city: resident.city
      }
    });

    await prisma.agent.create({
      data: {
        id: resident.agentId,
        userId: resident.userId,
        name: `${resident.displayName}的数字分身`,
        understandingScore: 80
      }
    });

    const profile = await prisma.agentProfile.create({
      data: {
        userId: resident.userId,
        agentId: resident.agentId,
        slug: resident.slug,
        status: 'published',
        headline: resident.headline,
        bio: resident.bio,
        tagsJson: JSON.stringify(resident.tags),
        skillsJson: JSON.stringify(resident.skills),
        interestsJson: JSON.stringify(resident.interests),
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

async function main() {
  await clearGeneratedData();
  await seedMainUser();
  await seedResidents();

  console.log(
    `Seeded ${residents.length} resident profiles for ${mainUser.displayName}. Recommendation interests: ${mainUser.interestsForRecommendation.join(
      '、'
    )}`
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});
