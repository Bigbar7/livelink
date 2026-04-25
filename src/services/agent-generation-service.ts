import type { AiClient } from '@/services/ai/ai-client';
import { createAgent } from '@/services/agent-service';
import { generatePublishedCardFromKnowledge, publishGeneratedCard } from '@/services/card-service';
import { confirmAgentKnowledge, extractKnowledgeFromSource } from '@/services/knowledge-service';
import { addSourceDocument } from '@/services/source-service';
import { importGithubProfileLink, type LinkImportResult } from '@/services/github-import-service';
import { prisma } from '@/lib/db';

type LinkInput = {
  url: string;
  note?: string;
};

export type GenerateAgentProfileInput = {
  displayName: string;
  role?: string;
  city?: string;
  text?: string;
  fileName?: string;
  fileText?: string;
  links?: LinkInput[];
};

type GenerateAgentProfileOptions = {
  importGithubProfile?: (link: LinkInput) => Promise<LinkImportResult>;
};

type ConversationMessage = {
  role: 'assistant' | 'user';
  content: string;
};

export type EvolveAgentProfileInput = {
  userId: string;
  agentId: string;
  text?: string;
  conversation?: ConversationMessage[];
};

export type EvolutionChatInput = EvolveAgentProfileInput & {
  message: string;
};

