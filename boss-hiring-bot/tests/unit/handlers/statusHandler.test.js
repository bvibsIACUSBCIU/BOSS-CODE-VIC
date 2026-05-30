import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock CONFIG
vi.mock('../../../src/config.js', () => {
  return {
    CONFIG: {
      telegram: {
        webhookSecret: 'secret_token_123'
      }
    }
  };
});

import { handleStatusChange } from '../../../src/handlers/statusHandler.js';

describe('handleStatusChange()', () => {
  const mockSendMessage = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully notify user of candidate status change with correct translation', async () => {
    const payload = {
      event: 'status_change',
      recordId: 'CV-2605-0001',
      newStatus: 'ACTIVE',
      telegramId: '12345678',
      lang: 'zh',
      secret: 'secret_token_123'
    };

    const result = await handleStatusChange(payload, mockSendMessage);
    expect(result).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledWith(
      '12345678',
      expect.stringContaining('求职中')
    );
  });

  it('should notify employer of open job listing with english translation', async () => {
    const payload = {
      event: 'status_change',
      recordId: 'JD-2605-0002',
      newStatus: 'OPEN',
      telegramId: '87654321',
      lang: 'en',
      secret: 'secret_token_123'
    };

    const result = await handleStatusChange(payload, mockSendMessage);
    expect(result).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledWith(
      '87654321',
      expect.stringContaining('OPEN')
    );
  });

  it('should fail if webhookSecret is mismatch', async () => {
    const payload = {
      event: 'status_change',
      recordId: 'CV-2605-0001',
      newStatus: 'ACTIVE',
      telegramId: '12345678',
      lang: 'zh',
      secret: 'wrong_secret'
    };

    await expect(handleStatusChange(payload, mockSendMessage))
      .rejects.toThrow('Secret token mismatch');
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should handle custom status with fallback messages', async () => {
    const payload = {
      event: 'status_change',
      recordId: 'CV-2605-0001',
      newStatus: 'INTERVIEWING',
      telegramId: '12345678',
      lang: 'en',
      secret: 'secret_token_123'
    };

    const result = await handleStatusChange(payload, mockSendMessage);
    expect(result).toBe(true);
    expect(mockSendMessage).toHaveBeenCalledWith(
      '12345678',
      expect.stringContaining('INTERVIEWING')
    );
  });
});
