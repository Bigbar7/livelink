'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';

type FlowStep = 'home' | 'input' | 'generating' | 'card' | 'share' | 'find' | 'matches' | 'candidate' | 'icebreaker';
type InputMode = 'text' | 'file' | 'link';

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: { message: string };
};

type AgentProfile = {
  id: string;
  userId: string;
  agentId: string;
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

type RecommendationItem = {
  profile: AgentProfile;
  score: number;
  reason: string;
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

const promptSuggestions = ['我是谁', '现在做什么', '做过什么项目', '我能提供', '我想找谁'];

const sampleText =
  '我现在在做一个 AI 价值社交产品，希望帮助用户生成数字分身名片，并基于个人价值和需求推荐值得认识的人。我擅长产品定义、移动端原型和路演叙事，正在寻找硬件工程师、AI 工程化伙伴和早期投资资源。';

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

function profileToCandidate(item: RecommendationItem): CandidateView {
  const tags = parseJsonList(item.profile.tagsJson);
  const offers = parseJsonList(item.profile.offersJson);
  const icebreakers = parseJsonList(item.profile.icebreakersJson);

  return {
    id: item.profile.id,
    userId: item.profile.userId,
    name: item.profile.headline.split('·')[0]?.trim() || item.profile.headline,
    role: item.profile.headline,
    avatar: firstLetter(item.profile.headline),
    tags,
    score: Math.max(item.score, 60),
    reason: item.reason,
    offer: offers.join('、') || item.profile.bio,
    topic: icebreakers[0] || '围绕彼此的能力、需求和合作场景展开交流'
  };
}

async function readApi<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
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
  const [nickname, setNickname] = useState('Jun');
  const [mode, setMode] = useState<InputMode>('text');
  const [pasteText, setPasteText] = useState(sampleText);
  const [fileName, setFileName] = useState('');
  const [linkText, setLinkText] = useState('https://github.com/jun/livelink\nhttps://www.xiaohongshu.com/user/profile/demo');
  const [isRecording, setIsRecording] = useState(false);
  const [generated, setGenerated] = useState<GeneratedAgentResponse | null>(null);
  const [residentProfiles, setResidentProfiles] = useState<AgentProfile[]>([]);
  const [recommendations, setRecommendations] = useState<CandidateView[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateView | null>(null);
  const [findQuery, setFindQuery] = useState('我在做 AI 社交名片，想找一位懂嵌入式硬件和供应链的工程师做队友。');
  const [error, setError] = useState('');
  const [isBooting, setIsBooting] = useState(true);

  const profile = generated?.profile;
  const tags = parseJsonList(profile?.tagsJson);
  const offers = parseJsonList(profile?.offersJson);
  const wants = parseJsonList(profile?.wantsJson);
  const icebreakers = parseJsonList(profile?.icebreakersJson);
  const hasGenerated = Boolean(generated);
  const showBottomNav = hasGenerated && step !== 'home' && step !== 'generating';

  const activeText = useMemo(() => {
    if (mode === 'text') return pasteText;
    if (mode === 'file') return fileName ? `用户上传了文件：${fileName}` : '';
    return linkText;
  }, [fileName, linkText, mode, pasteText]);

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

  const startCreate = () => setShowNameModal(true);

  const confirmName = () => {
    setShowNameModal(false);
    setStep('input');
  };

  const mockRecord = () => {
    setIsRecording((current) => !current);
    const voiceText =
      '我现在在做 AI 价值社交产品，擅长产品闭环、原型设计和路演叙事，想找硬件工程师和 AI 工程化伙伴。';
    setPasteText(voiceText);
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const generateAgent = async () => {
    setError('');
    setStep('generating');

    const links = mode === 'link' ? linkText.split('\n').map((url) => url.trim()).filter(Boolean).map((url) => ({ url })) : [];

    try {
      const data = await readApi<GeneratedAgentResponse>('/api/agents/generate-profile', {
        method: 'POST',
        body: JSON.stringify({
          displayName: nickname,
          text: mode === 'text' ? activeText : undefined,
          fileName: mode === 'file' ? fileName : undefined,
          fileText: mode === 'file' ? activeText : undefined,
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

  const findPeople = async () => {
    if (!generated) return;
    setError('');
    const interests = [...wants, ...findQuery.split(/[，,\s]+/)].filter(Boolean).slice(0, 8);
    const search = new URLSearchParams({ userId: generated.user.id });
    interests.forEach((interest) => search.append('interest', interest));

    try {
      const data = await readApi<RecommendationItem[]>(`/api/recommendations?${search.toString()}`);
      const candidates = data.map(profileToCandidate);
      setRecommendations(candidates);
      if (candidates[0]) setSelectedCandidate(candidates[0]);
      setStep('matches');
    } catch (recommendationError) {
      setError(recommendationError instanceof Error ? recommendationError.message : '推荐失败');
    }
  };

  const createConnection = async () => {
    if (!generated || !selectedCandidate) return;
    const message = buildIcebreaker(nickname, selectedCandidate, offers);
    await navigator.clipboard?.writeText(message);

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
    } catch {
      // 文案复制成功即可；连接失败时不阻塞用户继续外部联系。
    }
  };

  return (
    <main className={`app-shell step-${step}`}>
      <div className="phone">
        <div className={`screen ${step === 'generating' || step === 'share' ? 'dark' : ''} ${showBottomNav ? 'has-bottom-nav' : ''}`}>
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
              <ResidentProfiles profiles={residentProfiles} />
              {showNameModal && (
                <div className="modal-backdrop">
                  <div className="name-modal">
                    <h2>先给 Agent 一个名字</h2>
                    <p>我们会用这个昵称生成你的数字分身，后面可以随时修改。</p>
                    <label className="text-field">
                      <span>你的昵称</span>
                      <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
                    </label>
                    <button className="primary-action lime" onClick={confirmName}>
                      确认生成
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 'input' && (
            <section className="input-screen">
              <Header title={`Hi, ${nickname || '你好'}`} action="?" />
              <div className="content">
                <Pill>首次生成 · 让 Agent 认识你</Pill>
                <h2 className="page-title">
                  选择一种
                  <br />
                  <mark>输入方式</mark>
                </h2>
                <p className="muted">资料会进入后端数据库，生成你的 Agent Profile。</p>
                {error && <p className="error-text">{error}</p>}
                <div className="mode-tabs">
                  <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>
                    文本
                  </button>
                  <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
                    文件
                  </button>
                  <button className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>
                    链接
                  </button>
                </div>
                {mode === 'text' && (
                  <>
                    <div className="voice-panel compact-voice">
                      <span className={`record-dot ${isRecording ? 'recording' : ''}`} />
                      <b>可选：语音转文字</b>
                      <button className="primary-action lime" onClick={mockRecord}>
                        {isRecording ? '结束' : '试用'}
                      </button>
                    </div>
                    <div className="paste-panel">
                      <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} />
                      <div className="prompt-list">
                        {promptSuggestions.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {mode === 'file' && (
                  <div className="upload-panel">
                    <div className="file-card">PDF</div>
                    <b>{fileName || '上传简历 / BP / 作品集'}</b>
                    <span>当前先上传文件名并进入后端生成链路，后续接入真实文件解析。</span>
                    <input id="resume-upload" type="file" onChange={handleFile} />
                    <label htmlFor="resume-upload">选择文件</label>
                  </div>
                )}
                {mode === 'link' && (
                  <div className="link-panel">
                    <b>粘贴公开链接</b>
                    <span>支持 GitHub、小红书、B站、作品集、博客、Notion 公开页等。每行一个链接。</span>
                    <textarea value={linkText} onChange={(event) => setLinkText(event.target.value)} />
                    <div className="prompt-list">
                      <span>GitHub</span>
                      <span>小红书</span>
                      <span>B站</span>
                      <span>作品集</span>
                    </div>
                  </div>
                )}
                <div className="sticky-actions">
                  <button className="primary-action" onClick={generateAgent}>
                    提交并生成 Agent
                  </button>
                </div>
              </div>
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
              <Header title="My Agent" action="⋯" />
              <div className="content">
                <div className="agent-card profile-card">
                  <div className="avatar">{firstLetter(nickname)}</div>
                  <h3>{profile.headline}</h3>
                  <p>{profile.bio}</p>
                  <div className="tags">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="summary-card compact">
                  <SummaryRow title="我能提供">{offers.join('、') || '继续补充资料后生成'}</SummaryRow>
                  <SummaryRow title="我正在寻找">{wants.join('、') || '继续补充需求后生成'}</SummaryRow>
                  <SummaryRow title="破冰话题">{icebreakers.join('、') || '生成后可用于连接开场'}</SummaryRow>
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
                <p className="muted">Agent 会结合你的名片和需求，从已发布的真实 AgentProfile 中推荐。</p>
                {error && <p className="error-text">{error}</p>}
                <label className="query-box">
                  <span>我的需求</span>
                  <textarea value={findQuery} onChange={(event) => setFindQuery(event.target.value)} />
                </label>
                <div className="prompt-list">
                  <span>找队友</span>
                  <span>找投资人</span>
                  <span>找工程师</span>
                  <span>找设计师</span>
                </div>
                <div className="sticky-actions">
                  <button className="primary-action lime" onClick={findPeople}>
                    生成推荐列表
                  </button>
                </div>
              </div>
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
                      <strong>{candidate.score}%</strong>
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
                  <SummaryRow title="连接动作">点击复制时会尝试创建后端连接请求，并复制破冰文案。</SummaryRow>
                  <SummaryRow title="附带内容">自动附带你的 Agent 名片链接，让对方快速理解你是谁。</SummaryRow>
                </div>
                <div className="sticky-actions">
                  <button className="primary-action lime" onClick={createConnection}>
                    复制文案并记录连接
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
        <b>已入驻 Agent</b>
        <span>真实发布</span>
      </div>
      <div className="resident-list">
        {profiles.length === 0 ? (
          <div className="resident-empty">暂无已发布名片，生成后会出现在这里。</div>
        ) : (
          profiles.map((profile) => (
            <div className="resident-card" key={profile.id}>
              <span>{firstLetter(profile.headline)}</span>
              <div>
                <b>{profile.headline.split('·')[0]?.trim() || profile.headline}</b>
                <small>{profile.headline}</small>
                <em>{parseJsonList(profile.tagsJson).slice(0, 2).join(' / ') || 'Agent Profile'}</em>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function buildIcebreaker(nickname: string, candidate: CandidateView, offers: string[]) {
  return `你好${candidate.name}，我是 ${nickname || 'Jun'}。我刚在 Livelink 生成了自己的 Agent 名片，看到你在 ${candidate.tags[0] ?? candidate.role} 方向有相关经验，感觉我们可以聊聊「${candidate.topic}」。我这边能提供 ${offers.slice(0, 2).join('、') || '产品和 AI 应用落地经验'}，这是我的 Agent 名片：livelink.app/u/${nickname || 'jun'}-agent`;
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
        <span>生成</span>
      </button>
      <button className={activeKey === 'card' ? 'active' : ''} onClick={() => onNavigate('card')}>
        <b>◈</b>
        <span>名片</span>
      </button>
      <button className={activeKey === 'find' ? 'active' : ''} onClick={() => onNavigate('find')}>
        <b>⌕</b>
        <span>找人</span>
      </button>
      <button className={activeKey === 'connect' ? 'active' : ''} onClick={() => onNavigate('icebreaker')}>
        <b>✉</b>
        <span>破冰</span>
      </button>
    </nav>
  );
}
