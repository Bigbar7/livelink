import './evolution-preview.css';

const creationInputs = [
  {
    title: '直接粘贴文本',
    body: '适合已有自我介绍、项目经历、BP 摘要或一段随手写下的近况。',
    meta: '默认推荐'
  },
  {
    title: '上传附件',
    body: '简历、作品集、项目文档、路演稿都可以先作为原始资料进入生成链路。',
    meta: '资料很多'
  },
  {
    title: '上传链接',
    body: 'GitHub、博客、作品集、小红书、B 站等公开页面可作为补充信号。',
    meta: '公开身份'
  }
];

const evolutionMessages = [
  {
    speaker: 'AI',
    text: '系统识别到你已有分身。今天想更新近况、补充项目、调整定位，还是更新你想找的人？'
  },
  {
    speaker: '你',
    text: '我最近开始做硬件 AI 项目，想找供应链和嵌入式伙伴。'
  },
  {
    speaker: 'AI',
    text: '我会把你的定位从「AI 社交产品」增强为「硬件 AI 方向的产品创始人」，并新增一个近期需求。这样准确吗？'
  }
];

const profileSignals = ['定位：硬件 AI 产品创始人', '能力：产品定义 / 原型 / 路演叙事', '需求：供应链伙伴 / 嵌入式工程师', '风格：直接、敏锐、重视落地'];

export default function EvolutionPreviewPage() {
  return (
    <main className="evolution-preview-shell">
      <section className="preview-hero">
        <div>
          <span className="preview-kicker">Standalone interaction prototype</span>
          <h1>
            一个入口，
            <br />
            两种状态
          </h1>
        </div>
        <p>
          不需要两个分页。没有分身时进入创建分身；已有分身时直接进入进化分身。AI 对话在创建阶段是辅助入口，在进化阶段是主入口。
        </p>
      </section>

      <section className="state-switch-rail" aria-label="用户状态决定页面">
        <article>
          <b>没有分身时</b>
          <span>创建分身 · 多资料入口</span>
        </article>
        <i />
        <article>
          <b>已有分身时</b>
          <span>进化分身 · AI 对话主入口</span>
        </article>
      </section>

      <div className="preview-grid">
        <section className="creation-board" aria-label="创建分身">
          <div className="board-title">
            <span>首次使用</span>
            <h2>创建分身</h2>
            <p>核心是快速收集足够原始资料，所以保留粘贴、附件、链接；AI 对话只作为“不会写”的辅助入口。</p>
          </div>

          <div className="input-card primary">
            <b>直接粘贴文本</b>
            <textarea defaultValue="" placeholder="粘贴你的介绍、经历、项目、能力、需求..." />
          </div>

          <div className="creation-inputs">
            {creationInputs.map((input) => (
              <article className="input-card" key={input.title}>
                <span>{input.meta}</span>
                <b>{input.title}</b>
                <p>{input.body}</p>
              </article>
            ))}
          </div>

          <div className="ai-helper-strip">
            <div>
              <b>不知道怎么写？</b>
              <span>和 AI 聊几句，AI 会把回答整理回文本框。</span>
            </div>
            <button>和 AI 聊几句</button>
          </div>

          <button className="preview-action">生成我的分身</button>
        </section>

        <section className="evolution-chat" aria-label="进化分身">
          <div className="board-title">
            <span>再次进入</span>
            <h2>进化分身</h2>
            <p>AI 对话是主入口。用户只要说变化，AI 追问、确认并把本轮信息沉淀进分身。</p>
          </div>

          <div className="profile-summary">
            {profileSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>

          <div className="chat-window">
            {evolutionMessages.map((message, index) => (
              <div className={`chat-bubble ${message.speaker === '你' ? 'mine' : 'ai'}`} key={`${message.speaker}-${index}`}>
                <em>{message.speaker}</em>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          <div className="quick-prompts">
            <button>更新近况</button>
            <button>补充项目</button>
            <button>调整定位</button>
            <button>更新需求</button>
          </div>

          <div className="chat-composer">
            <input placeholder="告诉我最近发生了什么，或想让分身怎么变化..." />
            <button>发送</button>
          </div>

          <button className="preview-action lime">保存并优化</button>
        </section>
      </div>
    </main>
  );
}
