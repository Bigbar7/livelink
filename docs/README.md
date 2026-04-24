# Livelink 文档索引

当前保留三份核心文档：

1. [`project-plan.md`](./project-plan.md)：PRD，说明个人 Wiki、AI 名片、搜索推荐、连接闭环和后续演进。
2. [`technical-design.md`](./technical-design.md)：技术方案，说明 H5 架构、公开链接抓取、知识抽取、个人 Wiki、AI 名片、API、数据模型和部署设计。
3. [`implementation-plan.md`](./implementation-plan.md)：开发计划，说明里程碑、逐步验证、48 小时排期、编码顺序、Demo 脚本和验收清单。

## 当前执行决策

```text
先用 H5 开发个人 Wiki + AI 名片 MVP
核心资产是基于公开链接素材生成的个人知识库和个人 Wiki
AI 名片是从个人 Wiki 派生出的扫码和社交转化层
当前重点是链接素材抓取、知识抽取、Wiki 生成、名片发布、搜索推荐和连接
活动、路演、LBS、简历上传和录音输入作为后续扩展，不作为当前主闭环
AI、推荐、登录均采用轻量实现，并为 PostgreSQL、向量检索和 Agent to Agent 保留边界
```

## 开发优先级

```text
基础资料与公开链接提交
→ 公开链接抓取与素材入库
→ AI 知识抽取与事实入库
→ 个人 Wiki 生成与编辑确认
→ AI 名片生成、公开主页和二维码
→ Wiki 与名片搜索
→ 推荐名片
→ 连接申请和关系沉淀
```

## 执行要求

```text
每完成一个里程碑必须验证
验证通过后才能进入下一步
默认验证包括 lint、typecheck、build、关键 API / 页面主路径和失败兜底
```
