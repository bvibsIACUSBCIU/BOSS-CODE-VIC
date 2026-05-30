/**
 * Google Sheets Apps Script - Webhook Trigger for Status Changes
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions -> Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. Replace `WEBHOOK_URL` with your actual Vercel Bot URL (e.g. 'https://your-bot.vercel.app/api/telegram').
 * 5. Replace `WEBHOOK_SECRET` with the same secret string defined in your .env.
 * 6. Save and name the project.
 * 7. Click Triggers (alarm clock icon on the left) -> Add Trigger.
 *    - Choose which function to run: `onEditTrigger`
 *    - Choose which deployment should run: `Head`
 *    - Select event source: `From spreadsheet`
 *    - Select event type: `On edit`
 *    - Click Save (it will prompt for Google permissions, approve them).
 */

const WEBHOOK_URL = 'https://your-bot.vercel.app/api/telegram'; // Update to your bot URL
const WEBHOOK_SECRET = 'your_configured_secret_token';          // Set a secret token matching process.env.WEBHOOK_SECRET

function onEditTrigger(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  
  // We only track Candidates and Jobs sheets
  if (sheetName !== 'Candidates' && sheetName !== 'Jobs') return;
  
  const row = range.getRow();
  const col = range.getColumn();
  
  // Header row is 1, data starts at row 2.
  if (row < 2) return;
  
  // Status is Column B (2)
  if (col !== 2) return;
  
  const newStatus = range.getValue();
  const oldStatus = e.oldValue;
  
  // Do not send if status hasn't changed
  if (newStatus === oldStatus) return;
  
  // Get Record ID (Column A - col 1)
  const recordId = sheet.getRange(row, 1).getValue();
  if (!recordId) return;
  
  // Get Telegram ID
  let telegramId = '';
  let lang = 'zh'; // Default language
  
  if (sheetName === 'Candidates') {
    // According to config.js mapping:
    // A: recordId (1), B: status (2), C: submittedAt (3), D: lang (4), E: telegramId (5)
    lang = sheet.getRange(row, 4).getValue() || 'zh';
    telegramId = sheet.getRange(row, 5).getValue();
  } else if (sheetName === 'Jobs') {
    // A: recordId (1), B: status (2), C: submittedAt (3), D: companyName (4), E: industry (5), F: companyAddress (6), G: contactName (7), H: contactPosition (8), I: contactTelegram (9)
    // Wait, let's locate the creator/contact telegram ID from Candidates or check if contactTelegramId exists.
    // In Jobs, contactTelegram (Column I) is usually the username or the contact's telegram ID if saved during form.
    // If contactTelegram is stored, we send the notification there.
    telegramId = sheet.getRange(row, 9).getValue(); // E.g., username or ID.
  }
  
  if (!telegramId) return;
  
  // Clean up telegramId if it has '@' (bot cannot send messages by username directly, it needs numerical chat ID)
  // Normally the bot saves numerical telegramId in candidates list, and for employers we save contactTelegramId or chat_id in Jobs
  
  const payload = {
    event: 'status_change',
    type: sheetName === 'Candidates' ? 'candidate' : 'job',
    recordId: recordId,
    newStatus: newStatus,
    telegramId: String(telegramId),
    lang: lang,
    secret: WEBHOOK_SECRET
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log('Webhook Response: ' + response.getContentText());
  } catch (error) {
    Logger.log('Webhook Error: ' + error.toString());
  }
}
