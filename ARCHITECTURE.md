# 每日智讯 (Daily Digest) — 开发架构与未来规划

## 一、项目现状总览

### 已完成模块

| 模块 | 状态 | 说明 |
|------|------|------|
| 前端框架 | ✅ 完成 | Next.js 16 + TypeScript + Tailwind CSS 4 |
| 日历导航 | ✅ 完成 | 按日期前后翻页，支持历史回看 |
| 频道切换 | ✅ 完成 | 顶部 Tab 导航，独立配色 |
| 4 套模板 | ✅ 完成 | Magazine / Feed / Cards / Dashboard |
| 8 套配色 | ✅ 完成 | Ocean / Sunset / Forest / Lavender / Ember / Arctic / Midnight / Sakura |
| 频道创建器 | ✅ 完成 | 4 步向导，AI 生成配置 + 来源可行性分析 + 实时预览 |
| 频道持久化 | ✅ 完成 | 创建器一键保存到 channels.json |
| Pipeline 架构 | ✅ 完成 | 两层流水线：并行搜索 → 整合输出 |
| Gemini Agent | ✅ 完成 | 搜索 + 整合，已实测跑通 |
| Grok Agent | ✅ 骨架 | 代码完成，待 API key 实测 |
| Perplexity Agent | ✅ 骨架 | 代码完成，待 API key 实测 |
| Doubao Agent | ✅ 骨架 | 代码完成，待 API key 实测 |
| 图片 Fallback | ✅ 完成 | Pipeline 自动填充占位图 + 前端加载失败兜底 |
| GitHub Actions | ✅ 完成 | 每日定时运行 + 手动触发 |
| 移动端基础适配 | ✅ 完成 | Header / 日历 / Tab 响应式 |

### 当前技术栈

```
前端：Next.js 16 (App Router) + React 19 + TypeScript 5.9 + Tailwind CSS 4
后端：Next.js API Routes (频道管理) + 独立 Pipeline (数据生成)
数据：JSON 文件 (data/{channel_id}/{YYYY-MM-DD}.json)
AI：  Gemini (已接入) / Grok / Perplexity / Doubao (骨架完成)
部署：GitHub Actions (CI/CD) + VPS (计划中)
```

### 当前目录结构

```
Daily Digest/
├── src/                           # Next.js 前端
│   ├── app/
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 首页（重定向）
│   │   ├── [channelId]/
│   │   │   ├── page.tsx           # 频道页（重定向到今天）
│   │   │   └── [date]/
│   │   │       └── page.tsx       # 核心内容页
│   │   ├── create/
│   │   │   └── page.tsx           # 频道创建器
│   │   └── api/
│   │       ├── generate-channel/  # AI 生成频道配置
│   │       ├── analyze-sources/   # AI 来源可行性分析
│   │       └── save-channel/      # 保存频道到系统
│   ├── components/
│   │   ├── layout/                # Header, ChannelTabs, CalendarNav
│   │   ├── templates/             # Magazine, Feed, Cards, Dashboard, TemplateRenderer
│   │   ├── creator/               # ChannelCreator, StepTopic/Sources/Style/Generate
│   │   └── ui/                    # ArticleImage
│   ├── lib/                       # types, colors, channels, data, date-utils
│   └── styles/                    # globals.css
├── pipeline/                      # 独立数据生成流水线
│   ├── agents/                    # Grok, Gemini, Doubao, Perplexity, registry
│   ├── types.ts                   # 流水线类型
│   ├── config.ts                  # API 密钥 + 模型定价
│   ├── prompts.ts                 # 搜索 + 整合提示词
│   ├── integrator.ts              # Layer 2 整合层
│   ├── runner.ts                  # 频道遍历执行器
│   └── run.ts                     # CLI 入口
├── data/                          # 生成的 JSON 数据
│   ├── channels.json              # 频道配置
│   ├── ai/                        # AI 频道每日数据
│   ├── finance/                   # 财经频道每日数据
│   └── sports/                    # 体育频道每日数据
├── .github/workflows/             # GitHub Actions
├── .env.example                   # 环境变量模板
└── package.json
```


