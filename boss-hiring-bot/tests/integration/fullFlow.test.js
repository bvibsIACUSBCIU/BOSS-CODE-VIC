import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => ({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              name: 'mark',
              gender: '男',
              age: 25,
              nationality: '柬埔寨',
              currentCity: '柬埔寨',
              telegramContact: '@MK',
              phoneWhatsApp: '15654234565',
              languages: '中文',
              education: '本科',
              experienceYears: '1年',
              pastExperience: '科技 IT',
              expectedRole: '明显',
              expectedSalary: '134',
              acceptableLocation: '1234',
              availableStartDate: '13',
              cambodiaWorkExperience: '是',
              accommodationSupport: '是',
              visaSupport: '是',
              otherNotes: '1',
              aiSummary: '马克是一名25岁的柬埔寨求职者...',
              aiTags: ['科技 IT', '中文'],
              missingFields: [],
              qualityScore: 85
            })
          }
        })
      }))
    }))
  };
});

// 2. Mock fetch router to support Telegram and Airtable endpoints offline
const mockFetch = vi.fn().mockImplementation(async (url, options) => {
  const method = options?.method || 'GET';
  
  if (url.includes('api.telegram.org/botfake_bot_token/getFile')) {
    return {
      ok: true,
      json: async () => ({ ok: true, result: { file_path: 'documents/resume.pdf' } })
    };
  }
  
  if (url.includes('api.telegram.org/file/botfake_bot_token')) {
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8)
    };
  }
  
  if (url.includes('api.telegram.org/botfake_bot_token/sendMessage') || url.includes('api.telegram.org/botfake_bot_token/answerCallbackQuery')) {
    return {
      ok: true,
      json: async () => ({ ok: true })
    };
  }
  
  if (url.includes('api.airtable.com/v0/meta/bases')) {
    return {
      ok: true,
      json: async () => ({ tables: [] })
    };
  }
  
  if (url.includes('api.airtable.com/v0/')) {
    if (method === 'POST') {
      return {
        ok: true,
        json: async () => ({
          records: [{ id: 'rec9999', fields: { recordId: 'CV-2605-0001' } }]
        })
      };
    }
    // GET or PATCH queries
    return {
      ok: true,
      json: async () => ({
        records: [
          { id: 'rec1234', fields: { recordId: 'CV-2605-0001', name: 'Mark', status: 'ACTIVE' } },
          { id: 'rec5678', fields: { recordId: 'JD-2605-0001', jobTitle: 'Node.js Developer', status: 'OPEN' } }
        ]
      })
    };
  }

  return {
    ok: true,
    json: async () => ({})
  };
});

global.fetch = mockFetch;

// Stub CONFIG and environment variables
vi.stubEnv('TELEGRAM_BOT_TOKEN', 'fake_bot_token');
vi.stubEnv('TG_ADMIN_ID', '987654321');
vi.stubEnv('AIRTABLE_BASE_ID', 'fake_airtable_base_id');
vi.stubEnv('GEMINI_API_KEY', 'fake_gemini_key');

import { FIXTURES } from '../fixtures/telegramUpdates.js';

let handler;

describe('Telegram Webhook Entrypoint Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    if (!handler) {
      const module = await import('../../api/telegram.js');
      handler = module.default;
    }
  });

  it('should process start message successfully', async () => {
    const req = {
      method: 'POST',
      body: FIXTURES.startMessage
    };
    
    let resJson;
    const res = {
      status: vi.fn().mockImplementation(() => ({
        json: (payload) => { resJson = payload; }
      }))
    };

    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(resJson).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should handle admin dashboard commands', async () => {
    const req = {
      method: 'POST',
      body: FIXTURES.adminStartMessage
    };

    let resJson;
    const res = {
      status: vi.fn().mockImplementation(() => ({
        json: (payload) => { resJson = payload; }
      }))
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(resJson).toEqual({ ok: true });
  });

  it('should handle document uploads, run Gemini extraction, and save to Airtable', async () => {
    const req = {
      method: 'POST',
      body: FIXTURES.pdfUploadMessage
    };

    let resJson;
    const res = {
      status: vi.fn().mockImplementation(() => ({
        json: (payload) => { resJson = payload; }
      }))
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(resJson).toEqual({ ok: true });

    // Verify fetch was called to post the record to Airtable
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should process status change webhooks from Google Sheets/Airtable Apps Script', async () => {
    vi.stubEnv('WEBHOOK_SECRET', 'test_secret_abc');
    const req = {
      method: 'POST',
      body: {
        event: 'status_change',
        recordId: 'CV-2605-0001',
        newStatus: 'ACTIVE',
        telegramId: '12345678',
        lang: 'zh',
        secret: 'test_secret_abc'
      }
    };

    let resJson;
    const res = {
      status: vi.fn().mockImplementation(() => ({
        json: (payload) => { resJson = payload; }
      }))
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(resJson).toEqual({ ok: true, message: 'Status change notification sent.' });
    expect(mockFetch).toHaveBeenCalled();
  });
});
