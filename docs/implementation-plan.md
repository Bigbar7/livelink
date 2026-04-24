# Livelink 个人 Wiki 与 AI 名片 MVP 开发计划

## 1. 当前执行目标

接下来开发目标是完成一个可用的个人 Wiki 与 AI 名片 MVP，重点是公开链接素材导入、个人知识库构建、个人 Wiki 生成、名片派生、搜索推荐和连接闭环：

```text
用户输入基础资料并粘贴公开链接
  → 系统抓取和清洗链接素材
  → AI 抽取事实、项目、技能、话题和需求
  → 生成结构化个人知识库
  → 生成个人 Wiki
  → 从 Wiki 派生 AI 名片
  → 用户编辑确认并发布 Wiki 和名片
  → 生成公开 Wiki、公开名片和二维码
  → 其他用户浏览 / 搜索 / 推荐发现名片
  → 发起连接申请
  → 沉淀连接记录
```

核心验收：用户能通过公开链接素材生成可编辑的个人 Wiki 和 AI 名片，其他用户能通过搜索或推荐发现这张名片，并发起连接。

## 2. 优先级原则

所有开发任务按以下顺序取舍：

1. 是否提升链接素材到个人 Wiki 的生成成功率。
2. 是否能让用户快速看到“AI 理解我”的结果。
3. 是否能让别人通过 Wiki 和名片快速理解用户。
4. 是否能产生搜索、推荐或连接闭环。
5. 是否能降低抓取、AI 和 Demo 演示风险。

如果功能不服务以上目标，放到后续迭代。

## 3. 每步验证原则

每完成一个里程碑，必须先验证，再进入下一步：

```text
实现功能
→ 运行自动化验证
→ 验证关键 API 或页面主路径
→ 验证失败场景和兜底
→ 记录验证结果
→ 再进入下一里程碑
```

默认验证命令：

```bash
npm run lint
npm run typecheck
npm run build
```

如果项目尚未配置对应脚本，该里程碑必须先补齐脚本，或明确记录暂时不可运行的原因。

## 4. 里程碑拆分

### M0：项目可运行

目标：建立 H5 + API 基础工程。

任务：

- 初始化 Next.js、TypeScript、Tailwind。
- 引入 Prisma、zod、qrcode、cheerio / Readability 和 AI SDK / OpenAI-compatible client。
- 配置基础页面布局和移动端样式。
- 建立 API Routes。
- 准备环境变量、数据库连接和 health check。

验收：

- 本地首页可访问。
- 手机通过局域网可访问。
- `/api/health` 返回正常。
- 运行 `npm run lint`、`npm run typecheck`、`npm run build`，全部通过后进入下一步。

### M1：基础资料与公开链接提交

目标：用户可以输入基础资料并提交公开链接素材，链接抓取失败时也能手动补充摘要。

任务：

- 实现首页 `/`。
- 实现 `/create` 信息录入页。
- 首页展示“用公开素材生成个人 Wiki 和 AI 名片”的价值说明。
- 表单支持昵称、身份、城市、自我介绍、我能提供、我想认识。
- 表单支持多条公开 URL 输入，并允许每条链接填写补充说明。
- 保存 `localStorage.profileDraft` 和 `localStorage.sourceDraft`，防止刷新丢失。

验收：

- 用户可以从首页进入创建页。
- 表单移动端输入体验可用。
- 少量必填信息即可提交。
- 刷新页面后，基础资料和链接草稿仍可恢复。
- 运行 lint、typecheck、build；手动验证 `/create` 主路径可提交。

### M2：公开链接抓取与素材入库

目标：系统抓取公开网页链接，清洗正文并保存为 `source_documents`。

任务：

- 实现 `/api/sources/import`。
- 校验 URL，只允许 `http` / `https`，禁止内网、本机和非网页协议。
- 识别 GitHub、Gitee、Notion 公开页、普通网页和其他链接类型。
- 使用 `fetch + cheerio / Readability` 抓取 title、description、正文。
- 保存 `source_documents`：url、sourceType、title、description、rawText、cleanedText、fetchStatus、userNote。
- 链接抓取失败时保存 `failed/manual` 状态和错误原因，不阻塞流程。
- 实现 `/sources/[batchId]` 展示素材处理状态。

