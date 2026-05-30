# Boss Hiring Telegram Bot

Boss Hiring 的 Telegram 前端入口，用于三语言公司介绍、服务菜单、官网跳转、模板下载、求职者资料入口、企业招聘入口和 Boss 来了合作入口。

## 推荐架构

- Telegram Bot：用户体验入口和交互入口
- Vercel Function：低成本 webhook 服务
- Google Sheets：结构化数据存储
- Google Drive：简历、JD、证书、营业执照等文件归档
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
- Google Sheets/Drive 存储接口已预留，接入凭证后可落库归档
