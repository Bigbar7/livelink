const radarSteps = ['理解我的需求', '扫描已发布 Agent', '阅读候选分身', '预判互补关系', '生成推荐证据'];

const traceMessages = [
  {
    from: '我的 Agent',
    to: '候选 Agent',
    title: '发起探询',
    text: '我正在为主人寻找 AI 社交 Demo 的工程化伙伴。你当前是否开放早期项目协作？'
  },
  {
    from: '候选 Agent',
    to: '我的 Agent',
    title: '返回可用信息',
    text: '她最近关注多模态原型、快速 Demo 和产品场景验证，偏好先从小范围共创开始。'
  },
  {
    from: '我的 Agent',
    to: '候选 Agent',
    title: '交换互补点',
    text: '我方能提供产品定义、用户场景和路演叙事，缺少工程化落地伙伴。'
  },
  {
    from: '候选 Agent',
    to: '我的 Agent',
    title: '确认推荐窗口',
    text: '存在合作窗口，但需要真人首次沟通确认投入周期和 Demo 范围。'
  }
];

const candidates = [
  {
    name: '陈若宁',
    role: 'AI 工程化 / 多模态原型',
    score: 92,
    type: '能力互补',
    reason: '她的工程化落地经验，刚好补足你在产品定义之后的实现短板。',
    evidence: ['已读 9 条履历亮点', '识别 3 个共同语境', '发现 1 个当前合作窗口']
  },
  {
    name: '梁景辰',
    role: '硬件供应链 / 嵌入式',
    score: 86,
    type: '资源互补',
    reason: '他正在寻找产品叙事伙伴，你正在寻找硬件队友，双方需求可以互换。',
    evidence: ['已读领域画像', '需求存在交叉', '需确认时间投入']
  },
  {
    name: 'Mia Zhao',
    role: '社区增长 / 线下活动',
    score: 78,
    type: '场景扩展',
    reason: '她能把你的 AI 社交名片带到线下社区验证，但合作边界需要先对齐。',
    evidence: ['活动资源匹配', '用户画像接近', '商业目标待确认']
  }
];

const reportItems = [
  ['互补性', '你有产品定义和路演叙事，她有工程化实现与多模态 Demo 能力。'],
  ['共同语境', '双方都在关注 Agent 如何进入真实社交和协作场景。'],
  ['当前时机', '你正在找早期搭建伙伴，她最近的需求是寻找可落地的产品场景。'],
  ['不确定点', '她是否愿意投入长期项目，需要在第一次沟通中确认。']
];

const briefCards = [
  {
    title: '双方 Agent 预对齐摘要',
    text: '你的 Agent 已向对方分身提取近期关注、合作偏好和可交换价值，判断这次连接适合从“AI 社交产品如何快速落地 Demo”切入。'
  },
  {
    title: '第一句话',
    text: '你好若宁，我的 Agent 看到你最近在做多模态原型和工程化落地，我这边正在做 AI 价值社交产品，感觉我们可以从一个小 Demo 场景聊起。'
  },
  {
    title: '15 分钟沟通提纲',
    text: '前 3 分钟确认彼此正在做什么；中间 8 分钟讨论 Demo 场景和分工；最后 4 分钟确认是否值得约下一次具体共创。'
  }
];

export default function AgentIntroLabPage() {
  return (
    <main className="intro-lab-shell">
      <section className="intro-lab-hero">
        <p className="lab-pill">A-to-A concept · 不修改现有发现页和破冰页</p>
        <h1>
          Agent 先替你认识人，
          <br />
          再把值得连接的人交给你
        </h1>
        <p>
          这是一版独立对比页面：把发现页升级为 Agent Radar，把推荐详情升级为 Match Report，把破冰页升级为 Intro Brief。当前 A-to-A 对话为模拟过程，不是实时真实 Agent 对话记录。
        </p>
      </section>

      <section className="lab-board" aria-label="A to A discovery and icebreaker prototype">
        <div className="lab-phone radar-phone">
          <div className="lab-topbar">
            <span>Agent Radar</span>
            <b>01</b>
          </div>
          <div className="radar-orb">
            <span>我的 Agent</span>
            <i />
          </div>
          <div className="lab-input-card">
            <small>我的任务</small>
            <strong>帮我找一位能把 AI 社交名片做成可演示 Demo 的工程化伙伴。</strong>
          </div>
          <div className="radar-steps">
            {radarSteps.map((step, index) => (
              <div className={index < 3 ? 'active' : ''} key={step}>
                <em>{String(index + 1).padStart(2, '0')}</em>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <details className="agent-trace">
            <summary>
              <span>A-to-A 搜索过程 · 模拟过程</span>
              <b>用户可选查看</b>
            </summary>
            <div className="trace-thread">
              {traceMessages.map((message) => (
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
          <div className="candidate-stack">
            {candidates.map((candidate) => (
              <article className="lab-candidate-card" key={candidate.name}>
                <div>
                  <span>{candidate.type}</span>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.role}</p>
                </div>
                <strong>{candidate.score}%</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="lab-phone report-phone">
          <div className="lab-topbar">
            <span>Match Report</span>
            <b>02</b>
          </div>
          <div className="report-hero">
            <span>建议联系</span>
            <h2>陈若宁</h2>
            <p>匹配度 92% · 能力互补 · 当前窗口明确</p>
          </div>
          <div className="evidence-panel">
            <b>Agent 已读证据</b>
            <div>
              {candidates[0].evidence.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <div className="report-list">
            {reportItems.map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="lab-phone brief-phone">
          <div className="lab-topbar">
            <span>Intro Brief</span>
            <b>03</b>
          </div>
          <div className="brief-status">
            <span>示例预对齐 · 非真实对话记录</span>
            <strong>可以发起连接</strong>
          </div>
          <div className="brief-cards">
            {briefCards.map((card) => (
              <article key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
          <div className="brief-actions">
            <button>复制微信话术</button>
            <button>更像我说话</button>
          </div>
        </div>
      </section>
    </main>
  );
}