验收：

- 提交 3 个公开网页链接后，至少成功保存 title、url、cleanedText。
- 提交无效 URL、内网 URL、无法访问 URL 时，返回可理解错误并保存 `failed/manual` 状态。
- 数据库中能查到 `source_documents`，并能追溯到 userId。
- 运行 lint、typecheck、build；用 API 请求验证成功链接和失败链接两种路径。

### M3：AI 知识抽取与事实入库

目标：从链接素材和用户补充说明中抽取结构化事实、项目、技能、话题和需求。

任务：

- 实现 `/api/knowledge/extract`。
- 设计知识抽取 JSON Schema：facts、projects、skills、topics、offers、wants、evidenceSourceIds、confidence。
- 保存 `profile_facts` 和 `profile_projects`。
- 每条 AI 抽取事实必须关联 `sourceDocumentId` 或用户手动输入来源。
- AI 失败时使用 Mock 抽取：基于标题、description、用户说明和基础资料生成低置信度事实。
- 低置信度事实进入编辑确认，不自动发布。

验收：

- 给定 `source_documents` 后能生成 `profile_facts` 和 `profile_projects`。
- 每个事实能追溯到 `sourceDocumentId` 或 manual source。
- AI 失败时仍能生成 Mock facts，并标记低置信度。
- 运行 lint、typecheck、build；API 验证正常抽取和 Mock fallback。

### M4：个人 Wiki 生成与编辑确认

目标：基于知识库生成个人 Wiki，并允许用户编辑确认后发布。

任务：

- 接入 Prisma 数据层：本地开发可用 SQLite，正式云端部署使用 PostgreSQL。
- Prisma schema 以 PostgreSQL 为正式目标，包含 users、source_documents、profile_facts、profile_projects、profile_wikis、agent_profiles。
- 实现 `/api/wiki/generate`。
- 生成 `profile_wikis.contentJson` 和 `markdown`。
- Wiki 包含 overview、projects、skills、topics、offers、wants、sources。
- 实现 `/u/[slug]/wiki` 公开 Wiki 页。
- Wiki 发布前必须进入编辑确认。

验收：

- 数据库能保存和读取 `profile_wikis`。
- `/u/[slug]/wiki` 能展示 Overview、Projects、Skills、Topics、Offers、Wants、Sources。
- Sources 中能看到素材标题和 URL。
- 运行 lint、typecheck、build；手动验证 Wiki 页面移动端展示。

### M5：AI 名片生成、公开主页与二维码

目标：从个人 Wiki 压缩生成适合扫码和社交转化的 AI 名片。

任务：

- 实现 `/api/agent/generate`。
- 名片生成输入以 `profile_wikis.contentJson` 为主，基础资料为辅。
- 设计名片 JSON Schema：headline、bio、tags、skills、interests、offers、wants、icebreakers、matchKeywords。
- 实现 `/card/edit/[id]` 编辑确认页。
- 实现 `/api/agent/publish`。
- 实现 `/u/[slug]` 公开个人名片页。
- 生成个人名片二维码。

验收：

- Wiki 生成后能派生 AI 名片草稿。
- 用户可以编辑名片内容并发布。
- 发布后得到稳定 URL，二维码扫码可以打开 `/u/[slug]`。
- 页面在微信内展示正常。
- 运行 lint、typecheck、build；手动验证生成、编辑、发布、扫码路径。

### M6：Wiki 与名片搜索

目标：用户可以主动搜索想认识的人。

任务：

- 实现 `/search` 搜索页。
- 支持关键词搜索 Wiki overview、projects、skills、topics、offers、wants，以及名片 headline、bio、tags、matchKeywords。
- 支持标签筛选。
- 展示搜索结果卡片。
- 点击结果进入公开名片页和 Wiki 页。

验收：

