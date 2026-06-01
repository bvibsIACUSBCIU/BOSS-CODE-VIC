import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the gemini client before importing ragEngine
vi.mock('../../../src/ai/geminiClient.js', () => ({
  getEmbedding: vi.fn(),
  callGemini: vi.fn(),
}));

import { getEmbedding, callGemini } from '../../../src/ai/geminiClient.js';
import { isHighRiskQuery, searchRag, answerQuestion, initRag, vectorIndex } from '../../../src/ai/ragEngine.js';

describe('RAG Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isHighRiskQuery()', () => {
    it('should return true for high risk keywords (Chinese)', () => {
      expect(isHighRiskQuery('请问你们服务费怎么收取？')).toBe(true);
      expect(isHighRiskQuery('如果求职者离职补人怎么算？')).toBe(true);
      expect(isHighRiskQuery('保证期有多久？')).toBe(true);
      expect(isHighRiskQuery('我想看合同协议')).toBe(true);
      expect(isHighRiskQuery('退款流程是什么')).toBe(true);
      expect(isHighRiskQuery('会泄露隐私数据吗')).toBe(true);
    });

    it('should return true for high risk keywords (English)', () => {
      expect(isHighRiskQuery('What are the service fees?')).toBe(true);
      expect(isHighRiskQuery('Do you have replacement guarantee?')).toBe(true);
      expect(isHighRiskQuery('Can we get a refund?')).toBe(true);
      expect(isHighRiskQuery('Is there a contract to sign?')).toBe(true);
    });

    it('should return false for general non-sensitive keywords', () => {
      expect(isHighRiskQuery('你好')).toBe(false);
      expect(isHighRiskQuery('我想找工作怎么提交资料')).toBe(false);
      expect(isHighRiskQuery('你们是做什么的公司')).toBe(false);
      expect(isHighRiskQuery('我要下载简历模板')).toBe(false);
    });
  });

  describe('answerQuestion() with human fallback', () => {
    beforeEach(() => {
      vectorIndex.length = 0;
      vectorIndex.push({
        text: '求职者资料提交方式：可以下载简历模板填写上传，也可以直接上传简历。',
        source: 'test.md',
        embedding: [0.1, 0.2, 0.3]
      });
    });

    it('should return isHighRisk=true and empty answer when high-risk keyword matches', async () => {
      const result = await answerQuestion('服务费多少钱？', 'zh');
      expect(result.isHighRisk).toBe(true);
      expect(result.answer).toBe('');
      expect(getEmbedding).not.toHaveBeenCalled();
      expect(callGemini).not.toHaveBeenCalled();
    });

    it('should query Gemini Flash using retrieved contexts when query is non-sensitive', async () => {
      getEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      callGemini.mockResolvedValue('这是 AI 智能客服根据企业知识库为您找到的答案...');

      const result = await answerQuestion('我想找工作怎么提交资料？', 'zh');

      expect(result.isHighRisk).toBe(false);
      expect(result.answer).toBe('这是 AI 智能客服根据企业知识库为您找到的答案...');
      expect(getEmbedding).toHaveBeenCalledWith('我想找工作怎么提交资料？');
      expect(callGemini).toHaveBeenCalled();
    });
  });
});
