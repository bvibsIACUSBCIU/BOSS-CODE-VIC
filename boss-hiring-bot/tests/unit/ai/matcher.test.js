import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Gemini Client
vi.mock('../../../src/ai/geminiClient.js', () => ({
  callGeminiJSON: vi.fn()
}));

import { callGeminiJSON } from '../../../src/ai/geminiClient.js';
import { matchCandidateToJobs, matchJobToCandidates } from '../../../src/ai/matcher.js';
import { CONFIG } from '../../../src/config.js';

const mockCandidate = {
  recordId: 'CV-2605-0001',
  name: 'Mark',
  languages: '中文',
  expectedRole: 'Node.js Developer',
  expectedSalary: '1500 USD',
  experienceYears: '1年',
  pastExperience: 'IT科技',
  acceptableLocation: '金边',
  aiSummary: '马克，1年IT后端经验，精通中文'
};

const mockJobs = [
  {
    recordId: 'JD-2605-0001',
    companyName: 'Company A',
    jobTitle: 'Junior Developer',
    languageRequirements: '中文',
    salaryRange: '1000-2000 USD',
    workLocation: '金边',
    aiSummary: '招聘初级开发，要求懂中文'
  },
  {
    recordId: 'JD-2605-0002',
    companyName: 'Company B',
    jobTitle: 'English Content Writer',
    languageRequirements: '英语',
    salaryRange: '800-1500 USD',
    workLocation: '金边',
    aiSummary: '招聘英文内容编辑'
  }
];

describe('matchCandidateToJobs()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter jobs programmatically and score matching via Gemini Pro', async () => {
    callGeminiJSON.mockResolvedValue({
      totalScore: 88,
      matchReason: '求职者懂中文，地点相符，职位要求吻合',
      recommendation: '推荐'
    });

    const results = await matchCandidateToJobs(mockCandidate, mockJobs);

    // Should filter out JD-2605-0002 because Candidate speaks ONLY Chinese and JD requires English
    // Thus, only call Gemini Pro once for JD-2605-0001
    expect(callGeminiJSON).toHaveBeenCalledTimes(1);
    expect(callGeminiJSON).toHaveBeenCalledWith(
      CONFIG.gemini.models.pro,
      expect.any(String)
    );
    expect(results).toHaveLength(1);
    expect(results[0].jobId).toBe('JD-2605-0001');
    expect(results[0].totalScore).toBe(88);
  });
});

describe('matchJobToCandidates()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter candidates programmatically and score matching via Gemini Pro', async () => {
    callGeminiJSON.mockResolvedValue({
      totalScore: 92,
      matchReason: '完美符合所有软硬要求',
      recommendation: '强烈推荐'
    });

    const targetJob = mockJobs[0]; // Requires Chinese
    const candidateList = [
      mockCandidate, // Speaks Chinese
      { ...mockCandidate, recordId: 'CV-2605-0002', languages: '英语', name: 'Bob' } // Speaks English only
    ];

    const results = await matchJobToCandidates(targetJob, candidateList);

    // Filters out Bob because Bob speaks ONLY English while job requires Chinese
    expect(callGeminiJSON).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0].candidateId).toBe('CV-2605-0001');
    expect(results[0].totalScore).toBe(92);
  });
});
