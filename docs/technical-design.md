# Livelink 实现方案

## 1. 当前技术决策

当前阶段采用“H5 先行 + 前后端边界可迁移小程序”方案：

```text
Next.js H5 全栈 Demo
TypeScript
Tailwind CSS
Next.js API Routes / 轻量 Node API
SQLite / Prisma
AI API 后端调用
H5 公开页二维码生成
移动端优先
后续小程序复用 API、数据模型和 Prompt
```

当前阶段采用轻量实现，后续逐步增强：

| 能力 | 当前实现 | 后续实现 |
| --- | --- | --- |
| H5 主体验 | H5 主演示 | 保留为公开页 / 分享页 |
| 小程序主体验 | 暂以可迁移结构预留 | 正式小程序主体验 |
| 登录身份 | Demo 用户 / 简化身份 | 微信授权登录 |
| 后端 API | Next.js API Routes | NestJS / 独立 API 服务 |
| 个人身份知识库 | 简化卡片字段和原始输入 | source、fact、trait、version 完整模型 |
| 地址/场景信息 | 城市、地点名、场景类型 | 定位授权、活动位置、附近发现 |
| 推荐系统 | Mock/规则推荐 | 标签、意图、位置、场景、连接行为综合推荐 |

## 2. 为什么先用 H5 开发

- 产品核心场景是现实社交中的微信扫码和快速连接。
- 小程序更贴近真实使用路径，评委更容易理解落地场景。
- 微信内打开、分享、扫码体验更自然。
- 后续正式上线可以延续黑客松 Demo 的交互形态。
- H5 仍保留为备用公开页，降低现场扫码或小程序调试失败风险。

## 3. 目标架构

当前 H5 Demo 和后续小程序正式版保持同一数据与 API 主线：

```text
微信小程序
  ├─ 创建/编辑卡片
  ├─ 我的二维码
  ├─ 扫码访问
  ├─ 请求连接
  └─ 我的连接

H5
  ├─ 公开人物卡片页
  ├─ 分享落地页
  └─ 非微信环境访问页

后端 API
  ├─ AI 生成
  ├─ 卡片 CRUD
  ├─ 连接请求
  ├─ 微信登录
  └─ 推荐
```

当前 H5 代码需要注意：

- 不把 AI Key 放在小程序端。
- AI、推荐、连接请求必须走后端 API / 云函数。
- 类型、Prompt、数据访问尽量模块化。
- 扫码参数使用稳定 cardId / slug。
- 用户和卡片 ID 不硬编码。
- H5 公开页和小程序公开页复用同一套数据结构。

## 4. 推荐项目结构

黑客松阶段建议先采用 Next.js 单体，但按可迁移边界组织代码：

```text
livelink/
  app/
    page.tsx
    create/
    card/[id]/edit/
    me/
    u/[slug]/
    u/[slug]/connect/
    connections/
    explore/
    api/
      cards/
      connections/
      recommendations/
      demo/
  src/
    components/
    features/
      cards/
      connections/
      recommendations/
    lib/
      ai/
      db/
      qrcode/
      mock/
    services/
      card-service.ts
      connection-service.ts
      recommendation-service.ts
    types/
    prompts/
  prisma/
    schema.prisma
  docs/
```

后续迁移小程序时，保留 `services`、`types`、`prompts`、API 和数据库模型，小程序只重做页面层。

## 5. 前端设计

### 5.1 前端职责

H5 前端负责用户可见体验，不直接承载敏感业务逻辑：

- 创建和编辑人物卡片。
- 展示 AI 生成结果。
- 展示公开人物卡片。
- 生成和展示二维码。
- 发起连接请求。
- 展示连接列表。
- 展示基础推荐 / 探索页。

### 5.2 页面设计

```text
/                       首页
/create                 创建卡片
/card/[id]/edit          AI 结果编辑
/me                     我的卡片和二维码
/u/[slug]               公开人物卡片
/u/[slug]/connect       请求连接
/connections            连接列表
/explore                基础推荐 / 探索页
/demo                   演示数据入口
```

### 5.3 前端分层

```text
app/                    路由和页面
src/components/         通用 UI 组件
src/features/cards/     卡片相关业务组件
src/features/connections/连接相关业务组件
src/features/recommendations/推荐相关业务组件
src/services/           调用后端 API 的客户端封装
src/types/              前后端共享类型
```

