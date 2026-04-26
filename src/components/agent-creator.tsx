'use client';

import { ChangeEvent, DragEvent, ReactNode, TouchEvent, useMemo, useRef, useState, useEffect } from 'react';

type FlowStep = 'home' | 'input' | 'generating' | 'card' | 'edit' | 'share' | 'find' | 'searching' | 'matches' | 'candidate' | 'icebreaker';
type InputMode = 'text' | 'file' | 'link' | 'chat';
type EditTab = 'basic' | 'profile' | 'goals';

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: { message: string };
};

type AgentProfile = {
  id: string;
  userId: string;
  agentId: string;
  user?: {
    displayName: string;
    role?: string | null;
    city?: string | null;
  };
  slug: string;
  headline: string;
  bio: string;
  tagsJson: string;
  skillsJson: string;
  interestsJson: string;
  offersJson: string;
  wantsJson: string;
  icebreakersJson: string;
  analysisJson?: string;
};

type ProfileAnalysis = {
  recentUpdates: string[];
  careerHighlights: string[];
  domainSignals: Array<{
    name: string;
    evidence?: string;
  }>;
  persona: {
    title?: string;
    description?: string;
    confidence?: number;
  };
  needs: string[];
};

type GeneratedAgentResponse = {
  user: { id: string; displayName: string };
  agent: { id: string; name: string };
  profile: AgentProfile;
};

type CurrentSessionResponse = {
  user: { id: string; displayName: string };
  agent: { id: string; name: string } | null;
  profile: AgentProfile | null;
} | null;

type ResetPersonalInfoResponse = {
  user: { id: string; displayName: string };
  agent: { id: string; name: string };
  contact: string;
};

type UpdateProfileResponse = GeneratedAgentResponse & {
  contact: string;
};

type ParsedDocumentResponse = {
  fileName: string;
  fileType: string;
  text: string;
};

type EvolutionChatResponse = ConversationMessage;
type CreationProfileSlot = 'identity' | 'currentFocus' | 'projects' | 'skills' | 'offers' | 'wants';
type CreationDraftProfile = Partial<Record<CreationProfileSlot, string>>;

type CreationChatResponse = ConversationMessage & {
  readiness: 'low' | 'medium' | 'ready';
  filledSlots: CreationProfileSlot[];
  missingSlots: CreationProfileSlot[];
  nextBestQuestion: string;
  suggestedReplies: string[];
  nextAction: 'ask_more' | 'suggest_generate';
  draftProfile: CreationDraftProfile;
};

type RecommendationItem = {
  profile: AgentProfile;
  score: number;
  reason: string;
  topic?: string;
  contactHandle?: string;
};

type CandidateView = {
  id: string;
  userId: string;
  name: string;
  role: string;
  avatar: string;
  tags: string[];
  score: number;
  reason: string;
  offer: string;
  topic: string;
  contactHandle: string;
};

type ConversationMessage = {
  role: 'assistant' | 'user';
  content: string;
};

const promptSuggestions = ['我是谁', '现在做什么', '做过什么项目', '我能提供', '我想找谁'];

const findPromptTemplate = `我想认识：
对方是谁：
我想聊什么：
我能提供什么：
希望下一步：`;

const creationSlotLabels: Record<CreationProfileSlot, string> = {
  identity: '我是谁',
  currentFocus: '现在做什么',
  projects: '代表项目',
  skills: '擅长能力',
  offers: '我能提供',
  wants: '我想找谁'
};

const agentTraceMessages = [
  {
    from: '我的 Agent',
    to: '候选 Agent',
    title: '发起探询',
    text: '我正在根据主人的需求寻找高匹配数字分身，先确认候选人的近期方向和开放合作状态。'
  },
  {
    from: '候选 Agent',
    to: '我的 Agent',
    title: '返回画像摘要',
    text: '候选分身返回公开资料中的能力、需求、领域标签和可聊切入点，用于判断是否值得推荐。'
  },
  {
    from: '我的 Agent',
    to: '候选 Agent',
    title: '交换互补点',
    text: '我方提供当前需求和可交换价值，比较双方是否存在能力互补、资源互补或共同语境。'
  },
  {
    from: '候选 Agent',
    to: '我的 Agent',
    title: '形成推荐结论',
    text: '双方资料存在连接机会，但这是模拟过程，不是实时真实 Agent 对话记录。'
  }
];

const internetCandidateSeeds: CandidateView[] = [
  {
    id: 'web-lin-che-ai-education',
    userId: 'web-lin-che-ai-education',
    name: '林澈',
    role: '模拟公开信息：AI 教育创业者 / 学习产品设计',
    avatar: '林',
    tags: ['AI 教育', '学习产品', '知识图谱'],
    score: 86,
    reason: '模拟公开信息显示，林澈持续分享 AI Tutor、知识图谱和学习路径设计，与你想找 AI 教育落地伙伴的需求高度相关。',
    offer: '公开资料摘要：关注 AI 教育产品从课程内容走向个性化学习系统，曾公开讨论学习反馈闭环、题库生成和教师工作流。',
    topic: '邀请 TA 生成 Agent 后，先聊 AI 教育产品如何验证真实学习效果。',
    contactHandle: ''
  },
  {
    id: 'web-zhou-yining-open-source',
    userId: 'web-zhou-yining-open-source',
    name: '周以宁',
    role: '模拟公开信息：开源社区运营 / 开发者关系',
    avatar: '周',
    tags: ['开源社区', '开发者关系', '技术传播'],
    score: 81,
    reason: '模拟公开信息显示，周以宁长期关注开源社区增长、开发者活动和技术内容传播，适合被邀请进来形成更完整的 Agent 画像。',
    offer: '公开资料摘要：常分享开源项目冷启动、贡献者激励、技术文章分发和社区活动复盘。',
    topic: '邀请 TA 生成 Agent 后，可以从开源社区如何让用户主动贡献切入。',
    contactHandle: ''
  },
  {
    id: 'web-chen-muyuan-global-growth',
    userId: 'web-chen-muyuan-global-growth',
    name: '陈牧远',
    role: '模拟公开信息：出海增长顾问 / 内容渠道策略',
    avatar: '陈',
    tags: ['出海增长', '内容渠道', '商业化'],
    score: 78,
    reason: '模拟公开信息显示，陈牧远围绕海外获客、内容 SEO 和 SaaS 商业化输出较多，适合推荐给正在寻找增长与商业化经验的人。',
    offer: '公开资料摘要：关注英文内容矩阵、Product Hunt 冷启动、独立站转化和 B2B SaaS 早期销售。',
    topic: '邀请 TA 生成 Agent 后，围绕出海产品第一批高质量线索怎么来展开。',
    contactHandle: ''
  },
  {
    id: 'web-xu-zhiwei-enterprise-ai',
    userId: 'web-xu-zhiwei-enterprise-ai',
    name: '许知微',
    role: '模拟公开信息：企业 AI 转型顾问 / 组织效能',
    avatar: '许',
    tags: ['企业 AI', '组织效能', 'AI 转型'],
    score: 74,
    reason: '模拟公开信息显示，许知微关注企业 AI 落地、组织流程重构和效率工具 adoption，适合邀请来补全企业侧视角。',
    offer: '公开资料摘要：常讨论企业知识库、AI 工作流、组织协同和管理者如何衡量 AI 投入回报。',
    topic: '邀请 TA 生成 Agent 后，可以先聊企业 AI 落地最大的阻力是什么。',
    contactHandle: ''
  }
];

function isInternetCandidate(candidate: CandidateView) {
  return candidate.id.startsWith('web-');
}

function buildInternetCandidates(profileNeeds: string[], activeFindQuery: string) {
  const discoveryText = [...profileNeeds, activeFindQuery].join(' ').toLowerCase();
  const rankedSeeds = internetCandidateSeeds.filter((candidate) =>
    candidate.tags.some((tag) => discoveryText.includes(tag.toLowerCase()))
  );

  return (rankedSeeds.length > 0 ? rankedSeeds : internetCandidateSeeds).slice(0, 2);
}

