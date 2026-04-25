import type { ExtractedKnowledge } from '@/types/domain';
import type { AiClient, GeneratedProfileCard, RankedRecommendation } from './ai-client';

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

async function completeText(messages: ChatMessage[]): Promise<string> {
  const config = getAiConfig();

  if (process.env.AI_ALLOW_INSECURE_TLS === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  if (isAnthropicCompatible(config.baseUrl)) {
    return completeAnthropicText(config, messages);
  }

  if (config.wireApi === 'responses') {
    return completeResponsesText(config, messages);
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
      temperature: 0.4
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
  return content.trim();
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

async function completeResponsesText(
  config: { apiKey: string; baseUrl: string; model: string },
  messages: ChatMessage[]
): Promise<string> {
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
      input
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
  return content.trim();
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

async function completeAnthropicText(
  config: { apiKey: string; baseUrl: string; model: string },
  messages: ChatMessage[]
): Promise<string> {
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
      max_tokens: 1200,
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
  return content.trim();
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
  async rankRecommendationCandidates(input) {
    const response = await completeJson<{ recommendations: RankedRecommendation[] }>([
      {
        role: 'system',
        content:
          '你是 Livelink 的人脉推荐匹配器。只基于候选人的公开名片字段判断，不要编造经历、身份、成绩或私下意图。根据用户想认识的人和候选名片，返回 JSON：{"recommendations":[{"profileId":"...","score":0,"reason":"...","topic":"..."}]}。score 为 0-100 的整数；只返回值得推荐的人；reason 必须引用候选资料中的具体能力、需求、标签或简介；topic 是一个自然的破冰聊天切入点。'
      },
      {
        role: 'user',
        content: JSON.stringify({
          seeker: input.seeker,
          candidates: input.candidates
        })
      }
    ]);

    return response.recommendations;
  },

  async chatEvolution(input) {
    const currentProfile = input.currentProfile
      ? [
          `定位：${input.currentProfile.headline}`,
          `简介：${input.currentProfile.bio}`,
          `标签：${input.currentProfile.tags.join('、')}`,
          `能力：${input.currentProfile.skills.join('、')}`,
          `兴趣：${input.currentProfile.interests.join('、')}`,
          `可提供：${input.currentProfile.offers.join('、')}`,
          `正在寻找：${input.currentProfile.wants.join('、')}`
        ].join('\n')
      : '还没有可用的当前分身摘要。';
    const conversation = input.conversation
      .map((message) => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`)
      .join('\n');

    const content = await completeText([
      {
        role: 'system',
        content:
          '你是 Livelink 的分身进化对话助手。你的任务是和用户进行真实对话，帮助用户澄清最近变化，并为后续 Agent Profile 提炼留下可验证素材。不要直接声称已保存或已更新资料；每次回复要自然、简洁，优先追问项目阶段、用户角色、能力变化、可提供资源、正在寻找的人。'
      },
      {
        role: 'user',
        content: [
          `用户：${input.user.displayName}`,
          '当前分身摘要：',
          currentProfile,
          conversation ? `历史对话：\n${conversation}` : '',
          `用户最新消息：${input.message}`
        ]
          .filter(Boolean)
          .join('\n\n')
      }
    ]);

    return { role: 'assistant', content };
  },

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
          '你是 Livelink 的个人 Agent 生成器。只基于用户材料，不夸大、不编造。信息不足时，对应 tags、skills、interests、offers、wants、icebreakers 和 analysis 内的数组必须留空数组，不要补全、不要生成推测职业、不要生成虚构百分比、不要生成虚构项目或人格设定。一次性完成事实抽取、项目抽取、价值社交名片生成，以及个人分析页所需的结构化分析。每条 facts 元素必须包含 factType，factType 只能是 identity、skill、experience、project、topic、offer、want、achievement、link 之一。返回 JSON：{"facts":[{"factType":"identity|skill|experience|project|topic|offer|want|achievement|link","title":"...","summary":"...","evidenceText":"...","confidence":0.8}],"projects":[{"name":"...","role":"...","summary":"...","techStack":["..."],"links":["..."]}],"card":{"headline":"...","bio":"...","tags":["..."],"skills":["..."],"interests":["..."],"offers":["..."],"wants":["..."],"icebreakers":["..."],"analysis":{"recentUpdates":["..."],"careerHighlights":["..."],"domainSignals":[{"name":"...","evidence":"..."}],"persona":{"title":"...","description":"...","confidence":0.8},"needs":["..."]}}}。analysis 专门服务个人分析页：recentUpdates 只写近期变化或当前正在推进的事；careerHighlights 只写可由材料支撑的经历、成果或代表动作；domainSignals 写领域/主题并用 evidence 引用材料依据；persona 只能概括工作方式或连接风格，不要编造人格兽、星座式标签或性格结论，信心不足时 persona 使用空对象；needs 只写明确需求。card 要真实、有高级感、适合破冰社交；facts/projects 要保留可用于后续匹配的结构化信息。'
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
          '你是 Livelink 的 AI 名片生成器。生成真实、有高级感、不过度夸张的价值社交名片，并补充个人分析页所需的 analysis。只基于输入内容；信息不足时，对应 tags、skills、interests、offers、wants、icebreakers 和 analysis 内的数组必须留空数组，不要补全、不要生成推测职业、不要生成虚构百分比、不要生成虚构项目或人格设定。返回 JSON：{"headline":"...","bio":"...","tags":["..."],"skills":["..."],"interests":["..."],"offers":["..."],"wants":["..."],"icebreakers":["..."],"analysis":{"recentUpdates":["..."],"careerHighlights":["..."],"domainSignals":[{"name":"...","evidence":"..."}],"persona":{"title":"...","description":"...","confidence":0.8},"needs":["..."]}}。analysis 专门服务个人分析页；persona 只能概括工作方式或连接风格，不要编造人格兽、星座式标签或性格结论，信心不足时 persona 使用空对象。'
      },
      {
        role: 'user',
        content: input.wikiMarkdown
      }
    ]);
  }
};
