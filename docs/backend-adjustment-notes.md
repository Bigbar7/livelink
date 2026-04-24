# 后端接口调整备忘：Agent 名片与找人连接 MVP

## 1. 背景结论

当前后端已经在生成 `Agent / SourceDocument / ProfileFact / ProfileWiki / AgentProfile` 相关接口，底层方向基本正确，不需要推倒重来。

需要调整的是产品主链路：现有方案偏“公开链接 → Wiki → 名片”，而当前 MVP 应优先支持“生成我的 Agent → 展示 AI 名片 → 找人推荐 → 破冰连接”。

因此，后端应保留 Wiki 和知识库作为底层资料层，但前端主流程不要强依赖多步 Wiki 生成链路。

## 2. 核心调整原则

1. **Agent Profile 是主产物**
   - 用户侧核心感知是“我的数字分身 / AI 名片”，不是“个人 Wiki”。
   - `ProfileWiki` 可以保留为资料层、结构化层和后续深度页。

2. **降低生成链路复杂度**
   - 前端不应依次调用创建 Agent、添加 Source、抽取知识、生成 Wiki、生成 Card、发布 Card。
   - 需要一个编排接口完成主要流程。

3. **输入方式前移**
   - MVP 不应只依赖公开链接。
   - 一段自我介绍、简历文本、我能提供、我想找什么，是更关键的输入。

4. **推荐和破冰进入 MVP**
   - 找人推荐、匹配理由、破冰话术是演示和产品价值的关键。
   - 可以先用 mock 数据和规则匹配，不需要复杂算法。

## 3. 建议保留的现有接口

以下接口可以继续保留，并作为底层能力使用：

| 接口 | 处理建议 |
| --- | --- |
| `POST /api/agents` | 保留，用于创建用户和 Agent |
| `GET /api/agents/me` | 保留，用于查看当前 Agent 状态 |
| `POST /api/agents/[agentId]/sources` | 保留，用于补充素材 |
| `POST /api/sources/[sourceId]/extract` | 保留，用于知识抽取 |
| `POST /api/wiki/generate` | 保留，但降级为内部资料层能力 |
| `POST /api/cards/generate` | 保留，但建议后续支持从 Agent 直接生成 |
| `POST /api/cards/publish` | 保留，用于发布名片 |
| `GET /api/profiles/[slug]` | 保留，用于公开名片页 |

## 4. 必须新增或调整的接口

### 4.1 新增：一键生成 Agent Profile

新增接口：

```http
POST /api/agents/generate-profile
```

作用：

```text
创建 / 更新 Agent
→ 写入用户输入素材
→ 抽取事实、技能、项目、需求
→ 生成 Agent Profile 草稿
→ 返回可展示的 AI 名片数据
```

建议入参：

```ts
{
  displayName: string
  agentName?: string
  role?: string
  city?: string
  introText?: string
  resumeText?: string
  links?: Array<{
    url: string
    note?: string
  }>
  offers?: string
  wants?: string
  socialStyle?: string
  scenario?: "hackathon" | "startup" | "investor" | "hiring" | "networking"
}
```

建议出参：

```ts
{
  user: User
  agent: Agent
  profile: AgentProfile
  sources: SourceDocument[]
  facts: ProfileFact[]
  projects: ProfileProject[]
  nextActions: string[]
}
```

最小实现建议：

- 如果传入 `introText`，创建一条 `sourceKind = manual` 的 `SourceDocument`。
- 如果传入 `resumeText`，创建一条 `sourceKind = resume` 的 `SourceDocument`。
- 如果传入 `links`，创建多条 `sourceKind = link` 的 `SourceDocument`。
- 先使用 mock AI 抽取和生成，保证链路跑通。
- 可以先不自动发布，返回草稿让前端确认。

### 4.2 调整：Agent 创建入参

当前 `POST /api/agents` 入参偏少，建议支持更多 MVP 关键字段。

建议新增字段：

