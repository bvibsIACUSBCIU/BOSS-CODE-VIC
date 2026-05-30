import { describe, it, expect, vi } from 'vitest';

// Mock CONFIG before importing adminGuard
vi.mock('../../src/config.js', () => {
  return {
    CONFIG: {
      telegram: {
        adminIds: ['111111', '222222']
      }
    }
  };
});

import { isAdmin } from '../../src/admin/adminGuard.js';

describe('isAdmin()', () => {
  it('should return true for a registered admin ID', () => {
    expect(isAdmin('111111')).toBe(true);
    expect(isAdmin(111111)).toBe(true);
  });

  it('should return false for non-admin ID', () => {
    expect(isAdmin('999999')).toBe(false);
  });

  it('should return false for empty or undefined user ID', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin('')).toBe(false);
  });
});
