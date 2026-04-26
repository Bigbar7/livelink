import type { ExtractedKnowledge } from '@/types/domain';
import type { AiClient, CreationChatState, EvolutionProfileContext, GeneratedProfileCard, RankedRecommendation } from './ai-client';

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

const publicAgentProfilePrivacyGuidance =
  '隐私最小化：生成公开 Agent Profile 时，只把材料提取精炼为可社交展示的能力摘要、代表性亮点、连接价值和 AI 洞察；不要把简历原文或完整履历搬到公开展示字段。不得在 card、analysis、icebreakers 或公开文案中展示联系方式、手机号、邮箱、证件号、详细住址、生日、身份证明、薪资、完整教育/工作时间线、内部项目细节或任何可直接联系/定位用户的信息；如材料中出现这些内容，只能抽象为必要的能力、领域、阶段或需求。analysis 要输出基于材料的 AI 洞察，例如工作方式、优势信号、可连接机会和当前需求，不要复述私人经历清单。facts/projects 可以保留用于后续匹配的结构化依据，但 summary/evidenceText 也要避免长段照抄敏感原文，优先引用短证据或概括性证据。';

const publicAgentProfileStyleGuidance =
  '公开展示文案采用极简、极精炼、短词或短句风格。不要写成简历，不要写岗位职责、时间线、学校/公司履历、项目复盘或自我介绍长段落；不要出现具体项目内容、项目名称堆叠、简历原文近似表达或可被反向搜索的细节。面向 AI 爱好者、投资人、创业者、互联网或科技公司成员来写：让他们快速看懂这个人值得聊什么、能交换什么、可能一起探索什么，并愿意建立社交关系。headline 控制在一个清晰身份/价值短句；bio 控制在一句话；tags、skills、interests、offers、wants、icebreakers 都用短词或短句，优先写“AI 产品洞察”“增长实验”“技术商业化”“早期机会判断”这类可社交、可破冰、可合作的抽象能力或主题。';

function hasProfileItems(items: string[]) {
  return items.some((item) => item.trim());
}

