# Livelink 技术方案：个人知识库、Wiki 与 AI 名片 MVP

## 1. 当前技术决策

当前开发目标是支撑用户通过公开链接素材构建个人知识库，生成个人 Wiki，并从 Wiki 派生 AI 名片、搜索推荐和连接闭环，因此技术方案优先满足：

- H5 移动端优先，适合微信内打开和扫码访问。
- 个人 Wiki 是核心知识资产，AI 名片是适合扫码和社交转化的压缩展示层。
- 低成本 Demo 身份，避免复杂登录阻塞创建流程。
- 公开链接导入是一阶段亮点能力，首版支持用户粘贴可公开访问的 URL。
- 链接抓取、内容清洗、AI 知识抽取、Wiki 生成都必须可降级，失败时允许用户手动补充摘要。
- AI 生成必须有 Mock 兜底。
- 搜索和推荐优先基于个人 Wiki 和结构化事实，先用 PostgreSQL 文本搜索与规则推荐实现。
- 数据模型保留后续简历上传、录音转写、场景标签、LBS、向量检索和 Agent to Agent 扩展空间。

首版建议：

```text
Next.js App Router
TypeScript
Tailwind CSS
API Routes / Server Actions
Prisma ORM
本地开发 SQLite，正式云端 PostgreSQL
OpenAI / 兼容大模型 API
fetch + cheerio / Readability 抓取和清洗公开网页
qrcode 生成个人名片二维码
zod 做输入校验和 AI 输出校验
localStorage 保存当前 Demo 用户上下文
```

数据库选型原则：

- 本地开发和极短期 Demo 可以使用 SQLite，降低初始化成本。
- 给外部用户使用或部署到云端服务器时，必须使用 PostgreSQL，避免 SQLite 在多实例、持久化、并发写入和备份上的限制。
- Prisma schema 设计以 PostgreSQL 为正式目标，SQLite 只作为本地开发适配。
- 部署优先选择 `Vercel + Supabase Postgres / Neon`；如果使用自有云服务器，则采用 `Docker + PostgreSQL + Nginx/Caddy`。

## 2. 为什么先用 H5

- 个人名片链接可以直接分享和扫码访问。
- 微信内访问、分享和二维码传播成本最低。
- 便于快速部署和迭代。
- 保持纯 Web 形态，减少套壳和多端维护成本。
- Demo 阶段需要备用链接和网页兜底。

## 3. 目标架构

```text
H5 Frontend
  ├─ 首页 /
  ├─ 快速创建 /create
  ├─ 素材处理状态 /sources/[batchId]
  ├─ 编辑发布 /card/edit/[id]
  ├─ 个人名片 /u/[slug]
  ├─ 个人 Wiki /u/[slug]/wiki
  ├─ 搜索 /search
  ├─ 推荐 /explore
  ├─ 连接记录 /connections
  └─ 我的名片 /me

API Layer
  ├─ 用户 / Demo 身份 API
  ├─ 链接素材抓取 API
  ├─ 知识抽取 API
  ├─ 个人 Wiki 生成 API
  ├─ Agent 名片生成 API
  ├─ 名片发布和公开页 API
  ├─ 搜索 API
  ├─ 推荐 API
  ├─ 连接 API
  └─ 访问记录 API

Service Layer
  ├─ userService
  ├─ profileService
  ├─ sourceDocumentService
  ├─ contentFetchService
  ├─ knowledgeExtractionService
  ├─ wikiGenerationService
  ├─ aiGenerationService
  ├─ searchService
  ├─ recommendationService
  ├─ connectionService
  └─ qrCodeService

Data Layer
  ├─ users
  ├─ source_documents
  ├─ profile_facts
  ├─ profile_projects
  ├─ profile_wikis
  ├─ agent_profiles
  ├─ connection_requests
  ├─ card_visits
  └─ recommendation_candidates
```

## 4. 推荐项目结构

```text
src/
  app/
    page.tsx
    create/page.tsx
    sources/[batchId]/page.tsx
    card/edit/[id]/page.tsx
    u/[slug]/page.tsx
    u/[slug]/wiki/page.tsx
    search/page.tsx
    explore/page.tsx
    connections/page.tsx
    me/page.tsx
    api/
      health/route.ts
      sources/import/route.ts
      sources/[id]/route.ts
      knowledge/extract/route.ts
      wiki/generate/route.ts
      agent/generate/route.ts
      agent/publish/route.ts
      profiles/[slug]/route.ts
      search/route.ts
      recommendations/route.ts
      connections/route.ts
  components/
    profile/
    forms/
    layout/
    qr/
    search/
    recommendation/
    ui/
  features/
    profile/
    onboarding/
    search/
    recommendation/
    connection/
  lib/
    ai/
    content-fetch/
    knowledge/
    wiki/
    db/
    demo-data/
    qrcode/
    validation/
  services/
    profile-service.ts
    source-document-service.ts
    content-fetch-service.ts
    knowledge-extraction-service.ts
    wiki-generation-service.ts
    search-service.ts
    recommendation-service.ts
    connection-service.ts
    ai-generation-service.ts
  types/
    profile.ts
    recommendation.ts
    connection.ts
```