## 二、系统架构

### 数据流全景

```
┌─────────────────────────────────────────────────────────────────┐
│                     定时触发 (GitHub Actions / cron)              │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────── Pipeline Runner ────────────────────────────┐
│                                                                 │
│  ┌─── Layer 1: 并行搜索 ─────────────────────────────────┐     │
│  │                                                        │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│     │
│  │  │   Grok   │  │  Gemini  │  │  Doubao  │  │Perplxty││     │
│  │  │ X/Twitter│  │ Google搜索│  │ 中文互联网│  │精确引用 ││     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘│     │
│  │       │              │              │             │     │     │
│  │       └──────┬───────┴──────┬───────┴─────┬──────┘     │     │
│  │              ▼              ▼              ▼            │     │
│  │         Promise.allSettled (单个失败不阻塞)              │     │
│  └────────────────────────┬───────────────────────────────┘     │
│                           ▼                                     │
│  ┌─── Layer 2: 整合输出 ──────────────────────────────────┐     │
│  │                                                        │     │
│  │  Claude Opus / Sonnet / DeepSeek R1 / Gemini Pro      │     │
│  │                                                        │     │
│  │  1. 语义去重 → 2. 交叉验证 → 3. 重要性排序            │     │
│  │  4. 补充分析 → 5. 精选 Top N → 6. 生成综述            │     │
│  │  7. 输出 DailyDigest JSON                             │     │
│  └────────────────────────┬───────────────────────────────┘     │
│                           ▼                                     │
│              data/{channel_id}/{YYYY-MM-DD}.json                │
└─────────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────── Next.js 前端 ──────────────────────────────┐
│                                                                 │
│  Server Component 读取 JSON → TemplateRenderer 渲染             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Magazine │  │   Feed   │  │  Cards   │  │Dashboard │      │
│  │ 杂志双栏  │  │ 信息流    │  │ 卡片瀑布  │  │ 数据看板  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  日历导航 ← → 频道切换 ← → 频道创建器 (AI驱动)                  │
└─────────────────────────────────────────────────────────────────┘
```

### API 路由设计

| 路由 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/api/generate-channel` | POST | AI 生成频道配置 + 示例文章 | ✅ 完成 |
| `/api/analyze-sources` | POST | AI 评估来源可行性 | ✅ 完成 |
| `/api/save-channel` | POST | 保存频道到 channels.json | ✅ 完成 |
| `/api/run-pipeline` | POST | 前端触发 Pipeline 执行 | 🔲 计划 |
| `/api/channels` | GET | 获取所有频道列表 | 🔲 计划 |
| `/api/channels/[id]` | DELETE | 删除频道 | 🔲 计划 |
| `/api/digest/[channel]/[date]` | GET | 客户端获取数据 (SPA模式) | 🔲 计划 |

### Pipeline CLI 命令参考

```bash
# 基础用法
npx tsx pipeline/run.ts                                    # 全部频道，今天
npx tsx pipeline/run.ts --channel ai                       # 单频道
npx tsx pipeline/run.ts --date 2026-03-05                  # 指定日期
npx tsx pipeline/run.ts --dry-run                          # 不写文件

# 指定搜索 Agent
npx tsx pipeline/run.ts --agents gemini                    # 只用 Gemini
npx tsx pipeline/run.ts --agents gemini,grok               # Gemini + Grok

# 指定模型
npx tsx pipeline/run.ts --model gemini                     # 整合层用 Gemini
npx tsx pipeline/run.ts --agent-models gemini=gemini-3.1-flash-lite-preview
npx tsx pipeline/run.ts --integration-model gemini-3.1-pro-preview

# 完整示例
npx tsx pipeline/run.ts \
  --channel ai \
  --agents gemini \
  --agent-models gemini=gemini-3.1-flash-lite-preview \
  --model gemini \
  --integration-model gemini-3.1-pro-preview