- 输入关键词能返回相关名片。
- 标签筛选可用。
- 搜索结果能跳转名片详情和 Wiki。
- 未发布 Wiki / 名片不出现在搜索结果。
- 运行 lint、typecheck、build；用种子数据验证关键词命中。

### M7：推荐名片

目标：系统基于个人 Wiki 和名片内容推荐值得认识的人。

任务：

- 实现 `/explore` 推荐页。
- 基于 Wiki topics、projects、skills、offers、wants、城市、场景标签做规则推荐。
- 每个推荐对象展示自然语言匹配理由。
- 预置 20-30 个 Demo 用户、Wiki 和名片。

验收：

- 用户能看到 3-5 个推荐对象。
- 推荐理由可解释。
- 没有真实用户时 Demo 数据可支撑演示。
- 本人和已连接对象被过滤。
- 运行 lint、typecheck、build；验证推荐 API 和页面。

### M8：连接申请和关系记录

目标：完成从发现名片到建立连接的闭环。

任务：

- 在公开名片页提供一键连接按钮。
- 实现连接申请 API。
- 实现 `/connections` 查看请求和连接记录。
- 支持默认破冰语和自定义留言。
- 记录连接来源、时间和状态。

验收：

- 用户能从名片页发起连接。
- 用户能从推荐页发起连接。
- 对方能在连接页看到申请。
- 接受后形成连接记录。
- 运行 lint、typecheck、build；验证名片页和推荐页两个来源都能创建连接。

### M9：Demo 稳定性与体验优化

目标：保证产品主路径稳定、好看、可演示。

任务：

- 真机扫码测试。
- 微信内 H5 测试。
- 链接抓取失败兜底测试。
- AI 抽取失败兜底测试。
- 移动端适配。
- 空状态、重复提交、错误提示。
- 准备 Demo 用户、Wiki、名片、截图和演示账号。

验收：

- 主路径连续跑通 5 次。
- 抓取失败、断网或 AI 失败时仍可演示。
- Wiki 有可信来源，名片视觉有分享欲。
- 运行 lint、typecheck、build；按 Demo 脚本完整彩排。

## 5. 建议 48 小时排期

### 0-3 小时：基础工程和视觉基调

- 初始化工程。
- 首页和移动端基础布局。
- API health check。
- 确认个人 Wiki 和名片视觉方向。

### 3-8 小时：创建表单和素材提交

- `/create` 表单。
- 多链接输入。
- 草稿保存。
- `/sources/[batchId]` 静态状态页。
- Mock 页面流转。

### 8-16 小时：链接抓取和知识抽取

- `/api/sources/import`。
- URL 安全校验。
- 网页抓取和正文清洗。
- `/api/knowledge/extract`。
- 知识抽取 Prompt 和 JSON Schema。
- Mock 兜底。

### 16-24 小时：数据库和个人 Wiki

- Prisma 数据模型。
- 保存 source_documents、profile_facts、profile_projects、profile_wikis。
- `/api/wiki/generate`。
- `/u/[slug]/wiki`。
- Wiki 编辑确认。

### 24-32 小时：AI 名片、公开页和二维码

- `/api/agent/generate`。
- `/card/edit/[id]`。
- `/api/agent/publish`。
- `/u/[slug]`。
- 个人名片二维码。

### 32-40 小时：搜索、推荐和连接

- `/search` Wiki 和名片搜索。
- `/explore` 规则推荐。
- 推荐理由生成。
- 连接申请和连接记录。
- Demo 用户、Wiki 和名片种子数据。

### 40-46 小时：真机测试和兜底

- 真机扫码。
- 微信内测试。
- 链接抓取失败兜底。
- AI 抽取失败兜底。
- 空状态、重复提交、错误提示。

### 46-48 小时：Demo 准备

- Demo 脚本。
- 备用链接和备用数据。
- 演示账号。
- 全流程彩排。

## 6. 编码顺序

### 第 1 步：搭建 H5 和 API

产出：

- 首页。
- 基础 Layout。
- API health check。
- 移动端样式基础。
- 验证脚本。

### 第 2 步：实现基础资料和链接提交

