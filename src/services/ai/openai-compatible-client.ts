import type { ExtractedKnowledge } from '@/types/domain';
import type { AiClient, GeneratedProfileCard } from './ai-client';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type AnthropicResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

type ResponsesApiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AI_API_KEY');
  }

  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    wireApi: process.env.AI_WIRE_API || 'chat'
  };
}

function isAnthropicCompatible(baseUrl: string) {
  return baseUrl.includes('/anthropic') || baseUrl.includes('anthropic');
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);

  return text;
}

async function completeJson<T>(messages: ChatMessage[]): Promise<T> {
  const config = getAiConfig();

  if (process.env.AI_ALLOW_INSECURE_TLS === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (isAnthropicCompatible(config.baseUrl)) {
    return completeAnthropicJson<T>(config, messages);
  }

  if (config.wireApi === 'responses') {
    return completeResponsesJson<T>(config, messages);
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as ChatCompletionResponse;
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI response missing content');
  }

  return JSON.parse(extractJson(content)) as T;
}

async function completeResponsesJson<T>(
  config: { apiKey: string; baseUrl: string; model: string },
  messages: ChatMessage[]
): Promise<T> {
  const input = messages.map((message) => ({
    role: message.role === 'system' ? 'developer' : 'user',
    content: message.content
  }));

  const response = await fetch(`${config.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      input,
      text: {
        format: { type: 'json_object' }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as ResponsesApiResponse;
  const content = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;
  if (!content) {
    throw new Error('AI response missing content');
  }

  return JSON.parse(extractJson(content)) as T;
}

async function completeAnthropicJson<T>(
  config: { apiKey: string; baseUrl: string; model: string },
  messages: ChatMessage[]
): Promise<T> {
  const system = messages.find((message) => message.role === 'system')?.content;
  const userMessages = messages
    .filter((message) => message.role === 'user')
    .map((message) => ({ role: 'user', content: message.content }));

  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system,
      messages: userMessages
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as AnthropicResponse;
  const content = body.content?.find((item) => item.type === 'text')?.text ?? body.content?.[0]?.text;
  if (!content) {
    throw new Error('AI response missing content');
  }

  return JSON.parse(extractJson(content)) as T;
}

export const openAiCompatibleClient: AiClient = {
  async extractKnowledge(input): Promise<ExtractedKnowledge> {
    return completeJson<ExtractedKnowledge>([
      {
        role: 'system',
        content:
          '你是 Livelink 的个人 Agent 信息抽取器。只基于用户材料抽取事实，不夸大。返回 JSON：{"facts":[{"factType":"identity|skill|experience|project|topic|offer|want|achievement|link","title":"...","summary":"...","evidenceText":"...","confidence":0.8}],"projects":[{"name":"...","role":"...","summary":"...","techStack":["..."],"links":["..."]}]}'
      },
      {
        role: 'user',
        content: `标题：${input.title ?? '用户资料'}\n\n材料：\n${input.text}`
      }
    ]);
  },

  async generateWiki(input) {
    return completeJson<{ contentJson: unknown; markdown: string }>([
      {
        role: 'system',
        content:
          '你是 Livelink 的个人 Wiki 生成器。基于已确认事实和项目生成结构化个人 Wiki。返回 JSON：{"contentJson":{"overview":{"headline":"...","summary":"...","highlights":["..."]},"projects":[],"skills":[],"topics":[],"offers":[],"wants":[]},"markdown":"..."}'
      },
      {
        role: 'user',
        content: `事实：\n${input.facts.join('\n')}\n\n项目：\n${input.projects.join('\n')}`
      }
    ]);
  },

  async generateProfileDraft(input) {
    return completeJson<ExtractedKnowledge & { card: GeneratedProfileCard }>([
      {
        role: 'system',
        content:
          '你是 Livelink 的个人 Agent 生成器。只基于用户材料，不夸大、不编造。一次性完成事实抽取、项目抽取和价值社交名片生成。返回 JSON：{"facts":[{"factType":"identity|skill|experience|project|topic|offer|want|achievement|link","title":"...","summary":"...","evidenceText":"...","confidence":0.8}],"projects":[{"name":"...","role":"...","summary":"...","techStack":["..."],"links":["..."]}],"card":{"headline":"...","bio":"...","tags":["..."],"skills":["..."],"interests":["..."],"offers":["..."],"wants":["..."],"icebreakers":["..."]}}。card 要真实、有高级感、适合破冰社交；facts/projects 要保留可用于后续匹配的结构化信息。'
      },
      {
        role: 'user',
        content: `标题：${input.title ?? '用户资料'}\n\n材料：\n${input.text}`
      }
    ]);
  },

  async generateCard(input) {
    return completeJson<GeneratedProfileCard>([
      {
        role: 'system',
        content:
          '你是 Livelink 的 AI 名片生成器。生成真实、有高级感、不过度夸张的价值社交名片。返回 JSON：{"headline":"...","bio":"...","tags":["..."],"skills":["..."],"interests":["..."],"offers":["..."],"wants":["..."],"icebreakers":["..."]}'
      },
      {
        role: 'user',
        content: input.wikiMarkdown
      }
    ]);
  }
};