原则：页面只负责 UI 和路由，业务逻辑放到 `services`，方便后续接入独立后端或更多 Web 场景。

## 5. 前端设计

### 5.1 页面职责

| 页面 | 职责 |
| --- | --- |
| `/` | 产品介绍、创建入口、展示价值主张 |
| `/create` | 手动录入基础信息，并提交公开链接素材 |
| `/sources/[batchId]` | 展示链接抓取、内容清洗和知识抽取进度，失败项允许手动补充摘要 |
| `/card/edit/[id]` | 从个人 Wiki 派生出的 AI 名片编辑确认页，允许继续编辑所有关键信息 |
| `/u/[slug]` | 公开个人名片页，用于扫码和分享 |
| `/u/[slug]/wiki` | 公开个人 Wiki 页，用于深度了解用户背景、项目、技能、观点和来源 |
| `/search` | 按关键词、标签、技能和需求搜索名片 |
| `/explore` | 推荐对象和匹配理由 |
| `/connections` | 连接请求和连接记录 |
| `/me` | 我的名片、二维码、连接概览 |

### 5.2 移动端体验要求

- 首屏表达清楚“用公开素材生成你的个人 Wiki 和 AI 名片”。
- 手动录入字段用于兜底，公开链接素材是产品亮点入口。
- 表单字段少，优先按钮、标签、多选降低输入成本。
- 链接抓取和 AI 提炼后必须进入编辑确认页，不能直接发布。
- Wiki 页面必须展示 Sources，帮助用户和访问者理解内容来源。
- 发布后的名片页要立即给用户成就感和分享欲，但模板结构需可扩展。
- 搜索和推荐结果要突出匹配理由。
- 所有 CTA 必须明显：生成、发布、分享、搜索、查看推荐、发起连接。

### 5.3 状态设计

- `localStorage.currentUserId`：当前 Demo 用户。
- `localStorage.profileDraft`：名片录入草稿，防止刷新丢失。
- `localStorage.sourceDraft`：用户粘贴的链接素材草稿。
- 服务端数据库保存正式发布数据。

## 6. 后端设计

### 6.1 后端职责

- Demo 用户创建和识别。
- 在没有链接的情况下，仅基于手动录入信息也能生成 Wiki 和名片。
- 抓取用户提交的公开 URL，保存原始标题、正文摘要、抓取状态和错误原因。
- 清洗网页内容，去除脚本、导航、广告和明显噪音。
- 调用 AI 从素材中抽取事实、项目、技能、话题、可提供能力和想认识的人。
- 保存结构化个人知识库，并保留事实到素材来源的引用。
- 基于知识库生成个人 Wiki。
- 从个人 Wiki 派生 AI 名片草稿。
- 发布公开名片主页。
- 搜索已发布名片和公开 Wiki 摘要。
- 生成推荐候选和推荐理由。
- 创建连接请求和记录访问。

### 6.2 API 范围

#### 必做 API

| API | 方法 | 说明 |
| --- | --- | --- |
| `/api/health` | GET | 健康检查 |
| `/api/sources/import` | POST | 导入公开链接，抓取正文并保存 source_documents |
| `/api/sources/:id` | GET | 查询单个素材的抓取和抽取状态 |
| `/api/knowledge/extract` | POST | 从素材中抽取 profile_facts 和 profile_projects |
| `/api/wiki/generate` | POST | 基于知识库生成 profile_wikis |
| `/api/agent/generate` | POST | 基于个人 Wiki 生成名片草稿 |
| `/api/agent/publish` | POST | 发布个人名片主页 |
| `/api/profiles/:slug` | GET | 获取公开个人名片 |
| `/api/search` | GET | 搜索已发布名片 |
| `/api/recommendations` | GET | 获取推荐对象 |
| `/api/connections` | GET/POST | 获取或创建连接请求 |
| `/api/visits` | POST | 记录名片访问 |

#### 可选 API

