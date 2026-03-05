# 每日智讯 — Daily Digest

AI 驱动的多频道信息聚合平台，每天 5 分钟掌握全局。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Better Auth](https://img.shields.io/badge/Auth-Better_Auth-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## 功能特性

- **多频道聚合** — 自定义频道（AI、金融、体育等），每个频道独立配置关键词、数据源和样式
- **ReAct 搜索代理** — 基于 Gemini 的多轮 ReAct 架构，自动规划搜索→执行→验证，URL 验证率 100%
- **多模型支持** — Gemini / Grok / Doubao / Perplexity 搜索层 + Claude / DeepSeek 整合层
- **SQLite 数据库** — Drizzle ORM 管理业务数据，告别 JSON 文件
- **登录系统** — Better Auth 邮箱密码认证，路由保护
- **多模板** — Magazine / Cards / Feed / Dashboard 四种展示风格
- **频道创建器** — AI 辅助生成频道配置

## 快速开始

### 1. 安装

```bash
git clone https://github.com/harukiiiiiiiii/DailyDigest.git
cd DailyDigest
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少填写：

```env
GEMINI_API_KEY=your-gemini-api-key
BETTER_AUTH_SECRET=your-random-secret-at-least-32-chars
BETTER_AUTH_URL=http://localhost:3000
```

### 3. 初始化数据库

```bash
# 创建业务表
npx drizzle-kit push

# 创建认证表
npx tsx scripts/init-auth-tables.ts

# 迁移已有 JSON 数据（可选）
npx tsx scripts/migrate-to-db.ts
```

### 4. 启动

```bash
npm run dev
```

访问 `http://localhost:3000`，注册账号后即可使用。

### 5. 运行 Pipeline

```bash
# 所有频道
npx tsx pipeline/run.ts

# 单频道
npx tsx pipeline/run.ts --channel ai

# 指定日期
npx tsx pipeline/run.ts --date 2026-03-05

# 预览（不写入）
npx tsx pipeline/run.ts --channel ai --dry-run
```

## 项目架构

```
Daily Digest/
├── src/                    # Next.js 前端
│   ├── app/                # 页面路由
│   │   ├── login/          # 登录/注册
│   │   ├── [channelId]/    # 频道详情
│   │   ├── create/         # 频道创建
│   │   ├── settings/       # 设置
│   │   └── api/            # API 路由
│   ├── components/         # React 组件
│   ├── lib/                # 核心库
│   │   ├── db/             # Drizzle ORM (schema + 连接)
│   │   ├── auth.ts         # Better Auth 服务端
│   │   ├── auth-client.ts  # Better Auth 客户端
│   │   ├── data.ts         # 数据读取 (SQLite)
│   │   └── channels.ts     # 频道读取 (SQLite)
│   └── proxy.ts            # 路由保护
├── pipeline/               # 数据采集管线
│   ├── react-agent.ts      # ReAct 搜索代理
│   ├── runner.ts           # Pipeline 编排器
│   ├── integrator.ts       # 多源整合
│   ├── enrich.ts           # URL 验证 & 去重
│   ├── agents/             # 搜索代理实现
│   └── tools/              # 工具 (web_search, crawl_url)
├── scripts/                # 工具脚本
│   ├── init-auth-tables.ts # 初始化认证表
│   └── migrate-to-db.ts    # JSON → SQLite 迁移
├── data/                   # 数据目录
│   ├── digest.db           # SQLite 数据库
│   └── {channel}/*.json    # 历史 JSON (向后兼容)
└── drizzle.config.ts       # Drizzle Kit 配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 数据库 | SQLite + Drizzle ORM |
| 认证 | Better Auth (邮箱密码) |
| 搜索 | Gemini API (Grounding) + Serper (可选) |
| 整合 | Claude / Gemini / DeepSeek |
| 运行时 | Node.js + tsx |

## License

MIT