产出：

- `/create` 表单。
- 多链接输入组件。
- 链接补充说明。
- 草稿保存。
- 提交后进入素材处理流程。

### 第 3 步：实现链接抓取和素材入库

产出：

- `/api/sources/import`。
- URL 安全校验。
- 网页正文清洗。
- `source_documents`。
- `/sources/[batchId]`。

### 第 4 步：实现知识抽取

产出：

- `/api/knowledge/extract`。
- Prompt 模板。
- JSON Schema。
- `profile_facts`。
- `profile_projects`。
- Mock fallback。

### 第 5 步：实现个人 Wiki

产出：

- `/api/wiki/generate`。
- `profile_wikis.contentJson`。
- `profile_wikis.markdown`。
- `/u/[slug]/wiki`。
- Wiki 编辑确认。

### 第 6 步：实现 AI 名片和公开主页

产出：

- `/api/agent/generate`。
- `/card/edit/[id]` 编辑确认页。
- 发布逻辑。
- `/u/[slug]`。
- 个人二维码。

### 第 7 步：实现搜索

产出：

- `/search`。
- Wiki 和名片关键词搜索。
- 标签筛选。
- 搜索结果卡片。

### 第 8 步：实现推荐

产出：

- `/explore`。
- 基于 Wiki 的规则匹配服务。
- 推荐理由。
- Demo 用户、Wiki 和名片数据。

### 第 9 步：实现连接

产出：

- 连接申请 API。
- `/connections`。
- 连接状态。
- 连接来源记录。

### 第 10 步：打磨 Demo 体验

产出：

- 移动端体验优化。
- Wiki 来源展示强化。
- 名片视觉强化。
- 兜底数据。
- Demo 脚本。

## 7. 数据模型优先级

首版建议至少包含：

- `users`：用户基础身份。
- `source_documents`：用户提交的公开链接、抓取正文、抓取状态、用户补充说明。
- `profile_facts`：从素材中抽取的事实、技能、经历、观点、需求和来源引用。
- `profile_projects`：项目、作品、角色、成果、技术栈和来源引用。
- `profile_wikis`：个人 Wiki 的 contentJson、markdown、版本和发布状态。
- `agent_profiles`：从 Wiki 派生的名片内容、slug、发布状态。
- `connection_requests`：连接申请、来源、留言、状态。
- `card_visits`：名片访问记录。
- `recommendation_candidates`：推荐对象、分数、理由。

后续场景扩展再增加：

- `profile_resumes`：简历上传解析结果。
- `scenes` / `events`：活动、地点、场景信息。
- `profile_scene_tags`：名片和场景标签关系。

如果时间不足，可以先用本地 JSON / SQLite 简化实现，但接口边界保持稳定；给外部用户使用或部署到云端服务器前，需要切换到 PostgreSQL。

## 8. AI Prompt 产出要求

### 8.1 知识抽取输出

AI 知识抽取必须返回结构化 JSON：