```ts
{
  introText?: string
  offers?: string
  wants?: string
  socialStyle?: string
  scenario?: string
}
```

处理方式：

- `displayName / role / city` 继续进入 `User`。
- `introText / offers / wants / socialStyle / scenario` 可先作为 manual source 存储。
- 不一定要立刻改数据库结构，优先保证信息不丢。

### 4.3 调整：Card 不应强依赖 Wiki

当前如果名片生成强依赖 `wikiId`，会导致主链路过长。

建议新增服务方法：

```ts
generateCardFromAgent(agentId, aiClient)
```

建议逻辑：

```text
读取 Agent
→ 读取 Sources / Facts / Projects
→ 聚合用户自我介绍、简历、需求、能力
→ 生成 AgentProfile
→ 可选关联 currentWikiId
```

保留：

```ts
generateCardFromWiki(wikiId, aiClient)
```

但前端主流程优先调用从 Agent 生成名片。

### 4.4 新增：推荐候选人接口

新增接口：

```http
POST /api/recommendations
```

作用：

- 用户输入找人需求。
- 系统返回候选人卡片。
- 每个候选人带匹配理由。

建议入参：

```ts
{
  agentId: string
  query: string
  scenario?: "hackathon" | "startup" | "investor" | "hiring" | "networking"
}
```

建议出参：

```ts
{
  query: string
  candidates: Array<{
    profileId: string
    slug: string
    name: string
    headline: string
    tags: string[]
    matchScore: number
    matchReasons: string[]
    suggestedAsk: string
  }>
}
```

MVP 实现建议：

- 先用 seed/demo profiles 做候选池。
- 规则匹配 `tags / skills / offers / wants / headline / bio`。
- 匹配理由可以用模板或 mock AI 生成。
- 没有候选人时返回 fallback candidates，避免演示空白。

### 4.5 新增：连接预览 / 破冰话术接口

新增接口：

```http
POST /api/connections/preview
```

作用：

- 用户点击候选人后，先生成连接上下文和破冰文案。
- 不一定立刻创建真实连接记录。

建议入参：

```ts
{
  fromAgentId: string
  targetProfileId?: string
  targetExternalProfile?: {
    name: string
    headline?: string
    publicInfo?: string
    sourceUrl?: string
  }
  intent: string
}
```

建议出参：

```ts
{
  contextSummary: string
  matchReasons: string[]
  icebreakerMessage: string
  suggestedRequest: string
  shareProfileUrl: string
}
```

使用场景：

- 对方已有 Agent：生成“为什么你们适合认识”的上下文。
- 对方没有 Agent：生成可复制到微信、社媒评论或私信的破冰文案。

### 4.6 新增或完善：真实连接创建接口

新增或完善接口：

```http
POST /api/connections
```

建议入参：

```ts
{
  fromAgentId: string
  targetProfileId?: string
  targetExternalName?: string
  message: string
  requestType?: "wechat" | "resume" | "bp" | "portfolio" | "chat"
}
```

建议出参：

```ts
{
  connectionRequest: ConnectionRequest
}
```

MVP 可以先只记录请求，不做复杂状态流转。

## 5. 数据模型建议

### 5.1 AgentProfile 建议补充字段

如果当前数据库迁移还方便，建议给 `AgentProfile` 增加以下 JSON 字段：

```prisma
insightsJson String @default("{}")
socialStyleJson String @default("{}")
matchIntentsJson String @default("[]")
shareCardJson String @default("{}")
```

字段用途：

| 字段 | 用途 |
| --- | --- |
| `insightsJson` | AI 洞察、价值定位、核心优势、资源特征 |
| `socialStyleJson` | 用户希望 Agent 使用的社交风格 |
| `matchIntentsJson` | 用户当前找人需求 |
| `shareCardJson` | 海报、二维码、分享页展示配置 |

如果暂时不想改表，可以先复用：

- `interestsJson`
- `icebreakersJson`
- `offersJson`
- `wantsJson`

但后续会不够清晰。

