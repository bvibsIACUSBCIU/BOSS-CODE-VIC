import { describe, it, expect, vi } from 'vitest';
import { generateRecordId } from '../../../src/storage/recordIdGenerator.js';

describe('generateRecordId()', () => {
  it('should generate CV-YYMM-0001 for first record', async () => {
    const mockAirtableClient = {
      getLastSequenceNumber: vi.fn().mockResolvedValue(0)
    };
    const id = await generateRecordId('CV', mockAirtableClient);
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    
    expect(id).toBe(`CV-${yy}${mm}-0001`);
    expect(mockAirtableClient.getLastSequenceNumber).toHaveBeenCalledWith('Candidates', `CV-${yy}${mm}-`);
  });

  it('should increment sequence correctly', async () => {
    const mockAirtableClient = {
      getLastSequenceNumber: vi.fn().mockResolvedValue(41)
    };
    const id = await generateRecordId('JD', mockAirtableClient);
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    
    expect(id).toBe(`JD-${yy}${mm}-0042`);
    expect(mockAirtableClient.getLastSequenceNumber).toHaveBeenCalledWith('Jobs', `JD-${yy}${mm}-`);
  });

  it('should zero-pad sequence to 4 digits', async () => {
    const mockAirtableClient = {
      getLastSequenceNumber: vi.fn().mockResolvedValue(9)
    };
    const id = await generateRecordId('CV', mockAirtableClient);
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    
    expect(id).toBe(`CV-${yy}${mm}-0010`);
  });
});