```json
{
  "facts": [
    {
      "factType": "skill",
      "title": "AI 应用开发",
      "summary": "基于公开素材判断用户长期关注 AI 应用开发",
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

### 8.2 Wiki 生成输出

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

### 8.3 名片生成输出

```json
{
  "headline": "一句话价值定位",
  "bio": "个人介绍",
  "tags": ["AI", "创业", "后端"],
  "skills": ["技能标签"],
  "interests": ["兴趣标签"],
  "offers": ["我能提供"],
  "wants": ["我想认识"],
  "icebreakers": ["适合聊的话题"],
  "matchKeywords": ["用于匹配的关键词"]
}
```

生成原则：

- 不夸大用户经历。
- 保留用户原意。
- 重要结论必须有来源引用或来自用户手动输入。
- 突出价值、需求和可聊话题。
- 适合别人快速理解和主动连接。
- 用户必须能编辑确认。

## 9. Demo 主路径

### 9.1 创建个人 Wiki 和名片

1. 用户进入首页。
2. 点击“生成我的个人 Wiki”。
3. 填写基础信息、我能提供和我想认识。
4. 粘贴 GitHub / Gitee / 作品集 / 博客 / 公开文章链接。
5. 系统抓取和清洗公开链接素材。
6. AI 从素材中抽取事实、项目、技能、话题和需求。
7. 系统生成个人 Wiki，展示来源引用。
8. 用户编辑确认 Wiki。
9. AI 从 Wiki 派生个人名片草稿。
10. 用户编辑确认并发布。
11. 系统生成公开 Wiki、公开名片和二维码。

### 9.2 搜索和推荐连接

1. 用户进入搜索或推荐页。
2. 看到相关名片和推荐理由。
3. 点击查看对方名片或 Wiki。
4. 系统展示对方价值标签、Wiki 摘要和破冰话题。
5. 用户发起连接。
6. 连接记录被保存。

### 9.3 Demo 展示

1. 展示传统自我介绍和找人低效的问题。
2. 展示公开链接如何被 AI 整理成个人知识库。
3. 展示个人 Wiki、来源引用和 AI 名片。
4. 展示搜索、推荐理由和连接记录。
5. 讲述未来简历/录音、多源知识库、分层授权和 Agent to Agent 社交。

## 10. 团队分工建议

### 2 人团队

- A：前端页面、移动端体验、Wiki/名片展示、搜索推荐界面。
- B：API、数据库、链接抓取、AI 抽取、推荐和连接逻辑。

### 3 人团队

- A：创建页、素材处理状态页、编辑确认页。
- B：公开 Wiki、公开名片、搜索页、推荐页和视觉。
- C：API、数据库、链接抓取、AI Prompt、连接请求。

### 4 人团队

- A：创建和编辑发布主流程。
- B：公开 Wiki、公开名片、搜索推荐和视觉体验。
- C：后端数据模型、链接抓取、API 和连接逻辑。
- D：AI Prompt、知识抽取、推荐规则、Demo 数据和演示物料。

## 11. Demo PPT 建议

### 第 1 页：问题

个人价值展示单薄，线下或线上认识新人时，自我介绍低效，找合作对象靠运气。

### 第 2 页：解决方案

Livelink 用 AI 把公开素材整理成个人 Wiki，再从 Wiki 生成可展示、可搜索、可推荐、可连接的社交名片。

### 第 3 页：产品 Demo

展示链接素材导入、知识抽取、个人 Wiki、AI 名片、搜索推荐和连接。

### 第 4 页：技术亮点

公开网页抓取、内容清洗、知识抽取、来源引用、个人 Wiki、搜索推荐、Agent to Agent 社交方向。

### 第 5 页：未来空间

个人主页分享裂变、多源知识库、场景标签、分层授权、LBS 推荐和关系管理。

## 12. 备用方案

必须提前准备：

- 20-30 个 Demo 用户。
- 3 个完整演示账号。
- 5-10 个稳定可抓取的公开链接。
- AI 失败 Mock 输出。
- 链接抓取失败手动摘要。
- 公开 Wiki 截图。
- 公开名片截图。
- 搜索推荐截图。
- 本地可运行版本。

## 13. 最小验收清单

开发开始后，优先满足以下清单：

- [ ] 用户能进入创建页。
- [ ] 用户能填写基础信息并提交公开链接。
- [ ] 系统能抓取公开链接并保存 source_documents。
- [ ] 抓取失败时能保存失败状态并允许手动补充摘要。
- [ ] AI 能抽取结构化 facts 和 projects。
- [ ] AI 失败时有 Mock 兜底。
- [ ] 用户能生成、编辑并发布个人 Wiki。
- [ ] 用户能从 Wiki 派生、编辑并发布 AI 名片。
- [ ] 公开 Wiki 能展示来源引用。
- [ ] 公开名片能被链接或扫码访问。
- [ ] 搜索页能按关键词返回名片和 Wiki。
- [ ] 推荐页能展示匹配对象和理由。
- [ ] 能发起连接并保存记录。
- [ ] 每个里程碑完成后都通过对应验证命令和主路径检查。
- [ ] 真机和微信内主路径可跑通。
