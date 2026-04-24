import { prisma } from '@/lib/db';
import type { AiClient } from '@/services/ai/ai-client';

export async function generateWiki(agentId: string, aiClient: AiClient) {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
  const [facts, projects, wikiCount] = await Promise.all([
    prisma.profileFact.findMany({
      where: { agentId, status: 'confirmed' },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.profileProject.findMany({
      where: { agentId, status: 'confirmed' },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.profileWiki.count({ where: { agentId } })
  ]);

  const generated = await aiClient.generateWiki({
    facts: facts.map((fact) => `${fact.title}: ${fact.summary ?? ''}`),
    projects: projects.map((project) => `${project.name}: ${project.summary}`)
  });

  const wiki = await prisma.profileWiki.create({
    data: {
      userId: agent.userId,
      agentId,
      version: wikiCount + 1,
      status: 'generated',
      contentJson: JSON.stringify(generated.contentJson),
      markdown: generated.markdown
    }
  });

  await prisma.agent.update({
    where: { id: agentId },
    data: { currentWikiId: wiki.id }
  });

  return wiki;
}