```


## 三、未来开发路线图

### Phase 1：产品闭环 (1-2 周)

> 目标：让系统从创建频道到每日生成内容的全流程完全打通，可以日常使用。

#### 1.1 首页改版 — 频道概览仪表盘

**现状**：首页直接 redirect 到第一个频道。
**目标**：展示所有频道的今日概况，一目了然。

```
设计稿：
┌──────────────────────────────────────────────────┐
│  每日智讯 Daily Digest          2026年3月5日 周四  │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌─ AI 前沿 ──────┐  ┌─ 全球财经 ─────┐          │
│  │ 🧠 5 篇新文章   │  │ 📈 5 篇新文章   │          │
│  │ "GPT-6发布..."  │  │ "美联储降息..."  │          │
│  │ [查看详情 →]    │  │ [查看详情 →]    │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                    │
│  ┌─ 体育热点 ─────┐  ┌─ + 创建新频道 ──┐          │
│  │ 🏆 5 篇新文章   │  │                  │          │
│  │ "湖人逆转..."   │  │  [+ 添加频道]    │          │
│  │ [查看详情 →]    │  │                  │          │
│  └─────────────────┘  └─────────────────┘          │
└──────────────────────────────────────────────────┘
```

**实现要点**：
- `src/app/page.tsx`：不再 redirect，改为 Server Component 渲染概览
- 每个频道卡片展示：图标 + 名称 + 今日文章数 + digest 摘要 + 链接
- 最后一张卡片为「创建新频道」入口
- 无数据频道显示「暂无内容，点击生成」

#### 1.2 前端触发 Pipeline

**现状**：Pipeline 只能通过 CLI 运行。
**目标**：在网页上一键为某个频道生成今天的内容。

```
新增 API：POST /api/run-pipeline
Body: { channelId: "ai", date: "2026-03-05" }
Response: { success: true, articles: 5, cost: 0.004, duration: 52000 }
```

**实现要点**：
- `src/app/api/run-pipeline/route.ts`：调用 `pipeline/runner.ts` 的 `runChannel`
- 内容页顶部添加「刷新数据」按钮（当天无数据时自动显示）
- 执行中显示进度（SSE 或轮询）
- 完成后自动刷新页面

#### 1.3 频道管理

**现状**：频道只能通过创建器添加。
**目标**：支持编辑、删除、排序。

```
新增页面：/settings
- 频道列表（拖拽排序）
- 编辑频道配置（复用创建器组件）
- 删除频道（二次确认）
- 全局设置（默认搜索 Agent、整合模型等）
```

#### 1.4 动态图标系统

**现状**：ChannelTabs 硬编码了 4 个图标 (brain, trending-up, trophy, newspaper)。
**目标**：支持 Lucide 全量图标，新建频道自动映射。

**实现方案**：
```typescript
// src/lib/icons.ts — 动态图标加载器
import * as LucideIcons from "lucide-react";
export function getIcon(name: string): LucideIcon {
  const pascal = name.split("-").map(s => s[0].toUpperCase() + s.slice(1)).join("");
  return (LucideIcons as Record<string, LucideIcon>)[pascal] ?? LucideIcons.Newspaper;
}
```

---

### Phase 2：多 Agent 实测 (2-3 周)

> 目标：接入更多搜索 Agent，实现多源交叉验证，提升内容质量和可信度。

#### 2.1 Agent 接入优先级

| 优先级 | Agent | 原因 | 预计工作量 |
|--------|-------|------|-----------|
| P0 | Gemini | ✅ 已完成 | — |
| P1 | Perplexity | 搜索原生，自带引用，API 简单 | 0.5 天 |
| P1 | Grok | X/Twitter 独家数据源 | 0.5 天 |
| P2 | DeepSeek | 中英文均衡，可替代整合层 | 0.5 天 |
| P2 | Doubao | 中文互联网深度覆盖 | 1 天（API 文档较少） |
| P3 | Claude | 整合层首选（长文理解强） | 0.5 天 |

#### 2.2 Gemini google_search 工具修复

**现状**：`google_search` 工具导致响应被拆成多个 fragment，JSON 无法解析，已暂时禁用。
**方案**：

```
方案 A：改用 google_search_retrieval (grounding API)
  - 不需要 tool call
  - 响应自带 groundingMetadata.searchEntryPoint
  - 搜索结果在 groundingChunks 中结构化返回
  - 需要在提示词中要求模型基于 grounding 结果输出 JSON

