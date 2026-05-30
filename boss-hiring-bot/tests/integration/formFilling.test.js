import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formHandler } from '../../src/handlers/formHandler.js';

// Mock Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockImplementation(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            name: 'Mark',
            gender: '男',
            age: 25,
            nationality: '柬埔寨',
            currentCity: '金边',
            telegramContact: '@mark',
            phoneWhatsApp: '12345678',
            languages: '中文',
            education: '本科',
            experienceYears: '1年',
            expectedRole: '翻译',
            expectedSalary: '1000$',
            acceptableLocation: '金边',
            aiSummary: 'Mark is an experienced translator...',
            aiTags: ['翻译', '中文'],
            missingFields: []
          })
        }
      })
    }))
  }))
}));

const mockFetch = vi.fn().mockImplementation(async (url, options) => {
  const method = options?.method || 'GET';
  
  if (url.includes('api.airtable.com/v0/')) {
    if (method === 'POST') {
      return {
        ok: true,
        json: async () => ({
          records: [{ id: 'rec9999', fields: { recordId: 'CV-2605-0001' } }]
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        records: [
          { id: 'rec1234', fields: { recordId: 'CV-2605-0001', name: 'Mark', status: '求职中' } }
        ]
      })
    };
  }
  return { ok: true, json: async () => ({}) };
});

global.fetch = mockFetch;

vi.stubEnv('TELEGRAM_BOT_TOKEN', 'fake_bot_token');
vi.stubEnv('AIRTABLE_BASE_ID', 'fake_airtable_base_id');

describe('Online Form Filling Stateful Workflow', () => {
  let messages = [];
  const replyFunc = async (chatId, text, markup) => {
    messages.push({ chatId, text, markup });
  };
  
  const notifyInternalFunc = vi.fn();

  beforeEach(() => {
    messages = [];
    vi.clearAllMocks();
    formHandler.cancelForm('user123');
  });

  it('should guide candidate through step-by-step questions and submit successfully', async () => {
    // 1. Start the form
    await formHandler.startForm('user123', 'candidate', 'zh', replyFunc);
    expect(formHandler.isFilling('user123')).toBe(true);
    expect(messages.length).toBe(1);
    expect(messages[0].text).toContain('请输入您的姓名');

    // 2. Answer Name
    await formHandler.handleFormInput('user123', 'Mark', 'zh', replyFunc, notifyInternalFunc);
    expect(messages.length).toBe(2);
    expect(messages[1].text).toContain('请选择您的性别');
    expect(messages[1].markup.inline_keyboard[0][0].text).toContain('男');

    // 3. Select Gender via callback option button
    await formHandler.handleFormCallback('user123', 'form:opt:男', 'zh', replyFunc, notifyInternalFunc);
    expect(messages.length).toBe(3);
    expect(messages[2].text).toContain('请输入您的年龄');

    // 4. Answer Age
    await formHandler.handleFormInput('user123', '25', 'zh', replyFunc, notifyInternalFunc);
    // 5. Answer Nationality
    await formHandler.handleFormInput('user123', '柬埔寨', 'zh', replyFunc, notifyInternalFunc);
    // 6. Answer Current City
    await formHandler.handleFormInput('user123', '金边', 'zh', replyFunc, notifyInternalFunc);
    // 7. Answer Telegram Contact
    await formHandler.handleFormInput('user123', '@mark', 'zh', replyFunc, notifyInternalFunc);
    // 8. Answer Phone
    await formHandler.handleFormInput('user123', '12345678', 'zh', replyFunc, notifyInternalFunc);
    // 9. Answer Languages
    await formHandler.handleFormInput('user123', '中文', 'zh', replyFunc, notifyInternalFunc);
    // 10. Answer Education via callback
    await formHandler.handleFormCallback('user123', 'form:opt:本科', 'zh', replyFunc, notifyInternalFunc);
    // 11. Answer Experience Years
    await formHandler.handleFormInput('user123', '1年', 'zh', replyFunc, notifyInternalFunc);
    // 12. Answer Past Experience
    await formHandler.handleFormInput('user123', 'IT', 'zh', replyFunc, notifyInternalFunc);
    // 13. Answer Expected Role
    await formHandler.handleFormInput('user123', '翻译', 'zh', replyFunc, notifyInternalFunc);
    // 14. Answer Expected Salary
    await formHandler.handleFormInput('user123', '1000$', 'zh', replyFunc, notifyInternalFunc);
    // 15. Answer Preferred Work Location
    await formHandler.handleFormInput('user123', '金边', 'zh', replyFunc, notifyInternalFunc);
    // 16. Answer Available Start Date
    await formHandler.handleFormInput('user123', '随时', 'zh', replyFunc, notifyInternalFunc);
    // 17. Answer Cambodia Work Experience via callback
    await formHandler.handleFormCallback('user123', 'form:opt:是', 'zh', replyFunc, notifyInternalFunc);
    // 18. Answer Accommodation Support via callback
    await formHandler.handleFormCallback('user123', 'form:opt:是', 'zh', replyFunc, notifyInternalFunc);
    // 19. Answer Visa Support via callback
    await formHandler.handleFormCallback('user123', 'form:opt:是', 'zh', replyFunc, notifyInternalFunc);
    // 20. Answer Other Notes (Final field)
    await formHandler.handleFormInput('user123', '无', 'zh', replyFunc, notifyInternalFunc);

    // 14. Should present the summary page with confirm/restart buttons
    const summaryMsg = messages[messages.length - 1];
    expect(summaryMsg.text).toContain('请核对您填写的信息');
    expect(summaryMsg.text).toContain('请输入您的姓名:* Mark');
    expect(summaryMsg.text).toContain('请选择您的性别:* 男');
    expect(summaryMsg.text).toContain('请选择您的最高学历:* 本科');

    // 15. Confirm and submit the form
    await formHandler.handleFormCallback('user123', 'form:confirm', 'zh', replyFunc, notifyInternalFunc);
    
    // Assert processing message sent
    expect(messages[messages.length - 2].text).toContain('正在处理提交');
    
    // Assert completion message sent
    expect(messages[messages.length - 1].text).toContain('提交成功');
    expect(messages[messages.length - 1].text).toContain('CV-2605-0002');

    // Assert Airtable was called
    expect(mockFetch).toHaveBeenCalled();
    // Assert internal notification was sent
    expect(notifyInternalFunc).toHaveBeenCalled();

    // Assert form is closed
    expect(formHandler.isFilling('user123')).toBe(false);
  });

  it('should support cancelling the questionnaire at any step', async () => {
    await formHandler.startForm('user123', 'candidate', 'zh', replyFunc);
    expect(formHandler.isFilling('user123')).toBe(true);

    await formHandler.handleFormCallback('user123', 'form:cancel', 'zh', replyFunc, notifyInternalFunc);
    expect(formHandler.isFilling('user123')).toBe(false);
    expect(messages[messages.length - 1].text).toContain('已取消在线填写');
  });
});
