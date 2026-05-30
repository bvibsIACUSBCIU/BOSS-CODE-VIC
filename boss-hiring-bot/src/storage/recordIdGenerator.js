/**
 * Generate a unique ID for Candidates (CV) or Jobs (JD)
 * Format: {TYPE}-{YY}{MM}-{SEQ} (e.g., CV-2605-0001)
 *
 * @param {'CV'|'JD'} type
 * @param {object} airtableClient - The Airtable client instance
 * @returns {Promise<string>}
 */
export async function generateRecordId(type, airtableClient) {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `${type}-${year}${month}-`;
  
  const tableName = type === 'CV' ? 'Candidates' : 'Jobs';
  const lastSeq = await airtableClient.getLastSequenceNumber(tableName, prefix);
  const nextSeq = String(lastSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}
