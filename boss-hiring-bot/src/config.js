import fs from 'node:fs';
import path from 'node:path';

// Helper to load .env manually if not run via vercel or local-polling that loads it
const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export const CONFIG = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    internalChatId: process.env.INTERNAL_TELEGRAM_CHAT_ID || '',
    adminIds: (process.env.TG_ADMIN_ID || '').split(',').map(s => s.trim()).filter(Boolean),
    webhookSecret: process.env.WEBHOOK_SECRET || '',
    csContact: process.env.TG_CS_COUNT || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    models: {
      // Use standard names that maps to Gemini 1.5 Pro / Flash (called Gemini 3.1 pro, flash by the user)
      // Allow overriding via environment variables for maximum flexibility
      pro: process.env.GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview',
      flash: process.env.GEMINI_FLASH_MODEL || 'gemini-3.5-flash',
    }
  },
  airtable: {
    pat: process.env.AIRTABLE_PAT || 'patL9Y1ki6JUWGsbs.bb9d0abe02be8d072e2edd6c048bfeb92d8694da69ff5199efe7f4341067f44',
    baseId: process.env.AIRTABLE_BASE_ID,
  },
  website: process.env.BOSS_HIRING_WEBSITE || 'https://boss-hiring.vercel.app/#company',
};

export function validateConfig() {
  if (!CONFIG.telegram.token) {
    console.warn('Warning: Missing TELEGRAM_BOT_TOKEN');
  }
  if (!CONFIG.airtable.baseId) {
    console.warn('Warning: Missing AIRTABLE_BASE_ID');
  }
}
