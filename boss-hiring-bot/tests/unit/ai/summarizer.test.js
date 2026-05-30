import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Gemini Client before importing summarizer
vi.mock('../../../src/ai/geminiClient.js', () => ({
  callGeminiJSON: vi.fn()
}));

import { callGeminiJSON } from '../../../src/ai/geminiClient.js';
import { analyzeResume, analyzeJob } from '../../../src/ai/summarizer.js';
import { CONFIG } from '../../../src/config.js';

describe('analyzeResume()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call callGeminiJSON with flash model and parse candidate details', async () => {
    const mockOutput = {
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
      aiSummary: '马克是一名25岁的柬埔寨籍求职者，拥有1年科技IT行业经验，中英双语...',
      aiTags: ['科技 IT', '中文', '本科', '1年经验'],
      missingFields: [],
      qualityScore: 90
    };

    callGeminiJSON.mockResolvedValue(mockOutput);

    const result = await analyzeResume(Buffer.from('mock resume'), 'application/pdf');

    expect(callGeminiJSON).toHaveBeenCalledWith(
      CONFIG.gemini.models.flash,
      expect.any(String),
      expect.any(Buffer),
      'application/pdf'
    );
    expect(result.name).toBe('mark');
    expect(result.qualityScore).toBe(90);
    expect(result.experienceYears).toBe('1年');
  });
});

describe('analyzeJob()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call callGeminiJSON with flash model and parse job details', async () => {
    const mockOutput = {
      companyName: 'Tech Corp',
      industry: 'IT',
      companyAddress: '金边',
      contactName: '王经理',
      contactPosition: 'HRD',
      contactTelegram: '@wang_hr',
      contactPhoneWhatsApp: '12345678',
      jobTitle: 'Node.js Developer',
      headcount: '2人',
      workLocation: '金边',
      salaryRange: '1500-2500 USD',
      workingHours: '9:00 - 18:00',
      languageRequirements: '中文, 英语',
      experienceRequirements: '2年以上',
      accommodationProvided: '是',
      visaProvided: '是',
      expectedArrivalDate: '随时',
      jobDescription: '负责 Node.js 后端开发...',
      acceptServiceFeeRules: '是',
      otherNotes: '无',
      aiSummary: 'Tech Corp 招聘 Node.js 工程师，地点金边，薪资优厚...',
      aiTags: ['IT', 'Node.js', '金边', '提供宿'],
      missingFields: []
    };

    callGeminiJSON.mockResolvedValue(mockOutput);

    const result = await analyzeJob(Buffer.from('mock JD'), 'application/pdf');

    expect(callGeminiJSON).toHaveBeenCalledWith(
      CONFIG.gemini.models.flash,
      expect.any(String),
      expect.any(Buffer),
      'application/pdf'
    );
    expect(result.companyName).toBe('Tech Corp');
    expect(result.jobTitle).toBe('Node.js Developer');
    expect(result.salaryRange).toBe('1500-2500 USD');
  });
});
