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
- `GOOGLE_SERVICE_ACCOUNT_JSON` — optional, defaults to `credentials.json`
- `GOOGLE_SHEETS_SPREADSHEET_ID` — optional
- `GOOGLE_DRIVE_FOLDER_ID` — optional

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
