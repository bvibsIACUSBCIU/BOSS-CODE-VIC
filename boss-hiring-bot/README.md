# Boss Hiring Telegram Bot

Boss Hiring 的 Telegram 前端入口，用于三语言公司介绍、服务菜单、官网跳转、模板下载、求职者资料入口、企业招聘入口和 Boss 来了合作入口。

## 推荐架构

- Telegram Bot：用户体验入口和交互入口
- Vercel Function：低成本 webhook 服务
- Airtable Base：结构化数据存储与文件归档（支持简历、JD附件）
- 内部 Telegram 群：新线索提醒
- AI：简历/JD 解析、摘要、标签和缺失项提醒

## 环境变量

复制 `.env.example` 到 `.env`，填入：

```bash
TELEGRAM_BOT_TOKEN=你的 Bot token
BOT_PUBLIC_URL=https://你的部署域名
BOSS_HIRING_WEBSITE=https://boss-hiring.vercel.app/#company
INTERNAL_TELEGRAM_CHAT_ID=内部提醒群 chat_id
```

生产环境请在 Vercel Project Settings 里配置环境变量，不要把 token 写进代码。

## Webhook

部署后设置 Telegram webhook：

```bash
cd boss-hiring-bot
npm run set:webhook
```

Webhook 地址：

```text
https://你的部署域名/api/telegram
```

## 当前版本能力

- 首次关注展示 Boss Hiring 公司介绍
- 支持中文、英文、高棉语
- 主菜单包含找工作、企业招聘、Boss 来了、下载模板、访问官网、联系客服
- 支持求职者在线填写、下载模板后上传、已有简历直接上传三种方式
- 支持企业在线填写、下载 JD 模板后上传、已有 JD 直接上传三种方式
- 支持接收文档/图片并生成内部提醒
- 全局使用 Airtable 进行结构化数据存储与文件归档，并在有状态变更时自动向用户发送 Telegram 通知

# CLAUDE.md

## Project Overview
Boss Hiring is a static recruitment website plus a Telegram bot entry point for candidate intake, employer hiring requests, and Boss Show company promotion.

## Tech Stack
- HTML5
- CSS3
- Vanilla JavaScript
- Node.js 20+ for the Telegram bot utilities
- Telegram Bot API
- Vercel Functions

## Project Structure
- `index.html`/`about.html`/`jobs.html`/`companies.html`/`candidate.html`/`employers.html`/`company-detail.html`/`job-detail.html`/`boss-show.html`/`contact.html`/`admin.html`/`demo.html` — static pages for the public site
- `styles.css` — shared site styles
- `app.js` — shared frontend behavior, i18n, navigation, job filtering, and CTA wiring
- `api/` — root-level Vercel API wrappers that re-export the bot handlers
- `boss-hiring-bot/api/` — Telegram webhook and webhook setup handler
- `boss-hiring-bot/scripts/` — local polling and webhook setup scripts
- `boss-hiring-bot/docs/` — SOP documentation
- `boss-hiring-bot/knowledge-base/` — FAQ and customer service source material
- `boss-hiring-bot/.env.example` — bot environment variable template

## Development Setup
```bash
python3 -m http.server 8000
```

```bash
cd boss-hiring-bot
cp .env.example .env
```

```bash
cd boss-hiring-bot
npm run dev
```

```bash
cd boss-hiring-bot
npm run set:webhook
```

## Common Commands
- `python3 -m http.server 8000` — serve the static site locally
- `cd boss-hiring-bot && npm run dev` — run the Telegram bot in local polling mode
- `cd boss-hiring-bot && npm run set:webhook` — register the Telegram webhook and bot commands

## Architecture Notes
- The public site is static and uses one shared `app.js` and `styles.css` across pages.
- `app.js` stores all site copy in a large `I18N` object and switches language by updating `data-i18n` nodes.
- Telegram CTA links are centralized in `SITE_CONFIG.telegramStarts`, with placeholder base URLs in `app.js`.
- The bot webhook in `boss-hiring-bot/api/telegram.js` handles `/start`, `/menu`, `/language`, `/job`, `/hire`, `/boss_show`, `/templates`, `/website`, `/contact`, callback queries, file uploads, and free-text intent detection.
- Uploaded files are not persisted in the current implementation; `storeLead()` only logs the lead record.
- `notifyInternal()` sends an internal Telegram alert only when `INTERNAL_TELEGRAM_CHAT_ID` is set.
- `boss-hiring-bot/scripts/local-polling.mjs` reuses the same webhook handler for local polling.
- `api/telegram.js` and `api/set-telegram-webhook.js` at the repo root only re-export the bot handlers from `boss-hiring-bot/api/`.

## Environment Variables
- `TELEGRAM_BOT_TOKEN` — required by the bot handlers and scripts
- `BOT_PUBLIC_URL` — required by `boss-hiring-bot/scripts/set-webhook.mjs`; optional in `boss-hiring-bot/api/set-telegram-webhook.js` because it falls back to `VERCEL_PROJECT_PRODUCTION_URL`
- `BOSS_HIRING_WEBSITE` — optional, defaults to `https://boss-hiring.vercel.app/#company`
- `INTERNAL_TELEGRAM_CHAT_ID` — optional, used for internal lead notifications
- `AIRTABLE_PAT` — required, Airtable Personal Access Token (PAT)
- `AIRTABLE_BASE_ID` — required, Airtable Base ID (App ID)

## Testing
No test runner or test directory is present in the repository.

## Code Style & Conventions
- The site uses plain, dependency-free JavaScript.
- Shared behavior is driven by `data-*` attributes rather than framework components.
- The bot code uses ES modules and async/await throughout.
- User-facing copy is kept inline in code objects and HTML attributes instead of external localization files.
- File and route names are descriptive and flat; there is no build step or source compilation layer in this repo.

## Key Files to Know
- `README.md` — top-level project summary and local preview instructions
- `app.js` — shared site configuration, language switching, CTA wiring, and job filtering
- `styles.css` — all visual styling for the public site
- `api/telegram.js` — root wrapper that exposes the Telegram webhook
- `api/set-telegram-webhook.js` — root wrapper for webhook registration
- `boss-hiring-bot/api/telegram.js` — main Telegram bot logic
- `boss-hiring-bot/api/set-telegram-webhook.js` — webhook registration endpoint
- `boss-hiring-bot/scripts/local-polling.mjs` — local polling runner for the bot
- `boss-hiring-bot/scripts/set-webhook.mjs` — CLI webhook setup script
- `boss-hiring-bot/.env.example` — environment variable reference
- `boss-hiring-bot/docs/sop.md` — operating workflow for candidates, employers, and Boss Show
- `boss-hiring-bot/knowledge-base/README.md` — knowledge base structure and usage notes