function parseJsonList(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseProfileAnalysis(value?: string): ProfileAnalysis {
  const emptyAnalysis: ProfileAnalysis = {
    recentUpdates: [],
    careerHighlights: [],
    domainSignals: [],
    persona: {},
    needs: []
  };

  if (!value) return emptyAnalysis;

  try {
    const parsed = JSON.parse(value) as Partial<ProfileAnalysis>;
    const persona = parsed.persona && typeof parsed.persona === 'object' ? parsed.persona : {};

    return {
      recentUpdates: Array.isArray(parsed.recentUpdates) ? parsed.recentUpdates.filter((item): item is string => typeof item === 'string') : [],
      careerHighlights: Array.isArray(parsed.careerHighlights) ? parsed.careerHighlights.filter((item): item is string => typeof item === 'string') : [],
      domainSignals: Array.isArray(parsed.domainSignals)
        ? parsed.domainSignals
            .filter((item): item is { name: string; evidence?: string } => Boolean(item) && typeof item === 'object' && typeof item.name === 'string')
            .map((item) => ({
              name: item.name,
              evidence: typeof item.evidence === 'string' ? item.evidence : undefined
            }))
        : [],
      persona: {
        title: typeof persona.title === 'string' ? persona.title : undefined,
        description: typeof persona.description === 'string' ? persona.description : undefined,
        confidence: typeof persona.confidence === 'number' ? persona.confidence : undefined
      },
      needs: Array.isArray(parsed.needs) ? parsed.needs.filter((item): item is string => typeof item === 'string') : []
    };
  } catch {
    return emptyAnalysis;
  }
}

function firstLetter(value: string) {
  return (value.trim()[0] || 'A').toUpperCase();
}

function splitEditableList(value: string) {
  return value
    .split(/[\n，,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileDisplayName(profile: AgentProfile) {
  return profile.user?.displayName || profile.headline.split('·')[0]?.trim() || profile.headline;
}

function profileToCandidate(item: RecommendationItem): CandidateView {
  const tags = parseJsonList(item.profile.tagsJson);
  const offers = parseJsonList(item.profile.offersJson);
  const icebreakers = parseJsonList(item.profile.icebreakersJson);
  const name = profileDisplayName(item.profile);

  return {
    id: item.profile.id,
    userId: item.profile.userId,
    name,
    role: item.profile.headline,
    avatar: firstLetter(name),
    tags,
    score: Math.max(item.score, 60),
    reason: item.reason,
    offer: offers.join('、') || item.profile.bio,
    topic: item.topic || icebreakers[0] || '围绕彼此的能力、需求和合作场景展开交流',
    contactHandle: item.contactHandle?.trim() || ''
  };
}

async function readApi<T>(url: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(url, {
    ...init,
    headers: isFormData
      ? init?.headers
      : {
          'Content-Type': 'application/json',
          ...init?.headers
        }
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`接口返回异常：${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.error?.message || 'Request failed');
  }
  return body.data;
}

export function AgentCreator() {
  const [step, setStep] = useState<FlowStep>('home');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [contact, setContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [mode, setMode] = useState<InputMode>('chat');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [fileParsingStatus, setFileParsingStatus] = useState('');
  const [linkText, setLinkText] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [creationConversation, setCreationConversation] = useState<ConversationMessage[]>([
    { role: 'assistant', content: '如果你不知道怎么写，我可以问你几个问题，再整理成生成资料。' }
  ]);
  const [creationChatState, setCreationChatState] = useState<CreationChatResponse | null>(null);
  const [isCreationChatting, setIsCreationChatting] = useState(false);
  const [showCreationDraft, setShowCreationDraft] = useState(true);
  const [isCreationWorkspaceOpen, setIsCreationWorkspaceOpen] = useState(false);
  const [evolutionDraft, setEvolutionDraft] = useState('');
  const [evolutionFileName, setEvolutionFileName] = useState('');
  const [evolutionFileText, setEvolutionFileText] = useState('');
  const [evolutionFileStatus, setEvolutionFileStatus] = useState('');
  const [evolutionConversation, setEvolutionConversation] = useState<ConversationMessage[]>([]);
  const [isEvolutionChatting, setIsEvolutionChatting] = useState(false);
  const [generated, setGenerated] = useState<GeneratedAgentResponse | null>(null);
  const [residentProfiles, setResidentProfiles] = useState<AgentProfile[]>([]);
  const [recommendations, setRecommendations] = useState<CandidateView[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateView | null>(null);
  const [recordedConnectionIds, setRecordedConnectionIds] = useState<string[]>([]);
  const [connectionFeedback, setConnectionFeedback] = useState('');
  const [findQuery, setFindQuery] = useState('');
  const [error, setError] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [publicOrigin, setPublicOrigin] = useState('');
  const [isResettingPersonalInfo, setIsResettingPersonalInfo] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>('basic');
  const [editNickname, setEditNickname] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editHeadline, setEditHeadline] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagDraft, setEditTagDraft] = useState('');
  const [draggedEditTagIndex, setDraggedEditTagIndex] = useState<number | null>(null);
  const [editRecentUpdatesText, setEditRecentUpdatesText] = useState('');
  const [editLinkStyleTitle, setEditLinkStyleTitle] = useState('');
  const [editLinkStyleDescription, setEditLinkStyleDescription] = useState('');
  const [editHighlightsText, setEditHighlightsText] = useState('');
  const [editDomainsText, setEditDomainsText] = useState('');
  const [editOffersText, setEditOffersText] = useState('');
  const [editWantsText, setEditWantsText] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const evolutionThreadEndRef = useRef<HTMLDivElement | null>(null);
  const candidateContentRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const profile = generated?.profile;
  const tags = parseJsonList(profile?.tagsJson);
  const skills = parseJsonList(profile?.skillsJson);
  const interests = parseJsonList(profile?.interestsJson);
  const offers = parseJsonList(profile?.offersJson);
  const wants = parseJsonList(profile?.wantsJson);
  const icebreakers = parseJsonList(profile?.icebreakersJson);
  const analysis = parseProfileAnalysis(profile?.analysisJson);
  const profileHighlights = (analysis.careerHighlights.length > 0 ? analysis.careerHighlights : [...skills, ...offers]).filter(Boolean).slice(0, 4);
  const fallbackDomains = [...tags, ...interests].filter(Boolean).slice(0, 4);
  const profileDomainSignals =
    analysis.domainSignals.length > 0
      ? analysis.domainSignals.slice(0, 4)
      : fallbackDomains.map((domain) => ({ name: domain, evidence: '已提取' }));
  const profileDomains = profileDomainSignals.map((domain) => domain.name);
  const recentUpdates = analysis.recentUpdates.length > 0 ? analysis.recentUpdates.slice(0, 2) : [profile?.bio].filter((item): item is string => Boolean(item));
  const profileNeeds = analysis.needs.length > 0 ? analysis.needs : wants;
  const persona = analysis.persona;
  const hasPersonaSignals = Boolean(persona.title || persona.description || tags[0] || icebreakers[0]);
  const contactHandle = contact.trim() || (nickname.trim() ? `@${nickname.trim()}` : `ID ${profile?.slug ?? 'agent'}`);
  const publicProfilePath = profile ? `/u/${profile.slug}` : '';
  const publicProfileUrl = publicProfilePath ? `${publicOrigin}${publicProfilePath}` : '';
  const sparseProfileHint = '资料还不够，继续补充后再生成';
  const hasGenerated = Boolean(generated);
  const creationChatCompleteness = creationChatState ? `${creationChatState.filledSlots.length}/6` : '0/6';
  const creationMissingLabels = creationChatState?.missingSlots.map((slot) => creationSlotLabels[slot]) ?? [];
  const creationDraftStatus = creationChatState
    ? creationChatState.nextAction === 'suggest_generate'
      ? '可以生成'
      : `还差 ${creationMissingLabels.length} 项`
    : '还未开始';
  const creationDraftRows = [
    {
      label: '身份',
      value: creationChatState?.draftProfile.identity || '等待确认你是谁'
    },
    {
      label: '方向',
      value: creationChatState?.draftProfile.currentFocus || creationChatState?.draftProfile.projects || '等待补充现在在做什么'
    },
    {
      label: '能力',
      value: creationChatState?.draftProfile.skills || creationChatState?.draftProfile.offers || '等待补充擅长什么'
    },
    {
      label: '缺口',
      value: creationMissingLabels.length > 0 ? `还差 ${creationMissingLabels.join('、')}` : creationChatState ? '资料已足够生成第一版' : '身份、项目、能力、需求'
    }
  ];
  const agentInputCopy = hasGenerated
    ? {
        pill: '进化分身 · AI 对话主入口',
        description: '系统识别到你已有分身。和 AI 说说最近变化，我们会在现有 Agent Profile 基础上优化。',
        submit: '保存并优化'
      }
    : {
        pill: '创建分身 · 多资料入口',
        description: '没有分身时，先用文本、附件、链接或 AI 对话补充资料，生成你的第一个数字分身。',
        submit: '生成我的分身'
      };
  const showBottomNav = hasGenerated && step !== 'home' && step !== 'generating' && step !== 'searching' && step !== 'edit';
  const isSelectedConnectionRecorded = Boolean(selectedCandidate && recordedConnectionIds.includes(selectedCandidate.id));
  const selectedCandidateIndex = selectedCandidate ? recommendations.findIndex((candidate) => candidate.id === selectedCandidate.id) : -1;
  const nextCandidate = selectedCandidateIndex >= 0 ? recommendations[selectedCandidateIndex + 1] : undefined;
  const hasCandidateBrowsing = recommendations.length > 1;
  const selectedCandidateIsInternet = Boolean(selectedCandidate && isInternetCandidate(selectedCandidate));
  const creationSubmitText = mode === 'chat' && creationChatState?.readiness === 'ready' ? '资料已足够，生成第一版' : agentInputCopy.submit;
  const activeText = useMemo(() => {
    if (mode === 'file') return fileText || (fileName ? `用户上传了文件：${fileName}` : '');
    if (mode === 'link') return linkText;
    if (mode === 'chat') return creationConversation.map((message) => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`).join('\n');
    return pasteText;
  }, [creationConversation, fileName, fileText, linkText, mode, pasteText]);
  const evolutionText = useMemo(
    () =>
      [
        evolutionDraft.trim(),
        evolutionFileText ? `用户上传了进化附件：${evolutionFileName}\n${evolutionFileText}` : ''
      ].filter(Boolean).join('\n\n'),
    [evolutionDraft, evolutionFileName, evolutionFileText]
  );

  useEffect(() => {
    setPublicOrigin(window.location.origin);

    Promise.allSettled([
      readApi<CurrentSessionResponse>('/api/me'),
      readApi<AgentProfile[]>('/api/profiles?limit=12')
    ]).then(([sessionResult, profilesResult]) => {
      if (profilesResult.status === 'fulfilled') {
        setResidentProfiles(profilesResult.value);
      }

      if (sessionResult.status === 'fulfilled' && sessionResult.value?.agent && sessionResult.value.profile) {
        const session = sessionResult.value;
        const { agent: restoredAgent, profile: restoredProfile } = session;
        if (!restoredAgent || !restoredProfile) return;
        setNickname(session.user.displayName);
        setGenerated({
          user: session.user,
          agent: restoredAgent,
          profile: restoredProfile
        });
        setStep('card');
      }

      setIsBooting(false);
    });
  }, []);

  useEffect(() => {
    evolutionThreadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [evolutionConversation, isEvolutionChatting]);

  const startCreate = () => {
    setNicknameError('');
    setContactError('');
    setShowNameModal(true);
  };

  const confirmName = () => {
    const trimmedNickname = nickname.trim();
    const trimmedContact = contact.trim();
    if (!trimmedNickname) {
      setNicknameError('先填写昵称，再生成你的数字分身。');
      return;
    }
    if (!trimmedContact) {
      setContactError('请填写微信号或手机号，用于后续连接。');
      return;
    }
    setNickname(trimmedNickname);
    setContact(trimmedContact);
    setNicknameError('');
    setContactError('');
    setShowNameModal(false);
    setIsLaunching(true);
    setTimeout(() => setStep('input'), 260);
    setTimeout(() => setIsLaunching(false), 520);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);
    setFileText('');
    setFileParsingStatus('正在解析文件内容...');

    const formData = new FormData();
    formData.set('file', file);

    try {
      const data = await readApi<ParsedDocumentResponse>('/api/documents/parse', {
        method: 'POST',
        body: formData,
        headers: {}
      });
      setFileName(data.fileName);
      setFileText(data.text);
      setFileParsingStatus(data.text ? `已解析 ${data.text.length} 个字符，可直接生成。` : '文件已读取，但没有解析到可用文本。');
    } catch (parseError) {
      setFileParsingStatus('');
      setError(parseError instanceof Error ? parseError.message : '文件解析失败');
    }
  };

  const handleEvolutionFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setEvolutionFileName(file.name);
    setEvolutionFileText('');
    setEvolutionFileStatus('正在解析附件...');

    const formData = new FormData();
    formData.set('file', file);

    try {
      const data = await readApi<ParsedDocumentResponse>('/api/documents/parse', {
        method: 'POST',
        body: formData,
        headers: {}
      });
      setEvolutionFileName(data.fileName);
      setEvolutionFileText(data.text);
      setEvolutionFileStatus(data.text ? `已提取 ${data.text.length} 个字符，将随本次进化保存。` : '附件已读取，但没有解析到可用文本。');
    } catch (parseError) {
      setEvolutionFileStatus('');
      setError(parseError instanceof Error ? parseError.message : '附件解析失败');
    }
  };

  const sendCreationChat = async (draft: string = chatDraft) => {
    const content = draft.trim();
    if (!content || isCreationChatting) return;

    const history = creationConversation;
    const userMessage: ConversationMessage = { role: 'user', content };
    setCreationConversation([...history, userMessage]);
    setChatDraft('');
    setError('');
    setIsCreationChatting(true);

    try {
      const assistantMessage = await readApi<CreationChatResponse>('/api/agents/creation-chat', {
        method: 'POST',
        body: JSON.stringify({
          displayName: nickname.trim() || '新用户',
          message: content,
          conversation: history
        })
      });
      setCreationChatState(assistantMessage);
      setCreationConversation([...history, userMessage, assistantMessage]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'AI 对话失败');
    } finally {
      setIsCreationChatting(false);
    }
  };

  const chatEvolution = async (content: string = evolutionDraft) => {
    if (!generated || isEvolutionChatting) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const history = evolutionConversation;
    const userMessage: ConversationMessage = { role: 'user', content: trimmed };
    setEvolutionConversation([...history, userMessage]);
    setEvolutionDraft('');
    setError('');
    setIsEvolutionChatting(true);

    try {
      const assistantMessage = await readApi<EvolutionChatResponse>('/api/agents/evolution-chat', {
        method: 'POST',
        body: JSON.stringify({
          userId: generated.user.id,
          agentId: generated.agent.id,
          message: trimmed,
          conversation: history
        })
      });
      setEvolutionConversation([...history, userMessage, assistantMessage]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'AI 对话失败');
    } finally {
      setIsEvolutionChatting(false);
    }
  };

  const generateAgent = async () => {
    const trimmedNickname = nickname.trim();
    const trimmedContact = contact.trim();
    if (!trimmedNickname) {
      setNicknameError('先填写昵称，再生成你的数字分身。');
      setShowNameModal(true);
      return;
    }
    if (!trimmedContact) {
      setContactError('请填写微信号或手机号，用于后续连接。');
      setShowNameModal(true);
      return;
    }

    setNickname(trimmedNickname);
    setContact(trimmedContact);
    setError('');
    setStep('generating');

    const links = mode === 'link' ? linkText.split('\n').map((url) => url.trim()).filter(Boolean).map((url) => ({ url })) : [];

    try {
      const data = await readApi<GeneratedAgentResponse>('/api/agents/generate-profile', {
        method: 'POST',
        body: JSON.stringify({
          displayName: trimmedNickname,
          contact: trimmedContact,
          text: mode === 'text' || mode === 'chat' ? activeText : undefined,
          fileName: mode === 'file' ? fileName : undefined,
          fileText: mode === 'file' ? fileText : undefined,
          links
        })
      });
      setGenerated(data);
      setResidentProfiles((profiles) => [data.profile, ...profiles.filter((item) => item.id !== data.profile.id)]);
      setStep('card');
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成失败');
      setStep('input');
    }
  };

  const saveEvolution = async () => {
    if (!generated) return;
    setError('');
    setStep('generating');

    try {
      const data = await readApi<GeneratedAgentResponse>('/api/agents/evolve', {
        method: 'POST',
        body: JSON.stringify({
          userId: generated.user.id,
          agentId: generated.agent.id,
          text: evolutionText,
          conversation: evolutionConversation
        })
      });
      setGenerated(data);
      setResidentProfiles((profiles) => [data.profile, ...profiles.filter((item) => item.id !== data.profile.id)]);
      setEvolutionDraft('');
      setEvolutionFileName('');
      setEvolutionFileText('');
      setEvolutionFileStatus('');
      setEvolutionConversation([]);
      setStep('card');
    } catch (evolutionError) {
      setError(evolutionError instanceof Error ? evolutionError.message : '优化失败');
      setStep('input');
    }
  };

  const findPeople = async (nextFindQuery?: string) => {
    if (!generated) return;
    setError('');
    const activeFindQuery = nextFindQuery ?? findQuery;
    const discoveryInterests = [...profileNeeds, ...activeFindQuery.split(/[，,\s]+/)].map((item) => item.trim()).filter(Boolean);
    const interests = Array.from(new Set(discoveryInterests)).slice(0, 8);
    const search = new URLSearchParams({ userId: generated.user.id });
    interests.forEach((interest) => search.append('interest', interest));

    setStep('searching');

    try {
      const data = await readApi<RecommendationItem[]>(`/api/recommendations?${search.toString()}`);
      const candidates = data.map(profileToCandidate);
      const webCandidates = buildInternetCandidates(profileNeeds, activeFindQuery);
      setRecommendations([...candidates, ...webCandidates]);
      if (candidates[0] ?? webCandidates[0]) setSelectedCandidate(candidates[0] ?? webCandidates[0]);
      setConnectionFeedback('');
      setStep('matches');
    } catch (recommendationError) {
      setError(recommendationError instanceof Error ? recommendationError.message : '推荐失败');
      setStep('find');
    }
  };

  const openDiscovery = () => {
    if (recommendations.length > 0) {
      setStep('matches');
      return;
    }

    if (profileNeeds.length > 0) {
      const profileNeedsQuery = profileNeeds.join('\n');
      setFindQuery(profileNeedsQuery);
      void findPeople(profileNeedsQuery);
      return;
    }

    setStep('find');
  };

  const restartDiscovery = () => {
    setFindQuery(profileNeeds.join('\n'));
    setStep('find');
  };

  const showNextCandidate = () => {
    if (!nextCandidate) {
      setStep('matches');
      return;
    }

    setSelectedCandidate(nextCandidate);
    setConnectionFeedback('');
    candidateContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCandidateTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCandidateTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch || !nextCandidate) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (deltaX < -60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      showNextCandidate();
    }
  };

  const createConnection = async () => {
    if (!generated || !selectedCandidate) return;
    const message = buildIcebreaker(nickname, selectedCandidate, offers);
    await navigator.clipboard?.writeText(message);
    setConnectionFeedback('文案已复制。连接请求正在记录...');

    try {
      await readApi('/api/connections', {
        method: 'POST',
        body: JSON.stringify({
          fromUserId: generated.user.id,
          toUserId: selectedCandidate.userId,
          source: 'recommendation',
          message
        })
      });
      setRecordedConnectionIds((ids) => (ids.includes(selectedCandidate.id) ? ids : [...ids, selectedCandidate.id]));
      setConnectionFeedback('已记录连接，文案已复制。现在可以去微信、私信或邮件里发送。');
    } catch {
      setConnectionFeedback('文案已复制，但连接请求暂时没有记录成功。你仍然可以先去外部发送。');
    }
  };

  const copyInviteMessage = async () => {
    if (!selectedCandidate) return;
    const message = buildInviteMessage(nickname, selectedCandidate, publicProfileUrl || publicProfilePath);
    await navigator.clipboard?.writeText(message);
    setConnectionFeedback('邀请文案已复制。你可以发给 TA，邀请对方生成自己的 Agent。');
  };

  const openProfileEditor = () => {
    if (!profile) return;

    setEditTab('basic');
    setEditNickname(nickname.trim());
    setEditContact(contact.trim());
    setEditHeadline(profile.headline);
    setEditBio(profile.bio);
    setEditTags(tags);
    setEditTagDraft('');
    setEditRecentUpdatesText(recentUpdates.join('\n'));
    setEditLinkStyleTitle(persona.title ?? tags[0] ?? '');
    setEditLinkStyleDescription(persona.description ?? '');
    setEditHighlightsText(profileHighlights.join('\n'));
    setEditDomainsText(profileDomains.join('，'));
    setEditOffersText(offers.join('，'));
    setEditWantsText(profileNeeds.join('，'));
    setShowProfileMenu(false);
    setStep('edit');
  };

  const addEditTag = () => {
    const nextTag = editTagDraft.trim();
    if (!nextTag || editTags.includes(nextTag)) return;
    setEditTags((current) => [...current, nextTag]);
    setEditTagDraft('');
  };

  const removeEditTag = (tagToRemove: string) => {
    setEditTags((current) => current.filter((tag) => tag !== tagToRemove));
  };

  const reorderEditTags = (fromIndex: number | null, toIndex: number) => {
    if (fromIndex === null || fromIndex === toIndex) return;

    setEditTags((current) => {
      if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) return current;

      const nextTags = [...current];
      const [tag] = nextTags.splice(fromIndex, 1);
      if (!tag) return current;
      nextTags.splice(toIndex, 0, tag);
      return nextTags;
    });
  };

  const startEditTagDrag = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.dataTransfer.effectAllowed = 'move';
    setDraggedEditTagIndex(index);
  };

  const saveProfileEdits = async () => {
    if (!generated || !profile || isSavingProfile) return;

    const nextNickname = editNickname.trim() || nickname.trim();
    const nextContact = editContact.trim() || contact.trim();
    const nextTags = editTags.map((tag) => tag.trim()).filter(Boolean);
    const nextOffers = splitEditableList(editOffersText);
    const nextWants = splitEditableList(editWantsText);
    const nextRecentUpdates = splitEditableList(editRecentUpdatesText);
    const nextHighlights = splitEditableList(editHighlightsText);
    const nextDomains = splitEditableList(editDomainsText).map((domain) => ({ name: domain, evidence: '手动编辑' }));
    const nextPersona = {
      title: editLinkStyleTitle.trim(),
      description: editLinkStyleDescription.trim(),
      confidence: persona.confidence ?? 1
    };
    const nextAnalysis: ProfileAnalysis = {
      ...analysis,
      recentUpdates: nextRecentUpdates,
      careerHighlights: nextHighlights,
      domainSignals: nextDomains,
      persona: nextPersona.title || nextPersona.description ? nextPersona : {},
      needs: nextWants
    };

    setError('');
    setIsSavingProfile(true);

    try {
      const data = await readApi<UpdateProfileResponse>(`/api/agents/${generated.agent.id}/profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          userId: generated.user.id,
          profileId: profile.id,
          displayName: nextNickname,
          contact: nextContact,
          headline: editHeadline.trim() || profile.headline,
          bio: editBio.trim() || profile.bio,
          tags: nextTags,
          offers: nextOffers,
          wants: nextWants,
          analysis: nextAnalysis
        })
      });

      setNickname(data.user.displayName);
      setContact(data.contact);
      setGenerated({
        user: data.user,
        agent: data.agent,
        profile: data.profile
      });
      setResidentProfiles((profiles) => [data.profile, ...profiles.filter((item) => item.id !== data.profile.id)]);
      setStep('card');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const copyCandidateContact = (candidate: CandidateView) => {
    if (!candidate.contactHandle) return;
    void navigator.clipboard?.writeText(candidate.contactHandle);
    setConnectionFeedback('已复制对方联系方式。');
  };

  const openShareProfile = () => {
    setShowProfileMenu(false);
    setShareFeedback('');
    setStep('share');
  };

  const copyPublicProfileLink = async () => {
    if (!publicProfileUrl) return;
    await navigator.clipboard?.writeText(publicProfileUrl);
    setShareFeedback('公开链接已复制，可以直接发给别人。');
  };

  const openResetConfirm = () => {
    setShowProfileMenu(false);
    setError('');
    setShowResetConfirm(true);
  };

  const resetPersonalInfo = async () => {
    if (!generated || isResettingPersonalInfo) return;

    setError('');
    setIsResettingPersonalInfo(true);

    try {
      const data = await readApi<ResetPersonalInfoResponse>(`/api/agents/${generated.agent.id}/personal-info`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: generated.user.id })
      });

      setNickname(data.user.displayName);
      if (data.contact) setContact(data.contact);
      setGenerated(null);
      setPasteText('');
      setFileName('');
      setFileText('');
      setFileParsingStatus('');
      setLinkText('');
      setChatDraft('');
      setCreationConversation([{ role: 'assistant', content: '如果你不知道怎么写，我可以问你几个问题，再整理成生成资料。' }]);
      setCreationChatState(null);
      setShowCreationDraft(true);
      setIsCreationWorkspaceOpen(false);
      setMode('chat');
      setEvolutionDraft('');
      setEvolutionFileName('');
      setEvolutionFileText('');
      setEvolutionFileStatus('');
      setEvolutionConversation([]);
      setRecommendations([]);
      setSelectedCandidate(null);
      setRecordedConnectionIds([]);
      setConnectionFeedback('');
      setFindQuery('');
      setResidentProfiles((profiles) => profiles.filter((item) => item.agentId !== generated.agent.id));
      setShowProfileMenu(false);
      setShowResetConfirm(false);
      setStep('input');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : '清空资料失败');
    } finally {
      setIsResettingPersonalInfo(false);
    }
  };

  const openCreationWorkspace = (nextMode: InputMode = mode) => {
    setMode(nextMode);
    setIsCreationWorkspaceOpen(true);
  };

  const creationChatWorkspace = (
    <div className="creation-chat-panel creation-chat-workspace">
      <div className="creation-chat-kicker">边聊边生成草稿</div>
      <div className="mini-chat creation-thread">
        {creationConversation.map((message, index) => (
          <div className={`mini-bubble ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
        {isCreationChatting && <div className="mini-bubble assistant">思考中...</div>}
      </div>
      <div className={`creation-live-draft ${showCreationDraft ? 'open' : ''}`}>
        <button
          className="creation-live-draft-toggle"
          type="button"
          aria-expanded={showCreationDraft}
          onClick={() => setShowCreationDraft((current) => !current)}
        >
          <b>实时分身草稿</b>
          <span>{showCreationDraft ? '收起' : '展开'}</span>
        </button>
        {showCreationDraft && (
          <div className="creation-live-draft-body">
            {creationDraftRows.map((row) => (
              <div className="creation-draft-row" key={row.label}>
                <span>{row.label}</span>
                <b>{row.value}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      {creationChatState && !showCreationDraft && (
        <div className={`creation-chat-guidance ${creationChatState.readiness}`}>
          <div className="creation-chat-progress">
            <span>资料完整度 {creationChatCompleteness}</span>
            <b>{creationDraftStatus}</b>
          </div>
        </div>
      )}
      <div className="chat-composer">
        <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="回答 AI 的问题，或随便说一段..." disabled={isCreationChatting} />
        <button onClick={() => void sendCreationChat()} disabled={isCreationChatting}>
          {isCreationChatting ? '思考中' : '发送'}
        </button>
      </div>
    </div>
  );

  return (
    <main className={`app-shell step-${step}`}>
      <div className="phone">
        <div className={`screen ${step === 'generating' || step === 'searching' || step === 'share' ? 'dark' : ''} ${showBottomNav ? 'has-bottom-nav' : ''}`}>
          {isLaunching && (
            <div className="launch-transition" aria-live="polite">
              <span>{nickname ? firstLetter(nickname) : '你'}</span>
              <b>正在打开你的数字分身</b>
            </div>
          )}
          {showResetConfirm && (
            <div className="reset-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title">
              <div className="reset-confirm-card">
                <b id="reset-confirm-title">确认清空个人资料？</b>
                <span>会删除已生成名片、素材、分析和匹配记录，但保留昵称和联系方式。</span>
                <div className="reset-confirm-actions">
                  <button type="button" onClick={() => setShowResetConfirm(false)} disabled={isResettingPersonalInfo}>
                    取消
                  </button>
                  <button type="button" className="danger" onClick={resetPersonalInfo} disabled={isResettingPersonalInfo}>
                    {isResettingPersonalInfo ? '正在清空' : '确认清空'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {isBooting && (
            <section className="boot-screen generating-screen">
              <div className="boot-content">
                <h2 className="page-title">
                  正在进入
                  <br />
                  <mark>Livelink</mark>
                </h2>
                <p className="muted light">正在同步你的入口状态。</p>
              </div>
            </section>
          )}

          {!isBooting && (
            <>
          {step === 'home' && (
            <section className="home-screen">
              <div className="home-hero">
                <div className="topbar">
                  <span className="brand">Livelink</span>
                  <span className="round-icon">·</span>
                </div>
                <div className="home-orbit" />
                <div className="home-copy">
                  <h1>
                    生成
                    <br />
                    <mark>我的数字分身</mark>
                  </h1>
                  <p>让 AI 先理解你是谁、能提供什么、正在寻找什么。</p>
                </div>
                <div className="home-center-action">
                  <button className="primary-action" onClick={startCreate}>
                    生成我的数字分身
                  </button>
                </div>
                <div className="scroll-cue" aria-hidden="true">
                  <b>↓</b>
                </div>
              </div>
              <ResidentProfiles profiles={residentProfiles} />
              {showNameModal && (
                <div className="modal-backdrop">
                  <div className="name-modal">
                    <h2>先给数字分身一个名字</h2>
                    <p>我们会用这个昵称生成你的数字分身，后面可以随时修改。</p>
                    <label className="text-field">
                      <span>你的昵称</span>
                      <input
                        value={nickname}
                        aria-invalid={Boolean(nicknameError)}
                        onChange={(event) => {
                          setNickname(event.target.value);
                          if (nicknameError) setNicknameError('');
                        }}
                      />
                    </label>
                    {nicknameError && <p className="field-error">{nicknameError}</p>}
                    <label className="text-field">
                      <span>微信号或手机号</span>
                      <input
                        value={contact}
                        aria-invalid={Boolean(contactError)}
                        onChange={(event) => {
                          setContact(event.target.value);
                          if (contactError) setContactError('');
                        }}
                        placeholder="微信号 / 手机号"
                      />
                    </label>
                    {contactError && <p className="field-error">{contactError}</p>}
                    <button className="primary-action lime" onClick={confirmName} disabled={!nickname.trim() || !contact.trim()}>
                      确认创建
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 'input' && (
            <section className={hasGenerated ? 'input-screen evolution-screen' : isCreationWorkspaceOpen && mode === 'chat' ? 'input-screen creation-chat-screen' : 'input-screen'}>
              {hasGenerated && profile ? (
                <>
                  <Header title="进化分身" action="↗" />
                  <div className="evolution-chat-fullscreen">
                    <div className="evolution-context-card">
                      <Pill>{agentInputCopy.pill}</Pill>
                      <b>当前分身摘要</b>
                      <span>{profile.headline}</span>
                      <small>{profile.bio}</small>
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    <div className="evolution-thread" aria-label="AI 对话进化记录">
                      <div className="mini-bubble assistant">
                        系统识别到你已有分身。直接告诉我最近变化，也可以上传附件补充新资料。
                      </div>
                      {evolutionConversation.map((message, index) => (
                        <div className={`mini-bubble ${message.role}`} key={`${message.role}-${index}`}>
                          {message.content}
                        </div>
                      ))}
                      <div ref={evolutionThreadEndRef} data-evolution-thread-end />
                    </div>
                    <div className="evolution-composer-dock">
                      {evolutionFileName && (
                        <div className="evolution-attachment-preview">
                          <b>{evolutionFileName}</b>
                          <span>{evolutionFileStatus || (evolutionFileText ? '附件内容会随本次进化一起保存' : '等待解析完成后再保存')}</span>
                        </div>
                      )}
                      <div className="evolution-composer-row">
                        <div className="chat-composer evolution-chat-composer">
                          <div className="evolution-attachment evolution-inline-attachment">
                            <input id="evolution-file-upload" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={handleEvolutionFile} />
                            <label htmlFor="evolution-file-upload" aria-label="上传附件" title="上传附件">
                              <span aria-hidden="true">+</span>
                            </label>
                          </div>
                          <input value={evolutionDraft} onChange={(event) => setEvolutionDraft(event.target.value)} placeholder="告诉我最近发生了什么，或想让分身怎么变化..." />
                          <button onClick={() => chatEvolution()} disabled={isEvolutionChatting}>
                            {isEvolutionChatting ? '思考中' : '发送'}
                          </button>
                        </div>
                      </div>
                      <button className="primary-action lime" onClick={saveEvolution}>
                        {agentInputCopy.submit}
                      </button>
                    </div>
                  </div>
                </>
              ) : isCreationWorkspaceOpen && mode === 'chat' ? (
                <>
                  <Header title="AI 创建中" action={creationChatCompleteness} />
                  <div className="content creation-chat-content">
                    {error && <p className="error-text">{error}</p>}
                    {creationChatWorkspace}
                    <div className="sticky-actions">
                      <button className="primary-action" onClick={generateAgent}>
                        {creationSubmitText}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Header title={`Hi, ${nickname || '你好'}`} action="?" />
                  <div className="content">
                    <Pill>{agentInputCopy.pill}</Pill>
                    {isCreationWorkspaceOpen ? (
                      <div className="creation-workspace-heading">
                        <b>AI 创建中</b>
                        <span>边聊边整理资料，生成按钮会使用当前对话和草稿。</span>
                      </div>
                    ) : (
                      <>
                        <h2 className="page-title">
                          创建你的
                          <br />
                          <mark>AI 分身</mark>
                        </h2>
                        <p className="muted">{agentInputCopy.description}</p>
                      </>
                    )}
                    {error && <p className="error-text">{error}</p>}
                    {!isCreationWorkspaceOpen && (
                    <div className="creation-source-flow" aria-label="选择资料入口">
                      <button className={`creation-source-card ai ${mode === 'chat' ? 'active' : ''}`} type="button" onClick={() => openCreationWorkspace('chat')}>
                        <span className="source-icon swap" aria-hidden="true">↔</span>
                        <span>
                          <b>和 AI 聊聊</b>
                          <small>不知道怎么写时，从这里开始。AI 会追问身份、项目、能力、需求。</small>
                        </span>
                      </button>
                      <button className={`creation-source-card ${mode === 'text' ? 'active' : ''}`} type="button" onClick={() => openCreationWorkspace('text')}>
                        <span>
                          <b>粘贴文本</b>
                          <small>已有介绍、履历或项目说明</small>
                        </span>
                        <span className="source-icon clipboard" aria-hidden="true" />
                      </button>
                      <button className={`creation-source-card file ${mode === 'file' ? 'active' : ''}`} type="button" onClick={() => openCreationWorkspace('file')}>
                        <span>
                          <b>上传附件</b>
                          <small>PDF / Word / Markdown</small>
                        </span>
                        <span className="source-icon plus" aria-hidden="true">+</span>
                      </button>
                      <button className={`creation-source-card link ${mode === 'link' ? 'active' : ''}`} type="button" onClick={() => openCreationWorkspace('link')}>
                        <span>
                          <b>导入链接</b>
                          <small>GitHub / 博客 / 作品集</small>
                        </span>
                        <span className="source-icon arrow" aria-hidden="true">↗</span>
                      </button>
                    </div>
                    )}
                    {isCreationWorkspaceOpen && mode === 'text' && (
                      <div className="paste-panel creation-panel">
                        <b>直接粘贴文本</b>
                        <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="粘贴你的介绍、经历、项目、能力、需求..." />
                        <div className="prompt-list">
                          {promptSuggestions.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {isCreationWorkspaceOpen && mode === 'file' && (
                      <div className="upload-panel creation-panel">
                        <div className="file-card">{fileName.toLowerCase().endsWith('.docx') ? 'DOC' : 'PDF'}</div>
                        <b>{fileName || '上传附件'}</b>
                        <span>支持 PDF、Word .docx、TXT / Markdown。解析后的文本会进入生成链路。</span>
                        {fileParsingStatus && <small>{fileParsingStatus}</small>}
                        {fileText && <textarea className="file-preview" value={fileText} onChange={(event) => setFileText(event.target.value)} />}
                        <input id="resume-upload" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={handleFile} />
                        <label htmlFor="resume-upload">{fileText ? '重新选择文件' : '选择文件'}</label>
                      </div>
                    )}
                    {isCreationWorkspaceOpen && mode === 'link' && (
                      <div className="link-panel creation-panel">
                        <b>上传链接</b>
                        <span>支持 GitHub、博客、作品集、小红书、B站等公开页面。每行一个链接。</span>
                        <textarea value={linkText} onChange={(event) => setLinkText(event.target.value)} placeholder="https://github.com/your/project" />
                      </div>
                    )}
                    {isCreationWorkspaceOpen && (
                      <div className="sticky-actions">
                        <button className="primary-action" onClick={generateAgent}>
                          {creationSubmitText}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {step === 'generating' && (
            <section className="generating-screen" aria-live="polite">
              <Header title="Building Agent" action="◎" />
              <div className="content generation-content">
                <div className="generation-hero">
                  <div className="generation-orbit" aria-hidden="true">
                    <span>{firstLetter(nickname)}</span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <p className="generation-kicker">不是卡住了，我们正在认真整理</p>
                  <h2 className="page-title">
                    正在搭建
                    <br />
                    <mark>{nickname || '你'} 的 Agent</mark>
                  </h2>
                  <p className="muted light">
                    预计 10-30 秒。我们会把你的资料整理成能力标签、合作需求和可以直接分享的数字名片。
                  </p>
                </div>
                <div className="generation-progress" aria-hidden="true">
                  <span />
                </div>
                <div className="generation-steps">
                  <div className="generation-step active">
                    <b>01 理解资料</b>
                    <span>保存输入内容，提取你的经历、能力和关键词</span>
                  </div>
                  <div className="generation-step">
                    <b>02 组织价值</b>
                    <span>生成 ProfileFact、项目脉络和可提供资源</span>
                  </div>
                  <div className="generation-step">
                    <b>03 发布名片</b>
                    <span>写入 AgentProfile，并准备后续推荐匹配</span>
                  </div>
                </div>
              </div>
              <div className="toast generation-tip">你可以先想想第一位想认识的人，Agent 完成后就能帮你找连接点。</div>
            </section>
          )}

          {step === 'card' && profile && (
            <section className="card-screen">
              <Header
                title="我的数字分身"
                action={
                  <button
                    className="round-icon profile-menu-trigger"
                    type="button"
                    aria-label="展开资料操作"
                    aria-expanded={showProfileMenu}
                    onClick={() => setShowProfileMenu((visible) => !visible)}
                  >
                    ⋯
                  </button>
                }
              />
              {showProfileMenu && (
                <div className="profile-menu" role="menu">
                  <button type="button" role="menuitem" onClick={openProfileEditor}>
                    <b>编辑资料</b>
                    <span>更新分身主页内容</span>
                  </button>
                  <button type="button" role="menuitem" onClick={openShareProfile}>
                    <b>分享主页</b>
                    <span>复制公开链接，让别人直接看到你</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openResetConfirm}
                    disabled={isResettingPersonalInfo}
                  >
                    <b>清空资料</b>
                    <span>保留昵称和联系方式</span>
                  </button>
                </div>
              )}
              <div className="content">
                <div className="agent-card profile-card">
                  <div className="profile-identity">
                    <div className="avatar">{firstLetter(nickname)}</div>
                    <div className="profile-main">
                      <div className="profile-name-line">
                        <h3>{nickname || profile.headline.split('·')[0]?.trim() || '我的分身'}</h3>
                        <span className="profile-contact-inline">{contactHandle}</span>
                      </div>
                      <p>{profile.headline}</p>
                    </div>
                  </div>
                  <p className="profile-bio">{profile.bio}</p>
                  <div className="tags">
                    {tags.slice(0, 6).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>

                <ProfileSection eyebrow="RECENT" title="近况流">
                  <div className="activity-feed">
                    <div className="activity-card accent">
                      <b>最近在更新</b>
                      <span>{recentUpdates[0] || sparseProfileHint}</span>
                    </div>
                    <div className="activity-card">
                      <b>正在关注</b>
                      <span>{recentUpdates[1] || profileDomains.slice(0, 3).join('、') || sparseProfileHint}</span>
                    </div>
                  </div>
                </ProfileSection>

                <ProfileSection eyebrow="LINK" title="link风格">
                  {hasPersonaSignals ? (
                    <div className="link-style-card">
                      <b>{persona.title ?? tags[0] ?? '待确认的连接风格'}</b>
                      <span>{persona.description ?? '还没有足够资料生成稳定的连接风格。'}</span>
                    </div>
                  ) : (
                    <div className="profile-empty">{sparseProfileHint}</div>
                  )}
                </ProfileSection>

                <ProfileSection eyebrow="HIGHLIGHTS" title="履历亮点">
                  <div className="highlight-list">
                    {profileHighlights.map((item, index) => (
                      <div className="highlight-item" key={`${item}-${index}`}>
                        <em>{String(index + 1).padStart(2, '0')}</em>
                        <span>{item}</span>
                      </div>
                    ))}
                    {profileHighlights.length === 0 && (
                      <div className="highlight-item">
                        <em>—</em>
                        <span>{sparseProfileHint}</span>
                      </div>
                    )}
                  </div>
                </ProfileSection>

                <ProfileSection eyebrow="DOMAINS" title="领域画像">
                  <div className="domain-grid">
                    {profileDomainSignals.map((domain) => (
                      <div className="domain-pill" key={domain.name}>
                        <b>{domain.name}</b>
                        <span>{domain.evidence || '已提取'}</span>
                      </div>
                    ))}
                    {profileDomainSignals.length === 0 && <div className="profile-empty">{sparseProfileHint}</div>}
                  </div>
                </ProfileSection>

                <div className="summary-card compact">
                  <SummaryRow title="我能提供">{offers.join('、') || sparseProfileHint}</SummaryRow>
                  <SummaryRow title="我正在寻找">{profileNeeds.join('、') || sparseProfileHint}</SummaryRow>
                </div>
                <div className="sticky-actions profile-sticky-cta two">
                  <button className="secondary-action" type="button" onClick={openShareProfile}>
                    分享主页
                  </button>
                  <button className="primary-action lime" onClick={openDiscovery}>
                    让 Agent 帮我找人
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 'edit' && profile && (
            <section className="edit-profile-screen">
              <Header
                title="编辑数字分身"
                action={
                  <button className="round-icon" type="button" aria-label="返回数字分身" onClick={() => setStep('card')}>
                    ←
                  </button>
                }
              />
              <div className="content edit-profile-content">
                <div className="edit-tabs" role="tablist" aria-label="编辑分组">
                  <button className={editTab === 'basic' ? 'active' : ''} type="button" onClick={() => setEditTab('basic')}>
                    基础
                  </button>
                  <button className={editTab === 'profile' ? 'active' : ''} type="button" onClick={() => setEditTab('profile')}>
                    画像
                  </button>
                  <button className={editTab === 'goals' ? 'active' : ''} type="button" onClick={() => setEditTab('goals')}>
                    目标
                  </button>
                </div>

                {editTab === 'basic' && (
                  <section className="edit-panel">
                    <div className="edit-panel-title">
                      <h3>基础资料</h3>
                      <span>BASIC</span>
                    </div>
                    <label className="edit-field">
                      <b>昵称</b>
                      <input value={editNickname} onChange={(event) => setEditNickname(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>联系方式</b>
                      <input value={editContact} onChange={(event) => setEditContact(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>一句话简介</b>
                      <textarea value={editHeadline} onChange={(event) => setEditHeadline(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>自我介绍</b>
                      <textarea value={editBio} onChange={(event) => setEditBio(event.target.value)} />
                    </label>
                    <div className="edit-field">
                      <b>标签</b>
                      <div className="edit-tag-editor">
                        <div className="edit-tag-list">
                          {editTags.map((tag, index) => (
                            <div
                              className={`edit-tag-chip ${draggedEditTagIndex === index ? 'is-dragging' : ''}`}
                              key={tag}
                              draggable
                              onDragStart={(event) => startEditTagDrag(event, index)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                reorderEditTags(draggedEditTagIndex, index);
                                setDraggedEditTagIndex(null);
                              }}
                              onDragEnd={() => setDraggedEditTagIndex(null)}
                            >
                              <span>{tag}</span>
                              <button type="button" aria-label={`删除标签 ${tag}`} onClick={() => removeEditTag(tag)}>
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="edit-tag-add">
                          <input
                            aria-label="新标签"
                            value={editTagDraft}
                            onChange={(event) => setEditTagDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addEditTag();
                              }
                            }}
                          />
                          <button type="button" onClick={addEditTag} disabled={!editTagDraft.trim()}>
                            添加
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {editTab === 'profile' && (
                  <section className="edit-panel">
                    <div className="edit-panel-title">
                      <h3>画像内容</h3>
                      <span>PROFILE</span>
                    </div>
                    <label className="edit-field">
                      <b>近况流</b>
                      <textarea value={editRecentUpdatesText} onChange={(event) => setEditRecentUpdatesText(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>link风格</b>
                      <input value={editLinkStyleTitle} onChange={(event) => setEditLinkStyleTitle(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>link风格描述</b>
                      <textarea value={editLinkStyleDescription} onChange={(event) => setEditLinkStyleDescription(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>履历亮点</b>
                      <textarea value={editHighlightsText} onChange={(event) => setEditHighlightsText(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>领域画像</b>
                      <input value={editDomainsText} onChange={(event) => setEditDomainsText(event.target.value)} />
                    </label>
                  </section>
                )}

                {editTab === 'goals' && (
                  <section className="edit-panel">
                    <div className="edit-panel-title">
                      <h3>目标与行动</h3>
                      <span>GOALS</span>
                    </div>
                    <label className="edit-field">
                      <b>我能提供</b>
                      <textarea value={editOffersText} onChange={(event) => setEditOffersText(event.target.value)} />
                    </label>
                    <label className="edit-field">
                      <b>我正在寻找</b>
                      <textarea value={editWantsText} onChange={(event) => setEditWantsText(event.target.value)} />
                    </label>
                    <button className="edit-ai-card" type="button" onClick={() => setStep('input')}>
                      <b>AI 辅助优化</b>
                    </button>
                    <button className="edit-reset-card" type="button" onClick={openResetConfirm} disabled={isResettingPersonalInfo}>
                      <b>清空资料</b>
                    </button>
                  </section>
                )}

                {error && <p className="error-text">{error}</p>}
                <div className="sticky-actions edit-actions two">
                  <button className="secondary-action" type="button" onClick={() => setStep('card')}>
                    取消
                  </button>
                  <button className="primary-action lime" type="button" onClick={saveProfileEdits} disabled={isSavingProfile}>
                    {isSavingProfile ? '保存中' : '保存'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 'share' && profile && (
            <section className="share-screen">
              <Header
                title="分享分身"
                action={
                  <button className="round-icon" type="button" aria-label="返回数字分身" onClick={() => setStep('card')}>
                    ←
                  </button>
                }
              />
              <div className="content">
                <div className="share-link-card">
                  <span className="share-kicker">PUBLIC PROFILE</span>
                  <h2>让别人直接链接到你</h2>
                  <p>这个链接会打开你的公开数字分身主页，对方不需要登录也能了解你是谁、能提供什么、正在寻找什么。</p>
                  <code>{publicProfileUrl}</code>
                  {shareFeedback && <small>{shareFeedback}</small>}
                  <div className="share-action-row">
                    <button className="primary-action lime" type="button" onClick={copyPublicProfileLink}>
                      复制公开链接
                    </button>
                    <button className="secondary-action" type="button" onClick={() => window.open(publicProfilePath, '_blank', 'noopener,noreferrer')}>
                      打开公开页
                    </button>
                  </div>
                </div>
                <div className="poster-card">
                  <span className="poster-brand">Livelink Agent</span>
                  <h2>{nickname}<br />{profile.headline}</h2>
                  <p>{profile.bio}</p>
                  <div className="poster-tags">
                    {tags.slice(0, 2).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="qr-box">SCAN</div>
                </div>
                <div className="sticky-actions">
                  <button className="primary-action lime" type="button" onClick={copyPublicProfileLink}>
                    保存 / 分享海报
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 'find' && (
            <section className="find-screen">
              <Header title="Find People" action="⌕" />
              <div className="content">
                <h2 className="page-title">
                  你想
                  <br />
                  <mark>认识谁</mark>
                </h2>
                {error && <p className="error-text">{error}</p>}
                <label className="query-box">
                  <span>我的需求</span>
                  <textarea
                    value={findQuery}
                    onChange={(event) => setFindQuery(event.target.value)}
                    placeholder={findPromptTemplate}
                  />
                </label>
                <div className="sticky-actions">
                  <button className="primary-action lime" onClick={() => findPeople()}>
                    生成推荐列表
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 'searching' && (
            <section className="recommendation-search-screen" aria-live="polite">
              <Header title="Searching Agents" action="◎" />
              <div className="content recommendation-search-content">
                <div className="search-hero">
                  <div className="search-orbit" aria-hidden="true">
                    <span>{firstLetter(nickname)}</span>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <p className="search-kicker">正在让你的 Agent 访问候选分身</p>
                  <h2 className="page-title">
                    正在搜寻
                    <br />
                    <mark>高匹配推荐</mark>
                  </h2>
                  <p className="muted light">
                    Agent 正在拆解你的需求，读取已发布名片，并整理最适合开场的连接理由。
                  </p>
                </div>
                <div className="search-progress" aria-hidden="true">
                  <span />
                </div>
                <div className="search-steps">
                  <div className="search-step active">
                    <b>01 拆解需求</b>
                    <span>识别你想认识的人、可交换价值和这次搜索的约束条件</span>
                  </div>
                  <div className="search-step">
                    <b>02 探测候选 Agent</b>
                    <span>按标签、需求、能力和公开资料筛选候选分身</span>
                  </div>
                  <div className="search-step">
                    <b>03 生成推荐理由</b>
                    <span>整理匹配分、推荐原因和适合第一句开启的话题</span>
                  </div>
                </div>
              </div>
              <div className="toast search-tip">A-to-A 搜索会先看互补价值，再把值得认识的人放进推荐列表。</div>
            </section>
          )}

          {step === 'matches' && (
            <section className="matches-screen">
              <Header
                title="Top Matches"
                action={
                  <button className="round-icon" type="button" aria-label="重新搜索" title="重新搜索" onClick={restartDiscovery}>
                    ↻
                  </button>
                }
              />
              <div className="content">
                <h2 className="page-title">
                  匹配
                  <br />
                  <mark>推荐</mark>
                </h2>
                <p className="muted">推荐来自后端已发布名片。若为空，需要更多用户生成 Agent。</p>
                <details className="agent-trace matches-trace">
                  <summary>
                    <span>A-to-A 搜索过程 · 模拟过程</span>
                    <b>用户可选查看</b>
                  </summary>
                  <div className="trace-thread">
                    {agentTraceMessages.map((message) => (
                      <article className={message.from === '我的 Agent' ? 'mine' : 'theirs'} key={message.title}>
                        <small>
                          {message.from} → {message.to}
                        </small>
                        <h3>{message.title}</h3>
                        <p>{message.text}</p>
                      </article>
                    ))}
                  </div>
                </details>
                <div className="candidate-list">
                  {recommendations.map((candidate) => {
                    const isWebCandidate = isInternetCandidate(candidate);

                    return (
                      <button
                        className={`candidate-card ${isWebCandidate ? 'web-candidate-card' : ''}`}
                        key={candidate.id}
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setStep('candidate');
                        }}
                      >
                        <span className="candidate-avatar">{candidate.avatar}</span>
                        <span className="candidate-main">
                          <b>{candidate.name}</b>
                          <small>{candidate.role}</small>
                          <em>{candidate.reason}</em>
                          {isWebCandidate && <span className="candidate-web-notice">未入驻 Livelink，可邀请 TA 生成 Agent</span>}
                        </span>
                        <strong
                          className={
                            isWebCandidate
                              ? 'invite-status-pill'
                              : recordedConnectionIds.includes(candidate.id)
                                ? 'connection-status-pill'
                                : ''
                          }
                        >
                          {isWebCandidate ? '可邀请' : recordedConnectionIds.includes(candidate.id) ? '已记录' : `${candidate.score}%`}
                        </strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {step === 'candidate' && selectedCandidate && (
            <section className="candidate-screen" onTouchStart={handleCandidateTouchStart} onTouchEnd={handleCandidateTouchEnd}>
              <Header
                title="Candidate"
                action={
                  <button
                    className="round-icon"
                    type="button"
                    aria-label="返回推荐列表"
                    title="返回推荐列表"
                    onClick={() => setStep('matches')}
                  >
                    ←
                  </button>
                }
              />
              <div className="content" ref={candidateContentRef}>
                <div className="candidate-hero">
                  <div className="candidate-identity-row">
                    <span className="candidate-avatar big">{selectedCandidate.avatar}</span>
                    <div className="candidate-title-block">
                      <h2>{selectedCandidate.name}</h2>
                      <p>{selectedCandidate.role}</p>
                    </div>
                  </div>
                  <div className="candidate-contact-strip">
                    <span>
                      {selectedCandidateIsInternet
                        ? 'TA 还未入驻 Livelink'
                        : selectedCandidate.contactHandle
                          ? `联系方式：${selectedCandidate.contactHandle}`
                          : '联系方式待补充'}
                    </span>
                    {!selectedCandidateIsInternet && selectedCandidate.contactHandle && (
                      <button type="button" aria-label="复制候选人联系方式" onClick={() => copyCandidateContact(selectedCandidate)}>
                        复制
                      </button>
                    )}
                  </div>
                  <p className="candidate-demo-notice">
                    {selectedCandidateIsInternet ? '推荐来自互联网公开信息，邀请后可让 TA 生成自己的 Agent。' : '现在是demo阶段，暂未实现agent自动化，请手动联系TA'}
                  </p>
                  <div className="tags">
                    {selectedCandidate.tags.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="summary-card compact">
                  <SummaryRow title={`为什么推荐 · ${selectedCandidate.score}%`}>{selectedCandidate.reason}</SummaryRow>
                  <SummaryRow title={selectedCandidateIsInternet ? '公开信息依据' : '他能提供'}>{selectedCandidate.offer}</SummaryRow>
                  <SummaryRow title={selectedCandidateIsInternet ? '邀请切入点' : '建议聊什么'}>{selectedCandidate.topic}</SummaryRow>
                </div>
                <div className={hasCandidateBrowsing ? 'sticky-actions candidate-actions two' : 'sticky-actions'}>
                  {hasCandidateBrowsing && (
                    <button className="secondary-action" type="button" aria-label="查看下一个推荐" onClick={showNextCandidate}>
                      {nextCandidate ? '下一个' : '回列表'}
                    </button>
                  )}
                  <button className="primary-action lime" onClick={selectedCandidateIsInternet ? copyInviteMessage : () => setStep('icebreaker')}>
                    {selectedCandidateIsInternet ? '复制邀请文案' : '生成破冰话术'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 'icebreaker' && selectedCandidate && profile && (
            <section className="icebreaker-screen">
              <Header title="Icebreaker" action="✉" />
              <div className="content">
                <h2 className="page-title">
                  更自然地
                  <br />
                  <mark>开口</mark>
                </h2>
                <div className="message-card">
                  <p>{buildIcebreaker(nickname, selectedCandidate, offers)}</p>
                </div>
                <div className="summary-card compact">
                  <SummaryRow title="连接动作">
                    {isSelectedConnectionRecorded ? '已经记录连接请求，可直接去外部发送文案。' : '点击后会记录连接请求，并复制破冰文案。'}
                  </SummaryRow>
                  <SummaryRow title="附带内容">自动附带你的 Agent 名片链接，让对方快速理解你是谁。</SummaryRow>
                </div>
                {connectionFeedback && <div className="connection-feedback">{connectionFeedback}</div>}
                <div className="sticky-actions">
                  <button className="primary-action lime" onClick={createConnection} disabled={isSelectedConnectionRecorded}>
                    {isSelectedConnectionRecorded ? '已记录连接，文案已复制' : '复制文案并记录连接'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {showBottomNav && <BottomNav currentStep={step} onNavigate={setStep} onFindNavigate={openDiscovery} />}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ResidentProfiles({ profiles }: { profiles: AgentProfile[] }) {
  return (
    <div className="resident-section">
      <div className="resident-title">
        <b>已经入住的人</b>
      </div>
      <div className="resident-list">
        {profiles.length === 0 ? (
          <div className="resident-empty">暂无已发布名片，生成后会出现在这里。</div>
        ) : (
          profiles.map((profile) => {
            const name = profileDisplayName(profile);
            const tags = parseJsonList(profile.tagsJson).slice(0, 3);

            return (
              <div className="resident-card" key={profile.id} aria-label="查看已入住 Agent">
                <span className="resident-avatar">{firstLetter(name)}</span>
                <div className="resident-main">
                  <b className="resident-name">{name}</b>
                  <div className="resident-tags">
                    {(tags.length ? tags : ['Agent']).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProfileSection({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="profile-section">
      <div className="profile-section-title">
        <span>{eyebrow}</span>
        <h4>{title}</h4>
      </div>
      {children}
    </section>
  );
}

function buildIcebreaker(nickname: string, candidate: CandidateView, offers: string[]) {
  const displayName = nickname.trim();
  return `你好${candidate.name}，我是 ${displayName}。我刚在 Livelink 生成了自己的 Agent 名片，看到你在 ${candidate.tags[0] ?? candidate.role} 方向有相关经验，感觉我们可以聊聊「${candidate.topic}」。我这边能提供 ${offers.slice(0, 2).join('、') || '产品和 AI 应用落地经验'}，这是我的 Agent 名片：livelink.app/u/${displayName}-agent`;
}

function buildInviteMessage(nickname: string, candidate: CandidateView, profileUrl: string) {
  const displayName = nickname.trim() || '我';
  const inviteLink = profileUrl || 'Livelink';
  return `你好，我是 ${displayName}。我在 Livelink 上生成了自己的 AI Agent，系统根据我的需求从互联网公开信息里推荐我认识你。看起来我们在「${candidate.tags[0] ?? candidate.topic}」方向可能有交集。你也可以生成一个 Agent，这样我们能更快了解彼此适合聊什么：${inviteLink}`;
}

function Header({ title, action }: { title: string; action: ReactNode }) {
  return (
    <div className="topbar">
      <span className="brand">{title}</span>
      {typeof action === 'string' ? <span className="round-icon">{action}</span> : action}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <div className="pill">{children}</div>;
}

function SummaryRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="summary-row">
      <b>{title}</b>
      <span>{children}</span>
    </div>
  );
}

function BottomNav({
  currentStep,
  onNavigate,
  onFindNavigate
}: {
  currentStep: FlowStep;
  onNavigate: (step: FlowStep) => void;
  onFindNavigate: () => void;
}) {
  const activeKey =
    currentStep === 'input'
      ? 'create'
      : currentStep === 'card' || currentStep === 'share'
        ? 'card'
        : currentStep === 'find' || currentStep === 'matches' || currentStep === 'candidate'
          ? 'find'
          : 'connect';

  return (
    <nav className="bottom-nav" aria-label="主导航">
      <button className={activeKey === 'create' ? 'active' : ''} onClick={() => onNavigate('input')}>
        <b>＋</b>
        <span>进化</span>
      </button>
      <button className={activeKey === 'card' ? 'active' : ''} title="我的数字分身" onClick={() => onNavigate('card')}>
        <b>◈</b>
        <span>分身</span>
      </button>
      <button className={activeKey === 'find' ? 'active' : ''} onClick={onFindNavigate}>
        <b>⌕</b>
        <span>发现</span>
      </button>
      <button className={activeKey === 'connect' ? 'active' : ''} onClick={() => onNavigate('icebreaker')}>
        <b>✉</b>
        <span>破冰</span>
      </button>
    </nav>
  );
}