页面层只负责展示和交互，业务请求统一通过 `src/services` 调用，避免后续迁移小程序时把业务逻辑散落在 React 组件中。

### 5.4 状态设计

当前阶段建议使用轻量状态：

- `localStorage` 保存当前 Demo 用户 ID。
- 服务端数据库保存卡片、连接、推荐数据。
- 页面数据优先通过 API 获取。
- 表单编辑状态保留在页面组件或 feature 组件中。

### 5.5 小程序迁移约束

为了后续迁移小程序，H5 前端需要避免：

- 业务逻辑强依赖 DOM。
- 业务逻辑强依赖浏览器专属 API。
- 核心数据只存在 localStorage。
- API 返回结构只服务单个页面。

后续小程序迁移时，小程序页面复用 API、类型、Prompt 和数据模型，只重做页面组件。

## 6. 后端设计

### 6.1 后端职责

当前阶段后端可以使用 Next.js API Routes，负责所有敏感和核心业务：

- Demo 登录和用户身份。
- 卡片 CRUD。
- AI 生成人物卡片。
- 公开卡片查询。
- 连接请求状态流转。
- 基础推荐计算。
- 访问记录。

AI Key、推荐规则和连接状态流转必须在服务端，不放在浏览器端。

### 6.2 服务层设计

建议在 `src/services` 或 `src/lib/server` 中沉淀服务层：

```text
card-service.ts
  createCard()
  generateCard()
  publishCard()
  getPublicCard()

connection-service.ts
  requestConnection()
  acceptConnection()
  listInbox()
  listConnections()

recommendation-service.ts
  listRecommendations()
  scoreCandidate()
  buildRecommendationReason()

ai-service.ts
  generatePersonaCard()
  parseModelJson()
  fallbackPersonaCard()
```

API Route 只做参数校验、调用服务、返回结果，避免业务逻辑写死在路由文件里。

### 6.3 后端数据流

创建卡片：

```text
前端表单
  → POST /api/cards/generate
  → ai-service 生成结构化内容
  → 前端编辑确认
  → POST /api/cards
  → card-service 保存卡片
```

公开访问：

```text
扫码打开 /u/[slug]
  → GET /api/cards/public/:slug
  → 记录 card_visits
  → 返回公开字段
```

连接请求：

```text
公开卡片点击请求连接
  → POST /api/connections/request
  → 创建 pending 请求
  → 卡片主人查看 inbox
  → POST /api/connections/:id/accept
  → 更新 accepted
```

推荐：

```text
用户进入 /explore
  → GET /api/recommendations
  → 读取用户卡片、城市、场景、标签
  → 规则打分
  → 返回推荐用户和推荐理由
```

### 6.4 后续后端迁移

当前用 Next.js API Routes 是为了快。后续迁移小程序时有两种路线：

- 继续复用 Next.js API，给 H5 和小程序共同调用。
- 把服务层迁移到 NestJS / 独立 Node API，小程序和 H5 都调用同一套接口。

只要服务层边界清晰，迁移成本主要在部署和鉴权，不在业务重写。


## 7. 当前数据模型

黑客松版本优先保留 5 张核心数据结构，覆盖个人信息、卡片、地址/场景、连接、访问和推荐。

### 7.1 users

```text
id
nickname
avatar_url
city
identity
current_scene
current_location_name
created_at
updated_at
```

说明：

- 黑客松阶段使用 Demo 登录承载用户身份。
- 可以用浏览器 localStorage 保存当前 user_id。
- Demo 时提供切换用户能力。

### 7.2 persona_cards

```text
id
user_id
slug
status
style
nickname
avatar_url
city
identity
scene_type
location_name
input_experience
input_interests
input_looking_for
headline
bio
tags
experience_summary
topics_to_talk
looking_for_summary
icebreaker
created_at
updated_at
published_at
```

说明：

- `tags`、`topics_to_talk` 可以用 JSON 数组。
- MVP 不拆 facts / traits。
- 保留原始输入字段，方便重新生成。

### 7.3 connection_requests

```text
id
from_user_id
to_user_id
to_card_id
message
status
source
created_at
accepted_at
```

说明：

- `status` 只需要 `pending`、`accepted`、`ignored`。
- `source` 先固定为 `qr` 或 `public_card`。

### 7.4 card_visits

```text
id
card_id
visitor_user_id
source
created_at
```

说明：

- 未登录访问者可以为空。
- 当前阶段建议尽量落库，用于演示访问和推荐信号。