| API | 方法 | 说明 |
| --- | --- | --- |
| `/api/resume/parse` | POST | 简历上传和解析，后续迭代 |
| `/api/audio/transcribe` | POST | 录音转写，后续迭代 |
| `/api/scenes/join` | POST | 加入场景标签，后续迭代 |

## 7. 数据模型

### 7.1 users

```ts
type User = {
  id: string
  displayName: string
  role: string
  city?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

黑客松阶段不强制手机号或微信登录。

### 7.2 source_documents

```ts
type SourceDocument = {
  id: string
  userId: string
  profileId?: string
  url: string
  sourceType: 'github' | 'gitee' | 'portfolio' | 'blog' | 'article' | 'notion' | 'other'
  title?: string
  description?: string
  rawText?: string
  cleanedText?: string
  contentHash?: string
  fetchStatus: 'pending' | 'fetched' | 'failed' | 'manual'
  extractionStatus: 'pending' | 'extracted' | 'failed' | 'manual'
  userNote?: string
  errorReason?: string
  createdAt: Date
  updatedAt: Date
}
```

### 7.3 profile_facts

```ts
type ProfileFact = {
  id: string
  userId: string
  profileId?: string
  sourceDocumentId?: string
  factType: 'identity' | 'skill' | 'experience' | 'project' | 'topic' | 'offer' | 'want' | 'achievement' | 'link'
  title: string
  summary?: string
  evidenceText?: string
  sourceUrl?: string
  confidence: number
  visibility: 'public' | 'limited' | 'private'
  createdAt: Date
  updatedAt: Date
}
```

### 7.4 profile_projects

```ts
type ProfileProject = {
  id: string
  userId: string
  profileId?: string
  name: string
  role?: string
  summary: string
  techStack: string[]
  links: string[]
  sourceDocumentIds: string[]
  createdAt: Date
  updatedAt: Date
}
```

### 7.5 profile_wikis

```ts
type ProfileWiki = {
  id: string
  userId: string
  profileId?: string
  version: number
  status: 'draft' | 'generated' | 'user_confirmed' | 'published'
  contentJson: {
    overview: {
      headline: string
      summary: string
      highlights: string[]
    }
    projects: Array<{
      name: string
      role?: string
      summary: string
      links: string[]
      evidenceSourceIds: string[]
    }>
    skills: string[]
    topics: string[]
    offers: string[]
    wants: string[]
    sources: Array<{
      sourceDocumentId: string
      title?: string
      url: string
    }>
  }
  markdown?: string
  createdAt: Date
  updatedAt: Date
}
```

个人 Wiki 以 `contentJson + markdown` 形式存在：JSON 用于页面结构、搜索、推荐和后续 Agent 问答，Markdown 用于快速渲染和版本预览。

### 7.6 agent_profiles

```ts
type AgentProfile = {
  id: string
  userId: string
  wikiId?: string
  slug: string
  status: 'draft' | 'ai_generated' | 'user_confirmed' | 'published'
  headline: string
  bio: string
  tags: string[]
  skills: string[]
  interests: string[]
  offers: string[]
  wants: string[]
  icebreakers: string[]
  matchKeywords: string[]
  sceneTags: string[]
  templateKey: 'default' | 'value_card' | 'wiki_card' | 'social'
  aiSuggestions?: Record<string, unknown>
  userConfirmedAt?: Date
  visibility: 'public' | 'limited'
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}
```

### 7.7 connection_requests

```ts
type ConnectionRequest = {
  id: string
  fromUserId: string
  toUserId: string
  source: 'profile_scan' | 'search' | 'recommendation' | 'shared_link'
  message?: string
  status: 'pending' | 'accepted' | 'ignored'
  createdAt: Date
  updatedAt: Date
}
```

### 7.8 card_visits

```ts
type CardVisit = {
  id: string
  profileId: string
  visitorUserId?: string
  source?: string
  createdAt: Date
}
```

### 7.9 recommendation_candidates

```ts
type RecommendationCandidate = {
  id: string
  userId: string
  targetUserId: string
  score: number
  reasons: string[]
  status: 'new' | 'viewed' | 'connected' | 'dismissed'
  createdAt: Date
}
```

### 7.10 后续场景标签模型

```ts
type SceneTag = {
  id: string
  code: string
  name: string
  type: 'event' | 'location' | 'community' | 'custom'
}

