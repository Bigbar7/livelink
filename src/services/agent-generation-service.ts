import type { AiClient } from '@/services/ai/ai-client';
import { createAgent } from '@/services/agent-service';
import { generateCardFromWiki, publishCard } from '@/services/card-service';
import { confirmAgentKnowledge, extractKnowledgeFromSource } from '@/services/knowledge-service';
import { addSourceDocument } from '@/services/source-service';
import { generateWiki } from '@/services/wiki-service';

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

function inferSourceType(url: string) {
  if (url.includes('github.com')) return 'github';
  if (url.includes('gitee.com')) return 'gitee';
  if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
  if (url.includes('bilibili.com')) return 'article';
  return 'other';
}

export async function generateAgentProfile(input: GenerateAgentProfileInput, aiClient: AiClient) {
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

  for (const link of input.links ?? []) {
    if (!link.url.trim()) continue;
    sources.push(
      await addSourceDocument({
        userId: user.id,
        agentId: agent.id,
        sourceKind: 'link',
        sourceType: inferSourceType(link.url),
        url: link.url,
        title: link.url,
        userNote: link.note ?? `公开链接：${link.url}`
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

  const extracted = [];
  for (const source of sources) {
    extracted.push(await extractKnowledgeFromSource(source.id, aiClient));
  }

  await confirmAgentKnowledge(agent.id);
  const wiki = await generateWiki(agent.id, aiClient);
  const draftCard = await generateCardFromWiki(wiki.id, aiClient);
  const profile = await publishCard(draftCard.id);

  return {
    user,
    agent,
    sources,
    extracted,
    wiki,
    profile
  };
}