### 5.2 SourceDocument 的 sourceKind 建议明确

建议固定支持：

```ts
"manual" | "resume" | "link" | "social" | "demo"
```

含义：

| sourceKind | 含义 |
| --- | --- |
| `manual` | 用户输入的一段自我介绍 |
| `resume` | 简历文本或简历解析结果 |
| `link` | 公开网页链接 |
| `social` | 社媒公开信息，后续使用 |
| `demo` | 预置演示数据 |

## 6. AI Client 建议扩展

当前 AI 能力如果只有 `extractKnowledge / generateWiki / generateCard`，不足以支撑找人和破冰。

建议扩展：

```ts
interface AiClient {
  extractKnowledge(input): Promise<ExtractedKnowledge>
  generateWiki(input): Promise<GeneratedWiki>
  generateCard(input): Promise<GeneratedCard>
  generateAgentProfile(input): Promise<GeneratedAgentProfile>
  generateMatchReasons(input): Promise<GeneratedMatchReason[]>
  generateIcebreaker(input): Promise<GeneratedIcebreaker>
}
```

MVP 最少新增：

```ts
generateAgentProfile
generateIcebreaker
```

`generateAgentProfile` 负责：

- 一句话定位。
- 社交货币标签。
- 履历亮点。
- AI 洞察。
- 我能提供。
- 我正在寻找。
- 破冰话题。

`generateIcebreaker` 负责：

- 总结为什么要认识对方。
- 生成一段自然、不冒犯、有价值感的连接文案。
- 附带自己的 Agent 名片链接。

## 7. 后端优先级建议

建议生成完当前后端代码后，按以下顺序修改：

```text
P0：保证现有接口可运行
P1：新增 /api/agents/generate-profile
P1：支持 introText / resumeText / offers / wants / socialStyle / scenario
P1：支持从 Agent 直接生成 AgentProfile
P2：新增 /api/recommendations
P2：新增 /api/connections/preview
P3：完善 /api/connections
P3：补充 AgentProfile insightsJson 等字段
P4：再考虑真实搜索、真实抓取、真实 Agent-to-Agent
```

## 8. 暂时可以不做的内容

以下内容可以后置，不影响当前 MVP 演示：

- 完整个人 Wiki 编辑器。
- 复杂全文搜索。
- 向量检索。
- 真实 Agent-to-Agent 对话。
- 小红书、B站、GitHub 自动抓取。
- 未授权人物认领。
- 多级隐私授权。
- 关系 CRM。
- LBS 或线下活动地图。

## 9. 推荐最终主链路

后端应优先支撑以下链路：

```text
用户输入基础信息、自我介绍、简历或链接
→ POST /api/agents/generate-profile
→ 返回 AgentProfile 草稿
→ 用户确认并发布
→ GET /api/profiles/[slug] 展示公开名片
→ POST /api/recommendations 输入找人需求
→ 返回候选人和匹配理由
→ POST /api/connections/preview 生成破冰话术
→ 用户复制文案或发起连接
```

## 10. 对当前后端生成结果的检查清单

等当前 agent 生成后端代码完成后，逐项检查：

- [ ] 是否有创建 Agent 的接口。
- [ ] 是否能存储用户自我介绍。
- [ ] 是否能存储简历文本或简历 source。
- [ ] 是否能存储公开链接 source。
- [ ] 是否能从 source 抽取 facts / projects。
- [ ] 是否能不经过 Wiki 直接生成 AgentProfile。
- [ ] 是否能发布公开名片。
- [ ] 是否能通过 slug 获取公开名片。
- [ ] 是否有推荐候选人的接口。
- [ ] 推荐结果是否包含匹配理由。
- [ ] 是否有破冰话术生成接口。
- [ ] 是否能记录连接请求。
- [ ] 没有真实数据时是否有 demo fallback。
- [ ] AI 失败时是否有 mock fallback。
- [ ] 前端主链路是否最多 2-3 次 API 调用即可跑通。

