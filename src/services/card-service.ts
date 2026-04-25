import { prisma } from '@/lib/db';
import { slugifyName } from '@/lib/slug';
import type { AiClient, GeneratedProfileCard } from '@/services/ai/ai-client';

function stringifyAnalysis(generated: GeneratedProfileCard) {
  return JSON.stringify(generated.analysis ?? {});
}

function factsToCardPrompt(
  facts: Array<{ title: string; summary: string | null; factType: string }>,
  projects: Array<{ name: string; role: string | null; summary: string }>
) {
  const factLines = facts.map((fact) => `- [${fact.factType}] ${fact.title}: ${fact.summary ?? ''}`);
  const projectLines = projects.map((project) => `- ${project.name}${project.role ? `（${project.role}）` : ''}: ${project.summary}`);

  return [
    '# 已确认个人事实',
    factLines.length > 0 ? factLines.join('\n') : '- 暂无明确事实',
    '',
    '# 已确认项目',
    projectLines.length > 0 ? projectLines.join('\n') : '- 暂无明确项目',
    '',
    '请直接生成一张适合价值社交场景的 Agent 名片。'
  ].join('\n');
}

export async function generateCardFromWiki(wikiId: string, aiClient: AiClient) {
  const wiki = await prisma.profileWiki.findUniqueOrThrow({ where: { id: wikiId } });
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: wiki.agentId } });
  const generated = await aiClient.generateCard({ wikiMarkdown: wiki.markdown });
  const slug = `${slugifyName(agent.name)}-${Date.now().toString(36)}`;

  return prisma.agentProfile.create({
    data: {
      userId: wiki.userId,
      agentId: wiki.agentId,
      wikiId,
      slug,
      status: 'ai_generated',
      headline: generated.headline,
      bio: generated.bio,
      tagsJson: JSON.stringify(generated.tags),
      skillsJson: JSON.stringify(generated.skills),
      interestsJson: JSON.stringify(generated.interests),
      offersJson: JSON.stringify(generated.offers),
      wantsJson: JSON.stringify(generated.wants),
      icebreakersJson: JSON.stringify(generated.icebreakers),
      analysisJson: stringifyAnalysis(generated),
      templateKey: 'default'
    }
  });
}

export async function generatePublishedCardFromKnowledge(agentId: string, aiClient: AiClient) {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
  const [facts, projects] = await Promise.all([
    prisma.profileFact.findMany({
      where: { agentId, status: 'confirmed' },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.profileProject.findMany({
      where: { agentId, status: 'confirmed' },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  const generated = await aiClient.generateCard({
    wikiMarkdown: factsToCardPrompt(facts, projects)
  });
  const slug = `${slugifyName(agent.name)}-${Date.now().toString(36)}`;
  const card = await prisma.agentProfile.create({
    data: {
      userId: agent.userId,
      agentId,
      slug,
      status: 'published',
      headline: generated.headline,
      bio: generated.bio,
      tagsJson: JSON.stringify(generated.tags),
      skillsJson: JSON.stringify(generated.skills),
      interestsJson: JSON.stringify(generated.interests),
      offersJson: JSON.stringify(generated.offers),
      wantsJson: JSON.stringify(generated.wants),
      icebreakersJson: JSON.stringify(generated.icebreakers),
      analysisJson: stringifyAnalysis(generated),
      templateKey: 'default',
      publishedAt: new Date()
    }
  });

  await prisma.agent.update({
    where: { id: agentId },
    data: { currentProfileId: card.id }
  });

  return card;
}

export async function publishGeneratedCard(agentId: string, generated: GeneratedProfileCard) {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
  const slug = `${slugifyName(agent.name)}-${Date.now().toString(36)}`;
  const card = await prisma.agentProfile.create({
    data: {
      userId: agent.userId,
      agentId,
      slug,
      status: 'published',
      headline: generated.headline,
      bio: generated.bio,
      tagsJson: JSON.stringify(generated.tags),
      skillsJson: JSON.stringify(generated.skills),
      interestsJson: JSON.stringify(generated.interests),
      offersJson: JSON.stringify(generated.offers),
      wantsJson: JSON.stringify(generated.wants),
      icebreakersJson: JSON.stringify(generated.icebreakers),
      analysisJson: stringifyAnalysis(generated),
      templateKey: 'default',
      publishedAt: new Date()
    }
  });

  await prisma.agent.update({
    where: { id: agentId },
    data: { currentProfileId: card.id }
  });

  return card;
}

export async function publishCard(cardId: string) {
  const card = await prisma.agentProfile.update({
    where: { id: cardId },
    data: { status: 'published', publishedAt: new Date() }
  });

  await prisma.agent.update({
    where: { id: card.agentId },
    data: { currentProfileId: card.id }
  });

  return card;
}

export async function getPublicProfile(slug: string) {
  return prisma.agentProfile.findFirst({
    where: { slug, status: 'published' },
    include: {
      user: {
        select: { displayName: true, role: true, city: true }
      }
    }
  });
}

export async function listPublishedProfiles(limit = 20) {
  return prisma.agentProfile.findMany({
    where: { status: 'published' },
    include: {
      user: {
        select: { displayName: true, role: true, city: true }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: limit
  });
}
