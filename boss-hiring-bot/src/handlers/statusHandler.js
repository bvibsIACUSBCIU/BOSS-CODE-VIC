import { CONFIG } from '../config.js';

const STATUS_MESSAGES = {
  zh: {
    ACTIVE: (id) => `您的简历（编号：${id}）状态已更新为：*求职中*。我们的顾问正在为您全力匹配岗位，请保持 Telegram 或电话畅通。`,
    PLACED: (id) => `恭喜您！您的求职状态（编号：${id}）已更新为：*已入职*。祝您在新岗位上工作顺利，前程似锦！`,
    OPEN: (id) => `您的企业招聘需求（编号：${id}）状态已更新为：*招聘中*。我们已开始筛选匹配的候选人，顾问会尽快为您推荐。`,
    FILLED: (id) => `您的招聘需求（编号：${id}）状态已更新为：*已完成招聘*。感谢您选择 Boss Hiring，如有其他需求欢迎随时发布！`
  },
  en: {
    ACTIVE: (id) => `Your resume (ID: ${id}) status has been updated to: *ACTIVE*. Our consultant is matching suitable opportunities for you. Please stay reachable.`,
    PLACED: (id) => `Congratulations! Your profile (ID: ${id}) status is now: *PLACED*. We wish you all the best in your new job!`,
    OPEN: (id) => `Your hiring request (ID: ${id}) status has been updated to: *OPEN*. We are sourcing matches and will share qualified candidates shortly.`,
    FILLED: (id) => `Your hiring request (ID: ${id}) status is now: *FILLED*. Thank you for choosing Boss Hiring! Let us know if you need more hires.`
  },
  km: {
    ACTIVE: (id) => `ប្រវត្តិរូបរបស់អ្នក (លេខសម្គាល់: ${id}) ត្រូវបានធ្វើបច្ចុប្បន្នភាព៖ *កំពុងស្វែងរកការងារ*។ ទីប្រឹក្សាកំពុងផ្គូផ្គងការងារសម្រាប់អ្នក។`,
    PLACED: (id) => `សូមអបអរសាទរ! ប្រវត្តិរូបរបស់អ្នក (លេខសម្គាល់: ${id}) ត្រូវបានធ្វើបច្ចុប្បន្នភាព៖ *បានចូលធ្វើការ*។ សូមជូនពរទទួលបានជោគជ័យក្នុងតួនាទីថ្មី!`,
    OPEN: (id) => `តម្រូវការជ្រើសរើសរបស់អ្នក (លេខសម្គាល់: ${id}) ត្រូវបានធ្វើបច្ចុប្បន្នភាព៖ *កំពុងជ្រើសរើស*។ យើងកំពុងផ្គូផ្គងបេក្ខជនជូនអ្នក។`,
    FILLED: (id) => `តម្រូវការជ្រើសរើសរបស់អ្នក (លេខសម្គាល់: ${id}) ត្រូវបានធ្វើបច្ចុប្បន្នភាព៖ *បានសម្រេច*។ សូមអរគុណដែលបានប្រើប្រាស់សេវា Boss Hiring!`
  }
};

/**
 * Handle incoming status change events from Google Apps Script.
 * 
 * @param {object} body 
 * @param {function} sendMessageFunc - async function(chatId, text)
 */
export async function handleStatusChange(body, sendMessageFunc) {
  const { event, recordId, newStatus, telegramId, lang, secret } = body;
  
  if (event !== 'status_change') {
    throw new Error(`Invalid event type: ${event}`);
  }

  if (!recordId || !newStatus || !telegramId) {
    throw new Error('Missing required fields: recordId, newStatus, or telegramId');
  }

  // Validate Secret if configured in .env
  if (CONFIG.telegram.webhookSecret && secret !== CONFIG.telegram.webhookSecret) {
    throw new Error('Unauthorized status update request: Secret token mismatch.');
  }

  const userLang = lang || 'zh';
  const localizedMsgs = STATUS_MESSAGES[userLang] || STATUS_MESSAGES.zh;
  
  // Normalize status keys (e.g. from Chinese values in Sheets)
  let statusKey = String(newStatus).trim().toUpperCase();
  if (statusKey === '求职中') statusKey = 'ACTIVE';
  if (statusKey === '已入职') statusKey = 'PLACED';
  if (statusKey === '招聘中') statusKey = 'OPEN';
  if (statusKey === '已招聘') statusKey = 'FILLED';

  const msgGetter = localizedMsgs[statusKey];
  let text;
  if (msgGetter) {
    text = msgGetter(recordId);
  } else {
    // Fallback if status name is unrecognized (e.g. customized status)
    const statusLabels = {
      zh: `您的记录（编号：${recordId}）状态已更新为：*${newStatus}*。`,
      en: `Your record (ID: ${recordId}) status has been updated to: *${newStatus}*.`,
      km: `កំណត់ត្រារបស់អ្នក (លេខសម្គាល់: ${recordId}) ត្រូវបានផ្លាស់ប្តូរទៅ៖ *${newStatus}*។`
    };
    text = statusLabels[userLang] || statusLabels.zh;
  }

  // Clean numerical ID if it contains '@' (usernames are not supportable)
  if (telegramId.startsWith('@')) {
    console.warn(`Cannot send direct message to user username ${telegramId}. Direct numerical chat ID is required.`);
    return false;
  }

  await sendMessageFunc(telegramId, text);
  return true;
}