type ProfileSceneTag = {
  id: string
  profileId: string
  sceneTagId: string
  source: 'manual' | 'qr' | 'admin'
  createdAt: Date
}
```

场景标签用于后续活动、LBS 和同场景推荐，不作为当前 MVP 的主路径。

## 8. AI 知识抽取与 Wiki 生成方案

### 8.1 知识抽取输入

```ts
type KnowledgeExtractInput = {
  displayName: string
  role: string
  city?: string
  intro?: string
  sourceDocuments: Array<{
    id: string
    url: string
    title?: string
    cleanedText?: string
    userNote?: string
  }>
}
```

### 8.2 知识抽取输出 JSON Schema

```json
{
  "facts": [
    {
      "factType": "skill",
      "title": "AI 应用开发",
      "summary": "基于公开项目和文章判断用户长期关注 AI 应用开发",
      "evidenceText": "来源中的短证据片段",
      "sourceDocumentId": "src_123",
      "confidence": 0.86
    }
  ],
  "projects": [
    {
      "name": "Livelink",
      "role": "Builder",
      "summary": "AI 个人 Wiki 与社交名片产品",
      "techStack": ["Next.js", "AI"],
      "links": ["https://..."],
      "sourceDocumentIds": ["src_123"]
    }
  ]
}
```

### 8.3 Wiki 输出 JSON Schema

```json
{
  "overview": {
    "headline": "一句话个人定位",
    "summary": "基于素材和事实生成的个人 Wiki 概览",
    "highlights": ["代表性经历", "长期关注方向", "可连接价值"]
  },
  "projects": [],
  "skills": ["技能"],
  "topics": ["关注话题"],
  "offers": ["我能提供"],
  "wants": ["我想认识"],
  "sources": []
}
```

### 8.4 名片输出 JSON Schema

```json
{
  "headline": "一句话价值定位",
  "bio": "80-140 字个人介绍",
  "tags": ["AI", "创业", "后端"],
  "skills": ["技能标签"],
  "interests": ["兴趣标签"],
  "offers": ["我能提供的资源、能力或经验"],
  "wants": ["我想认识的人或需求"],
  "icebreakers": ["适合开启聊天的话题"],
  "matchKeywords": ["用于搜索推荐的关键词"]
}
```

### 8.5 生成原则

- 不编造教育、公司、融资、奖项等事实。
- 可以优化表达，但不能改变用户原意。
- Wiki 中的重要结论必须能追溯到素材来源或用户手动输入。
- 名片输出要适合别人快速理解和主动连接。
- 强调价值、需求、可聊话题和匹配线索。
- 内容必须可编辑，用户确认后才发布。

### 8.6 Mock 兜底

AI 调用失败时，根据用户输入和素材标题规则生成：

- headline：身份 + 项目方向 + 价值点。
- bio：用模板整合角色、技能、方向和需求。
- tags：合并技能、兴趣、方向关键词。
- icebreakers：根据项目方向和 wants 生成 3 条。
- matchKeywords：技能 + wants + interests。

## 9. 创建输入优先级

创建流程必须遵循：

```text
manualInput required
publicLinks recommended
manualSourceSummary fallback
```

后端生成个人 Wiki 和名片时以手动录入信息为最低可用输入。公开链接是核心亮点入口，但链接抓取失败不能阻塞用户继续创建。

## 10. 公开链接素材抓取方案

### 10.1 支持链接

- GitHub / Gitee：优先读取仓库名称、描述、README 和语言。
- 个人网站 / 作品集 / 博客 / 文章：抓取 title、meta description 和正文。
- Notion / 飞书公开页：能公开访问则按普通网页处理。
- 小红书等强限制平台：首版保存链接和用户补充说明，不承诺自动抓取。

### 10.2 内容清洗原则

- 设置抓取超时和正文长度上限。
- 移除 script、style、nav、footer、广告和明显重复文本。
- 保存 `rawText` 和 `cleanedText`，但公开页面默认只展示摘要和来源链接。
- 记录 `contentHash`，避免重复抓取同一内容。

### 10.3 安全与降级原则

- 只支持 `http` / `https` 公开 URL。
- 禁止抓取内网地址、本机地址和非网页协议。
- 链接抓取失败标记为 `failed/manual`，允许用户手动补充摘要。
- 用户手动补充摘要也会作为 `source_documents.userNote` 进入知识抽取。

### 10.4 链接导入输出

```ts
type SourceImportResult = {
  url: string
  sourceType: SourceDocument['sourceType']
  title?: string
  description?: string
  cleanedText?: string
  fetchStatus: 'fetched' | 'manual' | 'failed'
  reason?: string
}
```

## 11. 搜索方案

MVP 先做 PostgreSQL 文本搜索和标签搜索：

- 关键词匹配 Wiki overview、projects、skills、topics、offers、wants、名片 headline、bio、tags、matchKeywords。
- 支持标签筛选。
- 支持按城市筛选。
- 默认只搜索已发布公开名片。
- 搜索结果按匹配字段数量、关键词命中位置和更新时间排序。
- 后续扩展 embeddings + pgvector，用于语义搜索和 Agent 问答。

## 12. Wiki 与名片编辑确认

### 12.1 编辑确认原则

- AI 生成结果只作为草稿，不直接发布。
- 用户可以编辑 Wiki 的 overview、projects、skills、topics、offers、wants 和 sources 展示状态。
- 用户可以编辑名片的 headline、bio、tags、skills、interests、offers、wants、icebreakers。
- 从素材提炼出的项目、兴趣、需求和观点必须允许删除或改写。
- 发布时保存用户确认后的内容，同时可保留 AI 建议用于后续优化。

### 12.2 展示模板原则

- MVP 使用 `default` 模板。
- 不在当前阶段锁死最终个人名片展示形态。
- 数据层通过 `templateKey` 预留模板切换能力。
- 后续可扩展 Wiki 深度页、价值名片、简历主页、社交破冰、Agent 对话等展示方式。

## 13. 推荐系统方案

MVP 阶段基于个人 Wiki 和名片字段做规则匹配，不做复杂算法。

### 13.1 打分规则

| 规则 | 分数 |
| --- | --- |
| wants 命中对方 offers/skills | +30 |
| 技能互补 | +25 |
| 共同 Wiki topics / projects | +15 |
| 标签相同 | +10 |
| 同城市 | +5 |
| 同场景标签 | +5 |
| 已连接或本人 | 过滤 |

### 13.2 技能互补示例

- 产品 ↔ 前端 / 后端 / AI 工程师。
- 设计 ↔ 前端 / 产品。
- 创业者 ↔ 增长 / 投资 / 技术。
- AI 应用 ↔ 模型接入 / 后端 / 数据。

### 13.3 推荐理由模板

```text
你正在寻找 {userWant}，对方擅长 {targetSkill}，并且也关注 {commonTopic}，适合从 {icebreaker} 开始交流。
```

## 14. 二维码和链接设计

### 14.1 个人名片二维码

- 指向 `/u/[slug]`。
- 用于个人主页分享和扫码认识对方。
- 主页需记录访问来源。

### 14.2 分享链接

链接参数建议：

```text
/u/jane-ai-builder?source=profile_qr
/u/jane-ai-builder?source=shared_link
```

## 15. 后续扩展预留

### 15.1 多源信息整合

- 简历上传解析，并作为 source_documents 的一种来源。
- 录音转写。
- GitHub / Gitee / 小红书 / 作品集深度解析。
- 用户手动补充事实和经历。
- 每个事实保留来源引用和置信度。

### 15.2 分层授权

后续将 `profile_facts`、`profile_wikis` 和 `agent_profiles` 拆分为公开资料、定向资料和私密知识库：

- `public_facts`：公开展示。
- `limited_facts`：授权对象可见。
- `private_facts`：仅用户和 Agent 使用。

### 15.3 场景标签

场景标签用于表达“这个名片出现在某个活动、地点或社区”，比如黑客松、校园、咖啡聊天等。已有名片加入某个场景时，只增加标签和推荐上下文，不重新创建名片。

### 15.4 Agent to Agent

- Agent 基于个人 Wiki 和用户需求互相交换摘要。
- 系统输出匹配价值判断。
- 用户确认后转为真实连接。

## 16. 环境变量

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
AI_API_KEY=""
AI_BASE_URL=""
AI_MODEL=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

正式云端部署时：

```text
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## 17. 技术风险

| 风险 | 应对 |
| --- | --- |
| 微信内兼容问题 | 全程移动端和微信内真机测试 |
| AI JSON 解析失败 | 强 Schema、try/catch、Mock fallback |
| 链接抓取失败 | 标记 failed/manual，允许用户手动补充摘要 |
| 小红书抓取受限 | MVP 不承诺自动抓取，保存链接和用户说明 |
| AI 抽取编造事实 | 要求 evidenceSourceId，低置信度事实进入编辑确认，不自动发布 |
| 数据库接入拖慢 | 开发期可先 SQLite，正式部署前切 PostgreSQL，保持 Prisma 和 API 边界不变 |
| 二维码无法访问本地 | 使用公网部署或内网穿透，准备公开链接 |
| 录入提交失败 | localStorage 草稿 + 重试 |
| 推荐为空 | 预置 Demo 用户和规则 fallback |