function buildEvolutionMissingProfileSlots(currentProfile: EvolutionProfileContext | null) {
  if (!currentProfile) {
    return ['身份定位', '当前方向', '代表项目或经历', '擅长能力', '可提供资源', '正在寻找的人'];
  }

  const missingSlots = [];
  const hasIdentity = currentProfile.headline.trim() || currentProfile.bio.trim() || hasProfileItems(currentProfile.tags);
  const hasCurrentFocus = hasProfileItems(currentProfile.interests) || hasProfileItems(currentProfile.tags);

  if (!hasIdentity) missingSlots.push('身份定位');
  if (!hasCurrentFocus) missingSlots.push('当前方向');
  missingSlots.push('代表项目或经历');
  if (!hasProfileItems(currentProfile.skills)) missingSlots.push('擅长能力');
  if (!hasProfileItems(currentProfile.offers)) missingSlots.push('可提供资源');
  if (!hasProfileItems(currentProfile.wants)) missingSlots.push('正在寻找的人');

  return missingSlots;
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

  async chatCreation(input) {
    const conversation = input.conversation
      .map((message) => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`)
      .join('\n');

    return completeJson<CreationChatState>([
      {
        role: 'system',
        content: [
          '你是 Livelink 的首次分身创建对话助手。你的目标不是无限聊天，而是在尽量少的轮次内帮助用户生成第一版 Agent Profile。',
          '你需要判断 6 个资料槽位：identity（我是谁/身份定位）、currentFocus（现在在做什么）、projects（代表项目或经历）、skills（擅长能力）、offers（我能提供什么）、wants（我想认识谁/当前需求）。',
          '每次回复最多问 1 个主问题，不要重复追问已经出现的信息。',
          '如果用户已经提供 3 类以上有效信息，或用户已发送 3 轮消息，必须收束并建议生成第一版分身。',
          '信息不完整也可以生成第一版，后续可以继续进化。',
          '不要说“我已经保存/更新资料”。当资料足够时，明确告诉用户：现在可以点击“生成我的分身”。',
          '同时返回 draftProfile，作为页面里的“实时分身草稿”：{"identity":"一句身份定位","currentFocus":"当前方向","projects":"代表项目或经历","skills":"擅长能力","offers":"可提供价值","wants":"想认识的人或当前需求"}。draftProfile 只能填写用户明确说过或可从对话直接概括的信息，不确定的字段留空字符串，不要编造。',
          '返回 JSON：{"role":"assistant","content":"给用户看的短回复","readiness":"low|medium|ready","filledSlots":["identity"],"missingSlots":["projects"],"draftProfile":{"identity":"","currentFocus":"","projects":"","skills":"","offers":"","wants":""},"nextBestQuestion":"下一步最该补的问题","suggestedReplies":["我擅长...","我做过一个...","先直接生成"],"nextAction":"ask_more|suggest_generate"}。filledSlots 和 missingSlots 只能使用 identity、currentFocus、projects、skills、offers、wants。content 要自然、短，不要像表单。'
        ].join('')
      },
      {
        role: 'user',
        content: [
          `用户：${input.user.displayName}`,
          conversation ? `历史对话：\n${conversation}` : '',
          `用户最新消息：${input.message}`
        ]
          .filter(Boolean)
          .join('\n\n')
      }
    ]);
  },

  async chatEvolution(input) {
    const missingProfileSlots = buildEvolutionMissingProfileSlots(input.currentProfile);
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
        content: [
          '你是 Livelink 的分身进化对话助手。你的目标参考首次分身创建：不是无限聊天，而是在尽量少的轮次内帮助用户补齐或更新新版 Agent Profile 所需素材。',
          '你需要判断 6 个资料槽位：identity（我是谁/身份定位）、currentFocus（现在在做什么）、projects（代表项目或经历）、skills（擅长能力）、offers（我能提供什么）、wants（我想认识谁/当前需求）。',
          '优先引导用户补充当前分身里没有、过期或太空泛的信息；如果当前摘要已经有某类信息，不要重复追问同一类内容。',
          '每次回复最多问 1 个主问题，不要围绕同一个话题连续追问；如果用户连续两轮都在回答同一主题，要主动切到其他缺失槽位，或收束建议生成新版分身。',
          '如果用户已经提供 3 类以上有效更新信息，或用户已发送 3 轮消息，必须收束并建议用户生成新版分身。',
          '信息不完整也可以生成新版分身，后续可以继续进化。',
          '不要直接声称已保存或已更新资料。回复要自然、简洁；当资料足够时，明确告诉用户：现在可以生成新版分身。'
        ].join('')
      },
      {
        role: 'user',
        content: [
          `用户：${input.user.displayName}`,
          '当前分身摘要：',
          currentProfile,
          `当前可能缺失的信息：${missingProfileSlots.join('、')}`,
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
        content: [
          '你是 Livelink 的个人 Agent 生成器。只基于用户材料，不夸大、不编造。信息不足时，对应 tags、skills、interests、offers、wants、icebreakers 和 analysis 内的数组必须留空数组，不要补全、不要生成推测职业、不要生成虚构百分比、不要生成虚构项目或人格设定。',
          publicAgentProfilePrivacyGuidance,
          publicAgentProfileStyleGuidance,
          '一次性完成事实抽取、项目抽取、价值社交名片生成，以及个人分析页所需的结构化分析。每条 facts 元素必须包含 factType，factType 只能是 identity、skill、experience、project、topic、offer、want、achievement、link 之一。返回 JSON：{"facts":[{"factType":"identity|skill|experience|project|topic|offer|want|achievement|link","title":"...","summary":"...","evidenceText":"...","confidence":0.8}],"projects":[{"name":"...","role":"...","summary":"...","techStack":["..."],"links":["..."]}],"card":{"headline":"...","bio":"...","tags":["..."],"skills":["..."],"interests":["..."],"offers":["..."],"wants":["..."],"icebreakers":["..."],"analysis":{"recentUpdates":["..."],"careerHighlights":["..."],"domainSignals":[{"name":"...","evidence":"..."}],"persona":{"title":"...","description":"...","confidence":0.8},"needs":["..."]}}}。analysis 专门服务个人分析页：recentUpdates 只写近期变化或当前正在推进的事；careerHighlights 只写可由材料支撑的代表动作、成果或优势信号，不要罗列完整经历；domainSignals 写领域/主题并用 evidence 引用材料依据；persona 只能概括工作方式或连接风格，不要编造人格兽、星座式标签或性格结论，信心不足时 persona 使用空对象；needs 只写明确需求。card 要真实、有高级感、适合破冰社交；facts/projects 要保留可用于后续匹配的结构化信息。'
        ].join('')
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
        content: [
          '你是 Livelink 的 AI 名片生成器。生成真实、有高级感、不过度夸张的价值社交名片，并补充个人分析页所需的 analysis。只基于输入内容；信息不足时，对应 tags、skills、interests、offers、wants、icebreakers 和 analysis 内的数组必须留空数组，不要补全、不要生成推测职业、不要生成虚构百分比、不要生成虚构项目或人格设定。',
          publicAgentProfilePrivacyGuidance,
          publicAgentProfileStyleGuidance,
          '返回 JSON：{"headline":"...","bio":"...","tags":["..."],"skills":["..."],"interests":["..."],"offers":["..."],"wants":["..."],"icebreakers":["..."],"analysis":{"recentUpdates":["..."],"careerHighlights":["..."],"domainSignals":[{"name":"...","evidence":"..."}],"persona":{"title":"...","description":"...","confidence":0.8},"needs":["..."]}}。analysis 专门服务个人分析页；careerHighlights 只写代表性亮点，不写完整履历；persona 只能概括工作方式或连接风格，不要编造人格兽、星座式标签或性格结论，信心不足时 persona 使用空对象。'
        ].join('')
      },
      {
        role: 'user',
        content: input.wikiMarkdown
      }
    ]);
  }
};
