import { prisma } from '@/lib/db';
import type { AiClient } from '@/services/ai/ai-client';

export async function extractKnowledgeFromSource(sourceId: string, aiClient: AiClient) {
  const source = await prisma.sourceDocument.findUniqueOrThrow({
    where: { id: sourceId }
  });

  const existingFacts = await prisma.profileFact.findMany({
    where: { sourceDocumentId: source.id },
    orderBy: { createdAt: 'asc' }
  });

  if (source.extractionStatus === 'extracted' && existingFacts.length > 0) {
    const projects = await prisma.profileProject.findMany({
      where: {
        agentId: source.agentId,
        sourceDocumentIds: { contains: source.id }
      },
      orderBy: { createdAt: 'asc' }
    });

    return { facts: existingFacts, projects };
  }

  const text = [source.cleanedText, source.rawText, source.userNote].filter(Boolean).join('\n\n');
  const extracted = await aiClient.extractKnowledge({
    text,
    title: source.title ?? undefined
  });

  return prisma.$transaction(async (tx) => {
    const facts = await Promise.all(
      extracted.facts.map((fact) =>
        tx.profileFact.create({
          data: {
            userId: source.userId,
            agentId: source.agentId,
            sourceDocumentId: source.id,
            factType: fact.factType,
            title: fact.title,
            summary: fact.summary,
            evidenceText: fact.evidenceText,
            sourceUrl: source.url,
            confidence: fact.confidence,
            status: 'draft'
          }
        })
      )
    );

    const projects = await Promise.all(
      extracted.projects.map((project) =>
        tx.profileProject.create({
          data: {
            userId: source.userId,
            agentId: source.agentId,
            name: project.name,
            role: project.role,
            summary: project.summary,
            techStackJson: JSON.stringify(project.techStack),
            linksJson: JSON.stringify(project.links),
            sourceDocumentIds: JSON.stringify([source.id]),
            status: 'draft'
          }
        })
      )
    );

    await tx.sourceDocument.update({
      where: { id: source.id },
      data: { extractionStatus: 'extracted' }
    });

    return { facts, projects };
  });
}

export async function confirmFact(factId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.profileFact.findUniqueOrThrow({
      where: { id: factId }
    });

    const transition = await tx.profileFact.updateMany({
      where: { id: factId, status: { not: 'confirmed' } },
      data: { status: 'confirmed' }
    });

    if (transition.count === 1) {
      await tx.agent.update({
        where: { id: existing.agentId },
        data: { understandingScore: { increment: 8 } }
      });
    }

    return tx.profileFact.findUniqueOrThrow({
      where: { id: factId }
    });
  });
}

export async function confirmAgentKnowledge(agentId: string) {
  const [facts, projects] = await prisma.$transaction([
    prisma.profileFact.updateMany({
      where: { agentId, status: 'draft' },
      data: { status: 'confirmed' }
    }),
    prisma.profileProject.updateMany({
      where: { agentId, status: 'draft' },
      data: { status: 'confirmed' }
    })
  ]);

  return { factsConfirmed: facts.count, projectsConfirmed: projects.count };
}