方案 B：两步调用
  - 第一步：开启 google_search，获取自然语言搜索结果
  - 第二步：用同一模型将自然语言转为结构化 JSON（不开 search tool）
  - 优点：搜索质量高，JSON 输出稳定
  - 缺点：多一次 API 调用

方案 C（推荐）：分离搜索和格式化
  - 使用 gemini-3.1-flash-lite + google_search 做搜索
  - 提示词不要求 JSON，要求 markdown 列表格式
  - 解析 markdown 列表为结构化数据
  - 优点：搜索质量最高，解析最简单
```

#### 2.3 多 Agent 调度策略

```
频道配置中增加字段：
{
  "agentStrategy": "parallel" | "fallback" | "round-robin",
  "maxConcurrent": 3,
  "retryOnEmpty": true,
  "minResults": 5
}

parallel：   所有 Agent 同时出发 (默认)
fallback：   主 Agent 失败才启用备选
round-robin：每天轮换主力 Agent（降低成本）
```

#### 2.4 成本监控面板

```
新增页面：/settings/costs
- 每日/每周/每月成本汇总
- 按频道、按 Agent 分解
- 历史成本趋势图
- 成本预警阈值设置

数据来源：每个 DailyDigest JSON 的 meta.cost_usd 字段
```

---

### Phase 3：部署与运维 (1-2 周)

> 目标：将系统部署到生产环境，稳定自动化运行。

#### 3.1 VPS 部署方案

```
推荐架构：
┌─────────────────────────────────────────┐
│  VPS (Ubuntu 22.04, 2C4G)               │
│                                          │
│  ┌─── Nginx ────────────────────────┐   │
│  │  反向代理 → localhost:3000        │   │
│  │  SSL (Let's Encrypt / Cloudflare) │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌─── PM2 ─────────────────────────┐   │
│  │  next start (端口 3000)          │   │
│  │  自动重启 / 日志管理              │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌─── Cron ────────────────────────┐   │
│  │  0 6 * * * tsx pipeline/run.ts   │   │
│  │  每天北京时间 6:00 执行            │   │
│  └──────────────────────────────────┘   │
│                                          │
│  /opt/daily-digest/                      │
│  ├── .env           (API 密钥)           │
│  ├── data/          (持久化数据)          │
│  └── logs/          (运行日志)           │
└─────────────────────────────────────────┘
```

**部署脚本**：
```bash
# deploy.sh
#!/bin/bash
cd /opt/daily-digest
git pull origin main
npm ci --production
npm run build
pm2 restart daily-digest
```

#### 3.2 备选方案：Docker 容器化

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports: ["3000:3000"]
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env
    restart: unless-stopped

  pipeline:
    build: .
    command: >
      sh -c "while true; do
        npx tsx pipeline/run.ts --agents gemini --model gemini;
        sleep 86400;
      done"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env
    restart: unless-stopped
```

#### 3.3 监控与告警

```
健康检查：
- /api/health → 返回 { status: "ok", channels: 3, lastUpdate: "..." }
- Uptime Robot / Better Stack 监控页面可用性
- Pipeline 失败时发送告警

日志策略：
- Pipeline 日志 → logs/pipeline-{date}.log
- Next.js 日志 → PM2 管理
- 保留最近 30 天日志，自动清理
```

---

### Phase 4：内容质量提升 (持续)

> 目标：提升生成内容的质量、可信度和用户体验。

#### 4.1 文章图片搜索

**现状**：图片使用 picsum.photos 随机占位图。
**方案**：
```
方案 A：Google Custom Search Image API
  - 根据文章标题搜索相关图片
  - 每日 100 次免费调用
  - 图片质量高、相关性强

方案 B：Unsplash API
  - 免费、高质量
  - 根据关键词搜索
  - 需要归因 (attribution)

方案 C：AI 生成封面图 (Gemini Imagen / DALL-E)
  - 根据文章内容生成主题配图
  - 视觉统一、风格可控
  - 成本较高

实现位置：pipeline/runner.ts 中 integrate() 之后，写入之前
```

#### 4.2 内容去重优化

```
现状：依赖整合层模型做语义去重
增强方案：
1. 代码层预去重：TF-IDF 或 Jaccard 相似度过滤明显重复
2. URL 去重：相同 URL 直接合并
3. 标题相似度：编辑距离 < 30% 视为重复
4. 跨天去重：与前一天内容对比，避免连续报道同一事件
```

#### 4.3 文章评分优化

```
importance 评分因子：
- 时效性 (0-1)：发布时间距今越近越高
- 来源权重 (0-1)：主流媒体 > 社交媒体 > 博客
- 多源验证 (0-1)：被 N 个 Agent 搜到的加权
- 关键词匹配 (0-1)：与频道关键词的相关度
- 独特性 (0-1)：与其他文章的差异度

最终分数 = Σ(因子 × 权重) / Σ(权重)
```

---

### Phase 5：用户体验增强 (持续)

#### 5.1 通知推送

| 渠道 | 优先级 | 实现难度 | 说明 |
|------|--------|---------|------|
| Telegram Bot | P1 | 低 | Bot API 简单，支持 Markdown |
| Email | P1 | 低 | Resend / SendGrid |
| 微信 (Server酱) | P2 | 中 | 通过 Server酱 API 推送到微信 |
| RSS Feed | P2 | 低 | 为每个频道生成 RSS XML |
| Discord Webhook | P3 | 低 | Embed 格式美观 |

```
推送时机：Pipeline 成功后立即推送
推送内容：频道名 + 日期 + digest 综述 + Top 3 文章标题 + 链接
```

#### 5.2 搜索与筛选

```
新增功能：
- 全文搜索：跨频道搜索历史文章（标题 + 摘要 + 标签）
- 标签筛选：点击标签查看同标签文章
- 来源筛选：按来源过滤
- 重要性筛选：只看 90%+ 的文章
- 日期范围选择器：替代单日翻页

实现方案：
- 轻量级：客户端加载所有 JSON 做内存搜索（数据量小时可行）
- 进阶：SQLite / DuckDB 本地索引
- 远期：Algolia / Meilisearch 全文搜索引擎
```

#### 5.3 阅读体验

```
- 文章展开/折叠：点击标题展开完整摘要和背景分析
- 暗色模式：基于 CSS 变量，配色方案自动适配
- 字体大小调节：A- A A+ 控件
- 分享按钮：复制链接 / 分享到 X / Telegram
- 键盘导航：← → 切换日期，↑ ↓ 切换文章，Tab 切换频道
```

#### 5.4 数据可视化

```
在 Dashboard 模板中增加：
- 标签词云：当日高频标签可视化
- 来源分布饼图：各来源贡献占比
- 重要性分布：文章重要性分数分布直方图
- 周趋势：过去 7 天的文章数量和话题趋势

技术选型：recharts / visx (React 生态)
```

---

### Phase 6：高级特性 (远期)

#### 6.1 用户系统

```
轻量级方案（无数据库）：
- 基于 JWT 的简单认证
- 用户配置存储在 localStorage + 服务端 JSON
- 支持多用户各自的频道订阅

完整方案：
- NextAuth.js + 数据库 (SQLite / PostgreSQL)
- 用户注册/登录
- 频道订阅管理
- 阅读历史
- 个性化推荐
```

#### 6.2 数据库迁移

```
现状：JSON 文件存储
瓶颈：当数据量增大后，文件读写效率下降

迁移路径：
Stage 1 (现在)：JSON 文件 → 简单可靠
Stage 2 (数据 > 1000 条)：SQLite → 单文件数据库，查询快
Stage 3 (多用户/多实例)：PostgreSQL → 生产级

Schema 设计 (Stage 2)：
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  source_agents TEXT,  -- JSON array
  verified BOOLEAN,
  importance REAL,
  tags TEXT,           -- JSON array
  image TEXT,
  url TEXT,
  context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE digests (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL,
  date TEXT NOT NULL UNIQUE,
  topic TEXT,
  digest TEXT,
  meta TEXT,           -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.3 多语言支持

```
i18n 方案：next-intl
支持语言：中文（默认）、English
范围：UI 文字、日期格式、频道创建器提示
注意：文章内容本身保持双语（由 AI 生成决定）
```

#### 6.4 插件系统

```
允许用户编写自定义 Agent 插件：

interface PluginAgent {
  id: string;
  name: string;
  search(prompt: string, ctx: SearchContext): Promise<RawSearchItem[]>;
}

插件目录：plugins/
加载方式：动态 import()
配置方式：channels.json 中的 agentCombo 包含插件 ID

示例插件：
- GitHub Trending 插件：爬取 GitHub 趋势项目
- arXiv 专用插件：按分类和关键词搜索论文
- 财经数据插件：拉取实时股价和经济指标
```

---

## 四、成本估算

### 当前成本 (仅 Gemini)

| 项目 | 单次成本 | 每日 (3 频道) | 每月 |
|------|---------|-------------|------|
| Layer 1 搜索 (flash-lite) | $0.001 | $0.003 | $0.09 |
| Layer 2 整合 (pro) | $0.001 | $0.003 | $0.09 |
| 频道创建器 | $0.002 | 按需 | — |
| **合计** | | **$0.006** | **$0.18** |

### 多 Agent 成本预估

| 方案 | 每频道/天 | 3 频道/月 | 说明 |
|------|----------|----------|------|
| Gemini Only | $0.002 | $0.18 | 最便宜 |
| Gemini + Perplexity | $0.02 | $1.80 | Perplexity 较贵 |
| Gemini + Grok | $0.005 | $0.45 | 性价比高 |
| 全量 4 Agent + Claude 整合 | $0.13 | $11.70 | PRD 预估 |
| 全量 4 Agent + DeepSeek 整合 | $0.04 | $3.60 | 性价比最优 |

### VPS 成本

| 方案 | 月费 | 说明 |
|------|------|------|
| Vercel Free | $0 | 前端免费，Pipeline 用 GitHub Actions |
| Vercel Pro | $20 | 适合正式使用 |
| Hetzner VPS (CX22) | $4.5 | 2C4G，自建全套 |
| AWS Lightsail | $5 | 1C1G，自带备份 |
| Cloudflare Pages + Workers | $0-5 | 静态部署 + API |

---

## 五、开发规范

### 代码规范

```
- TypeScript strict mode
- 文件命名：PascalCase (组件), camelCase (工具)
- 组件：函数式 + hooks, 不用 class
- 状态管理：React state + Server Components, 不引入 Redux/Zustand（暂时）
- 样式：Tailwind CSS utility-first, 自定义样式用 CSS 变量
- API 调用：原生 fetch, 不引入 axios
- Pipeline：纯 TypeScript + Node.js API, 无额外框架
```

### Git 规范

```
分支策略：
- main：生产分支，Pipeline 每日自动 commit
- dev：开发分支
- feat/*：功能分支
- fix/*：修复分支

Commit 格式：
- feat: 新增频道管理页
- fix: 修复 Gemini 响应解析
- data: daily digest 2026-03-05 (自动)
- chore: 更新依赖
```

### 环境变量

```
必需：
  GEMINI_API_KEY          # Gemini API 密钥（搜索 + 整合 + 创建器）

可选（按需启用）：
  GEMINI_MODEL            # 默认 Gemini 模型名
  XAI_API_KEY             # Grok API 密钥
  GROK_MODEL              # Grok 模型名
  PERPLEXITY_API_KEY      # Perplexity API 密钥
  PERPLEXITY_MODEL        # Perplexity 模型名
  DOUBAO_API_KEY          # 豆包 API 密钥
  DOUBAO_MODEL            # 豆包模型名
  DOUBAO_BASE_URL         # 豆包 API 地址
  ANTHROPIC_API_KEY       # Claude API 密钥
  DEEPSEEK_API_KEY        # DeepSeek API 密钥
```
