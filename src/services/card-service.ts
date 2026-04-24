import { prisma } from '@/lib/db';
import { slugifyName } from '@/lib/slug';
import type { AiClient } from '@/services/ai/ai-client';

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
      templateKey: 'default'
    }
  });
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
    where: { slug, status: 'published' }
  });
}