function parseJsonList(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function inferSourceType(url: string) {
  if (url.includes('github.com')) return 'github';
  if (url.includes('gitee.com')) return 'gitee';
  if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
  if (url.includes('bilibili.com')) return 'article';
  return 'other';
}

function sourceText(source: Awaited<ReturnType<typeof addSourceDocument>>) {
  return [`标题：${source.title ?? '用户资料'}`, source.rawText, source.userNote].filter(Boolean).join('\n\n');
}

function mergeUserNote(importedNote: string | undefined, linkNote: string | undefined) {
  return [importedNote, linkNote ? `用户补充：${linkNote}` : ''].filter(Boolean).join('\n');
}

async function importLinkSource(link: LinkInput, options: GenerateAgentProfileOptions) {
  const sourceType = inferSourceType(link.url);

  if (sourceType !== 'github') {
    return {
      sourceKind: 'link' as const,
      sourceType,
      url: link.url,
      title: link.url,
      userNote: link.note ?? `公开链接：${link.url}`
    };
  }

  const importGithubProfile = options.importGithubProfile ?? ((githubLink: LinkInput) => importGithubProfileLink(githubLink.url));
  const imported = await importGithubProfile(link);

  return {
    sourceKind: 'link' as const,
    sourceType: imported.sourceType,
    url: imported.url,
    title: imported.title,
    description: imported.description,
    rawText: imported.rawText,
    cleanedText: imported.cleanedText,
    fetchStatus: imported.fetchStatus,
    userNote: mergeUserNote(imported.userNote, link.note),
    errorReason: imported.errorReason
  };
}

function conversationText(messages: ConversationMessage[] = []) {
  return messages.map((message) => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`).join('\n');
}

export async function chatAgentEvolution(input: EvolutionChatInput, aiClient: AiClient) {
  if (!aiClient.chatEvolution) {
    throw new Error('Evolution chat is unavailable');
  }

  const agent = await prisma.agent.findFirstOrThrow({
    where: {
      id: input.agentId,
      userId: input.userId
    },
    include: {
      user: true,
      cards: {
        orderBy: { updatedAt: 'desc' },
        take: 1
      }
    }
  });
  const latestProfile = agent.cards[0];

  return aiClient.chatEvolution({
    message: input.message,
    conversation: input.conversation ?? [],
    user: { displayName: agent.user.displayName },
    currentProfile: latestProfile
      ? {
          headline: latestProfile.headline,
          bio: latestProfile.bio,
          tags: parseJsonList(latestProfile.tagsJson),
          skills: parseJsonList(latestProfile.skillsJson),
          interests: parseJsonList(latestProfile.interestsJson),
          offers: parseJsonList(latestProfile.offersJson),
          wants: parseJsonList(latestProfile.wantsJson)
        }
      : null
  });
}

async function persistExtractedKnowledge(
  source: Awaited<ReturnType<typeof addSourceDocument>>,
  extracted: Awaited<ReturnType<NonNullable<AiClient['generateProfileDraft']>>>
) {
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
            status: 'confirmed'
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
            status: 'confirmed'
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

export async function generateAgentProfile(input: GenerateAgentProfileInput, aiClient: AiClient, options: GenerateAgentProfileOptions = {}) {
  const { user, agent } = await createAgent({
    displayName: input.displayName,
    role: input.role,
    city: input.city
  });

  const sources = [];

  if (input.text?.trim()) {
    sources.push(
      await addSourceDocument({
        userId: user.id,
        agentId: agent.id,
        sourceKind: 'manual',
        sourceType: 'manual_text',
        title: '自我介绍',
        rawText: input.text
      })
    );
  }

  if (input.fileName || input.fileText?.trim()) {
    sources.push(
      await addSourceDocument({
        userId: user.id,
        agentId: agent.id,
        sourceKind: 'resume',
        sourceType: 'resume',
        title: input.fileName ?? '上传文件',
        rawText: input.fileText ?? `用户上传了文件：${input.fileName}`
      })
    );
  }

  const linkSources = await Promise.all((input.links ?? []).filter((link) => link.url.trim()).map((link) => importLinkSource(link, options)));
  for (const linkSource of linkSources) {
    sources.push(
      await addSourceDocument({
        userId: user.id,
        agentId: agent.id,
        ...linkSource
      })
    );
  }

  if (sources.length === 0) {
    sources.push(
      await addSourceDocument({
        userId: user.id,
        agentId: agent.id,
        sourceKind: 'manual',
        sourceType: 'manual_text',
        title: '基础资料',
        rawText: `${input.displayName} 正在生成自己的数字分身。`
      })
    );
  }

  if (aiClient.generateProfileDraft) {
    const primarySource = sources[0];
    const sourcePayload = sources.map(sourceText).join('\n\n---\n\n');
    const draft = await aiClient.generateProfileDraft({
      title: primarySource.title ?? undefined,
      text: sourcePayload
    });
    const extracted = [await persistExtractedKnowledge(primarySource, draft)];
    const profile = await publishGeneratedCard(agent.id, draft.card);

    return {
      user,
      agent,
      sources,
      extracted,
      profile
    };
  }

  const extracted = [];
  for (const source of sources) {
    extracted.push(await extractKnowledgeFromSource(source.id, aiClient));
  }

  await confirmAgentKnowledge(agent.id);
  const profile = await generatePublishedCardFromKnowledge(agent.id, aiClient);

  return {
    user,
    agent,
    sources,
    extracted,
    profile
  };
}

export async function evolveAgentProfile(input: EvolveAgentProfileInput, aiClient: AiClient) {
  const agent = await prisma.agent.findFirstOrThrow({
    where: {
      id: input.agentId,
      userId: input.userId
    },
    include: {
      user: true,
      cards: {
        orderBy: { updatedAt: 'desc' },
        take: 1
      }
    }
  });

  const latestProfile = agent.cards[0];
  const messageText = conversationText(input.conversation);
  const rawText = [
    latestProfile
      ? [
          '当前分身摘要：',
          `定位：${latestProfile.headline}`,
          `简介：${latestProfile.bio}`,
          `标签：${latestProfile.tagsJson}`,
          `能力：${latestProfile.skillsJson}`,
          `需求：${latestProfile.wantsJson}`
        ].join('\n')
      : '',
    messageText ? `本轮 AI 对话：\n${messageText}` : '',
    input.text?.trim() ? `用户补充：\n${input.text.trim()}` : ''
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');

  const source = await addSourceDocument({
    userId: agent.userId,
    agentId: agent.id,
    sourceKind: 'evolution',
    sourceType: 'ai_conversation',
    title: '分身进化对话',
    rawText: rawText || `${agent.user.displayName} 正在进化自己的数字分身。`
  });

  if (aiClient.generateProfileDraft) {
    const draft = await aiClient.generateProfileDraft({
      title: '分身进化对话',
      text: sourceText(source)
    });
    const extracted = [await persistExtractedKnowledge(source, draft)];
    const profile = await publishGeneratedCard(agent.id, draft.card);

    return {
      user: agent.user,
      agent,
      sources: [source],
      extracted,
      profile
    };
  }

  const extracted = [await extractKnowledgeFromSource(source.id, aiClient)];
  await confirmAgentKnowledge(agent.id);
  const profile = await generatePublishedCardFromKnowledge(agent.id, aiClient);

  return {
    user: agent.user,
    agent,
    sources: [source],
    extracted,
    profile
  };
}