### 7.5 recommendation_candidates

```text
id
user_id
target_user_id
reason
match_signals
score
source
created_at
```

说明：

- 当前阶段可以由 Demo 数据和规则生成。
- `match_signals` 可包含共同标签、同城市、同场景、希望认识的人命中。
- 如果时间紧，可先在 `/explore` 页面实时生成，后续再沉淀到表。

## 8. API 范围

### 8.1 必做 API

```text
POST /api/demo/login
POST /api/cards/generate
POST /api/cards
GET  /api/cards/me
GET  /api/cards/public/:slug
PATCH /api/cards/:id
POST /api/connections/request
GET  /api/connections/inbox
POST /api/connections/:id/accept
GET  /api/connections
GET  /api/recommendations
```

### 8.2 可选 API

```text
POST /api/cards/:id/visit
POST /api/demo/seed
```

## 9. AI 实现方案

### 9.1 当前只做一个 Prompt

当前阶段只实现 `persona-card` 生成。

输入：

- 昵称
- 身份
- 城市
- 过往经历
- 兴趣方向
- 希望认识的人
- 补充信息

输出：

```json
{
  "headline": "一句话介绍",
  "bio": "人物简介",
  "tags": ["标签1", "标签2"],
  "experience_summary": "经历总结",
  "topics_to_talk": ["话题1", "话题2"],
  "looking_for_summary": "希望认识的人",
  "icebreaker": "破冰语"
}
```

### 9.2 生成原则

- 内容真实，不编造经历。
- 语气自然，适合社交展示。
- 不要像正式简历。
- 突出用户的特点、兴趣和可聊话题。
- 输出结构化 JSON。
- 用户必须能编辑 AI 内容。

### 9.3 Mock 兜底

AI 调用失败时，必须返回可演示结果。

原因：

- 黑客松现场网络可能不稳定。
- API Key 可能限流。
- JSON 解析可能失败。
- 主 Demo 不能被 AI 调用阻塞。

## 10. 个人身份知识库设计

个人身份知识库是系统主线。当前阶段先用卡片字段和原始输入承载，后续逐步拆分成完整知识库。

- 原始资料永久保留。
- 事实和表达分离。
- 每个结论有来源。
- 用户拥有最终控制权。
- 知识库优先，卡片是展示层。

后续可扩展表：

```text
source_documents
profile_facts
fact_sources
profile_traits
card_versions
recommendation_profiles
recommendation_logs
recommendation_feedback
connections
locations
events
```

## 11. 推荐系统方案

推荐是系统主线。当前阶段先做基础规则推荐，后续逐步升级为完整推荐系统。

推荐原则：

```text
不是“猜你喜欢”，而是“为什么这个人现在值得你认识”
```

推荐依据：

- 共同兴趣
- 互补需求
- 共同场景
- 同城市 / 同地点
- 社交意图
- 连接路径

当前轻量推荐规则：

```text
共同标签：每个 +10
同城市：+8
同场景 / 同活动：+20
我的希望认识的人命中对方标签：+20
对方希望认识的人命中我的标签：+15
已连接：过滤
自己：过滤
```

推荐实现顺序：

1. 用户发布卡片后生成推荐候选。
2. 召回共同标签、同城市、同活动/同场景、需求互补候选人。
3. 过滤已连接、已拒绝、未公开用户。
4. 规则打分。
5. Top N 调 AI 生成推荐理由。
6. 记录推荐反馈。

## 12. 环境变量

当前 H5 演示阶段建议：

```text
DATABASE_URL=
AI_PROVIDER=
OPENAI_API_KEY=
PUBLIC_WEB_BASE_URL=
```

后续小程序 / 正式后端需要：

```text
JWT_SECRET=
WECHAT_APP_ID=
WECHAT_APP_SECRET=
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
PUBLIC_MINIPROGRAM_APP_ID=
```

## 13. 技术风险

| 风险 | 应对 |
| --- | --- |
| AI 输出不稳定 | 使用 JSON schema 校验和 Mock 兜底 |
| 扫码失败 | 准备 H5 公开 URL 和本地 Demo 数据备用 |
| 数据库迁移拖慢进度 | 先用简化 schema |
| H5 备用页重复实现 | 公开页只读展示，复用同一数据结构 |
| 后续小程序迁移成本 | 页面层和业务服务层分离，API 数据结构稳定 |

