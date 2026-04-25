'use client';

import { ChangeEvent, ReactNode, useMemo, useRef, useState, useEffect } from 'react';

type FlowStep = 'home' | 'input' | 'generating' | 'card' | 'share' | 'find' | 'searching' | 'matches' | 'candidate' | 'icebreaker';
type InputMode = 'text' | 'file' | 'link' | 'chat';

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

type ParsedDocumentResponse = {
  fileName: string;
  fileType: string;
  text: string;
};

type EvolutionChatResponse = ConversationMessage;

type RecommendationItem = {
  profile: AgentProfile;
  score: number;
  reason: string;
  topic?: string;
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

const creationChatQuestions = [
  '你现在主要在做什么？',
  '你最擅长的能力是什么？',
  '做过哪些代表项目？',
  '你能为别人提供什么？',
  '你现在最想认识谁？'
];

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

function parseJsonList(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function firstLetter(value: string) {
  return (value.trim()[0] || 'A').toUpperCase();
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
    topic: item.topic || icebreakers[0] || '围绕彼此的能力、需求和合作场景展开交流'
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
  const [isLaunching, setIsLaunching] = useState(false);
  const [mode, setMode] = useState<InputMode>('text');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [fileParsingStatus, setFileParsingStatus] = useState('');
  const [linkText, setLinkText] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [creationConversation, setCreationConversation] = useState<ConversationMessage[]>([
    { role: 'assistant', content: '如果你不知道怎么写，我可以问你几个问题，再整理成生成资料。' }
  ]);
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
  const [isBooting, setIsBooting] = useState(true);
  const evolutionThreadEndRef = useRef<HTMLDivElement | null>(null);

  const profile = generated?.profile;
  const tags = parseJsonList(profile?.tagsJson);
  const skills = parseJsonList(profile?.skillsJson);
  const interests = parseJsonList(profile?.interestsJson);
  const offers = parseJsonList(profile?.offersJson);
  const wants = parseJsonList(profile?.wantsJson);
  const icebreakers = parseJsonList(profile?.icebreakersJson);
  const profileHighlights = [...skills, ...offers].filter(Boolean).slice(0, 4);
  const profileDomains = [...tags, ...interests].filter(Boolean).slice(0, 4);
  const hasPersonaSignals = Boolean(tags[0] || icebreakers[0]);
  const contactHandle = nickname.trim() ? `@${nickname.trim()}` : `ID ${profile?.slug ?? 'agent'}`;
  const sparseProfileHint = '资料还不够，继续补充后再生成';
  const hasGenerated = Boolean(generated);
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
  const showBottomNav = hasGenerated && step !== 'home' && step !== 'generating' && step !== 'searching';
  const isSelectedConnectionRecorded = Boolean(selectedCandidate && recordedConnectionIds.includes(selectedCandidate.id));
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
    setShowNameModal(true);
  };

  const confirmName = () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setNicknameError('先填写昵称，再生成你的 Agent。');
      return;
    }
    setNickname(trimmedNickname);
    setNicknameError('');
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

  const answerCreationQuestion = (question: string) => {
    setMode('chat');
    setCreationConversation((messages) => [...messages, { role: 'assistant', content: question }]);
  };

  const sendCreationChat = () => {
    const content = chatDraft.trim();
    if (!content) return;
    setCreationConversation((messages) => [
      ...messages,
      { role: 'user', content },
      { role: 'assistant', content: '收到，我会把这段信息纳入首次分身生成资料。你可以继续补充，或直接生成。' }
    ]);
    setChatDraft('');
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
    if (!trimmedNickname) {
      setNicknameError('先填写昵称，再生成你的 Agent。');
      setShowNameModal(true);
      return;
    }

    setNickname(trimmedNickname);
    setError('');
    setStep('generating');

    const links = mode === 'link' ? linkText.split('\n').map((url) => url.trim()).filter(Boolean).map((url) => ({ url })) : [];

    try {
      const data = await readApi<GeneratedAgentResponse>('/api/agents/generate-profile', {
        method: 'POST',
        body: JSON.stringify({
          displayName: trimmedNickname,
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

  const findPeople = async () => {
    if (!generated) return;
    setError('');
    const interests = [...wants, ...findQuery.split(/[，,\s]+/)].filter(Boolean).slice(0, 8);
    const search = new URLSearchParams({ userId: generated.user.id });
    interests.forEach((interest) => search.append('interest', interest));

    setStep('searching');

    try {
      const data = await readApi<RecommendationItem[]>(`/api/recommendations?${search.toString()}`);
      const candidates = data.map(profileToCandidate);
      setRecommendations(candidates);
      if (candidates[0]) setSelectedCandidate(candidates[0]);
      setConnectionFeedback('');
      setStep('matches');
    } catch (recommendationError) {
      setError(recommendationError instanceof Error ? recommendationError.message : '推荐失败');
      setStep('find');
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

  const copyProfileContact = () => {
    const profileLine = profile?.headline ? `${contactHandle} · ${profile.headline}` : contactHandle;
    void navigator.clipboard?.writeText(profileLine);
  };

  return (
    <main className={`app-shell step-${step}`}>
      <div className="phone">
        <div className={`screen ${step === 'generating' || step === 'searching' || step === 'share' ? 'dark' : ''} ${showBottomNav ? 'has-bottom-nav' : ''}`}>
          {isLaunching && (
            <div className="launch-transition" aria-live="polite">
              <span>{nickname ? firstLetter(nickname) : '你'}</span>
              <b>正在打开你的 Agent 工作台</b>
            </div>
          )}
          {isBooting && (
            <section className="generating-screen">
              <div className="content">
                <h2 className="page-title">
                  正在恢复
                  <br />
                  <mark>你的 Agent</mark>
                </h2>
                <p className="muted light">如果你之前生成过 Agent，我们会自动带你回到名片页。</p>
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
                    <mark>我的 Agent</mark>
                  </h1>
                  <p>让 AI 先理解你是谁、能提供什么、正在寻找什么。</p>
                </div>
                <div className="home-center-action">
                  <button className="primary-action" onClick={startCreate}>
                    生成我的 Agent
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
                    <h2>先给 Agent 一个名字</h2>
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
                    <button className="primary-action lime" onClick={confirmName} disabled={!nickname.trim()}>
                      确认生成
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 'input' && (
            <section className={hasGenerated ? 'input-screen evolution-screen' : 'input-screen'}>
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
              ) : (
                <>
                  <Header title={`Hi, ${nickname || '你好'}`} action="?" />
                  <div className="content">
                    <Pill>{agentInputCopy.pill}</Pill>
                    <h2 className="page-title">
                      创建你的
                      <br />
                      <mark>AI 分身</mark>
                    </h2>
                    <p className="muted">{agentInputCopy.description}</p>
                    {error && <p className="error-text">{error}</p>}
                    <div className="mode-tabs">
                      <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>
                        粘贴文本
                      </button>
                      <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
                        上传附件
                      </button>
                      <button className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>
                        上传链接
                      </button>
                      <button className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}>
                        AI 对话
                      </button>
                    </div>
                    {mode === 'text' && (
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
                    {mode === 'file' && (
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
                    {mode === 'link' && (
                      <div className="link-panel creation-panel">
                        <b>上传链接</b>
                        <span>支持 GitHub、博客、作品集、小红书、B站等公开页面。每行一个链接。</span>
                        <textarea value={linkText} onChange={(event) => setLinkText(event.target.value)} placeholder="https://github.com/your/project" />
                      </div>
                    )}
                    {mode === 'chat' && (
                      <div className="creation-chat-panel">
                        <b>和 AI 聊几句</b>
                        <div className="mini-chat">
                          {creationConversation.map((message, index) => (
                            <div className={`mini-bubble ${message.role}`} key={`${message.role}-${index}`}>
                              {message.content}
                            </div>
                          ))}
                        </div>
                        <div className="quick-prompts">
                          {creationChatQuestions.map((question) => (
                            <button key={question} onClick={() => answerCreationQuestion(question)}>
                              {question}
                            </button>
                          ))}
                        </div>
                        <div className="chat-composer">
                          <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="回答 AI 的问题，或随便说一段..." />
                          <button onClick={sendCreationChat}>发送</button>
                        </div>
                      </div>
                    )}
                    <div className="sticky-actions">
                      <button className="primary-action" onClick={generateAgent}>
                        {agentInputCopy.submit}
                      </button>
                    </div>
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
              <Header title="我的Agent" action="⋯" />
              <div className="content">
                <div className="agent-card profile-card">
                  <div className="profile-identity">
                    <div className="avatar">{firstLetter(nickname)}</div>
                    <div className="profile-main">
                      <span className="profile-kicker">这是你的数字分身</span>
                      <h3>{nickname || profile.headline.split('·')[0]?.trim() || '我的分身'}</h3>
                      <p>{profile.headline}</p>
                    </div>
                  </div>
                  <p className="profile-bio">{profile.bio}</p>
                  <div className="tags">
                    {tags.slice(0, 6).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="profile-actions">
                    <span className="profile-handle">{contactHandle}</span>
                    <button type="button" onClick={copyProfileContact}>复制 ID</button>
                    <button type="button" onClick={() => setStep('share')}>联系分身</button>
                  </div>
                </div>

                <ProfileSection eyebrow="RECENT" title="近况流">
                  <div className="activity-feed">
                    <div className="activity-card accent">
                      <b>最近在更新</b>
                      <span>{profile.bio}</span>
                    </div>
                    <div className="activity-card">
                      <b>正在关注</b>
                      <span>{profileDomains.slice(0, 3).join('、') || sparseProfileHint}</span>
                    </div>
                  </div>
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
                    {profileDomains.map((domain) => (
                      <div className="domain-pill" key={domain}>
                        <b>{domain}</b>
                        <span>已提取</span>
                      </div>
                    ))}
                    {profileDomains.length === 0 && <div className="profile-empty">{sparseProfileHint}</div>}
                  </div>
                </ProfileSection>

                <ProfileSection eyebrow="PERSONA" title="人格兽">
                  {hasPersonaSignals ? (
                    <div className="persona-beast">
                      <div className="beast-mark">{firstLetter(nickname)}</div>
                      <div>
                        <b>{tags[0] ?? '待确认的人格线索'}</b>
                        <span>{icebreakers[0] ?? '还没有足够资料生成稳定的人格描述。'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="profile-empty">{sparseProfileHint}</div>
                  )}
                </ProfileSection>

                <ProfileSection eyebrow="NEEDS" title="最近需求">
                  <div className="need-card">
                    <b>我最近想找</b>
                    <span>{wants.join('、') || sparseProfileHint}</span>
                  </div>
                  {icebreakers.length > 0 && <div className="icebreaker-strip">{icebreakers.join('、')}</div>}
                </ProfileSection>

                <div className="summary-card compact">
                  <SummaryRow title="我能提供">{offers.join('、') || sparseProfileHint}</SummaryRow>
                  <SummaryRow title="我正在寻找">{wants.join('、') || sparseProfileHint}</SummaryRow>
                </div>
                <div className="sticky-actions">
                  <button className="primary-action lime" onClick={() => setStep('find')}>
                    让 Agent 帮我找人
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 'share' && profile && (
            <section className="share-screen">
              <Header title="Share Card" action="↓" />
              <div className="content">
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
                  <button className="primary-action lime">保存 / 分享海报</button>
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
                  <button className="primary-action lime" onClick={findPeople}>
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
              <Header title="Top Matches" action="↻" />
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
                  {recommendations.map((candidate) => (
                    <button
                      className="candidate-card"
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
                      </span>
                      <strong className={recordedConnectionIds.includes(candidate.id) ? 'connection-status-pill' : ''}>
                        {recordedConnectionIds.includes(candidate.id) ? '已记录' : `${candidate.score}%`}
                      </strong>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {step === 'candidate' && selectedCandidate && (
            <section className="candidate-screen">
              <Header title="Candidate" action="☆" />
              <div className="content">
                <div className="candidate-hero">
                  <span className="candidate-avatar big">{selectedCandidate.avatar}</span>
                  <h2>{selectedCandidate.name}</h2>
                  <p>{selectedCandidate.role}</p>
                  <div className="tags">
                    {selectedCandidate.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="summary-card compact">
                  <SummaryRow title={`为什么推荐 · ${selectedCandidate.score}%`}>{selectedCandidate.reason}</SummaryRow>
                  <SummaryRow title="他能提供">{selectedCandidate.offer}</SummaryRow>
                  <SummaryRow title="建议聊什么">{selectedCandidate.topic}</SummaryRow>
                </div>
                <div className="sticky-actions">
                  <button className="primary-action lime" onClick={() => setStep('icebreaker')}>
                    生成破冰话术
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

          {showBottomNav && <BottomNav currentStep={step} onNavigate={setStep} />}
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

function Header({ title, action }: { title: string; action: string }) {
  return (
    <div className="topbar">
      <span className="brand">{title}</span>
      <span className="round-icon">{action}</span>
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

function BottomNav({ currentStep, onNavigate }: { currentStep: FlowStep; onNavigate: (step: FlowStep) => void }) {
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
      <button className={activeKey === 'card' ? 'active' : ''} onClick={() => onNavigate('card')}>
        <b>◈</b>
        <span>我的Agent</span>
      </button>
      <button className={activeKey === 'find' ? 'active' : ''} onClick={() => onNavigate('find')}>
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
