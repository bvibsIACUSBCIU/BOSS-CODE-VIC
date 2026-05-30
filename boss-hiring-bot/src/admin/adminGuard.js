import { CONFIG } from '../config.js';

/**
 * Check if the given Telegram User ID is in the admin list.
 * @param {string|number} userId - Telegram User ID to check
 * @returns {boolean}
 */
export function isAdmin(userId) {
  if (!userId) return false;
  const idStr = String(userId).trim();
  return CONFIG.telegram.adminIds.includes(idStr);
}
