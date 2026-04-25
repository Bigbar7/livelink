# Vercel 部署说明

## 1. 不要提交本地 `.env`

`.env` 包含真实密钥，必须保留在 `.gitignore` 中，不要提交到 Gitee。

仓库只提交 `.env.example`，用于说明需要哪些环境变量。

## 2. Vercel 环境变量

在 Vercel 项目中进入：

```text
Project → Settings → Environment Variables
```

配置以下变量：

```env
AI_API_KEY=你的真实 AI Key
AI_BASE_URL=https://api.nightyu.com/v1
AI_MODEL=gpt-5.5
AI_WIRE_API=responses
NEXT_PUBLIC_APP_URL=https://你的-vercel-domain.vercel.app
```

如果部署后使用线上数据库，还需要配置：

```env
DATABASE_URL=postgresql://...
```

## 3. 数据库注意事项

当前 Prisma schema 与正式部署统一使用 PostgreSQL：

```env
DATABASE_URL=postgresql://...
```

推荐使用：

- Vercel Postgres
- Neon
- Supabase Postgres
- Railway Postgres

如果临时改回本地 SQLite，必须同步调整 Prisma datasource provider 和迁移策略；不要把 SQLite schema 部署到使用 PostgreSQL URL 的环境。

## 4. TLS 注意事项

本地开发如果遇到证书链问题，`.env` 可以临时配置：

```env
AI_ALLOW_INSECURE_TLS=1
```

Vercel 上不要默认配置这个变量。

只有当 Vercel 生产环境也出现证书链错误时，再单独排查证书或 CA 配置。

## 5. 推荐部署流程

```text
推送代码到 Gitee
→ Vercel 连接 Gitee 仓库
→ 配置环境变量
→ 配置数据库
→ 部署
→ 验证首页、Agent 生成、推荐和连接流程
```
