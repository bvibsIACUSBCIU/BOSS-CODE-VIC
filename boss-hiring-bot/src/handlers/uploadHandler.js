import { CONFIG } from '../config.js';
import { AirtableClient } from '../storage/airtableClient.js';
import { generateRecordId } from '../storage/recordIdGenerator.js';
import { analyzeResume, analyzeJob } from '../ai/summarizer.js';
import { matchCandidateToJobs, matchJobToCandidates } from '../ai/matcher.js';

const airtableClient = new AirtableClient();

// ─── Upload Review State (待用户确认的AI解析结果) ─────────────────────────────
// key: chatId (string)
// value: {
//   type: 'candidate' | 'employer',
//   lang: 'zh' | 'en' | 'km',
//   aiResult: object,       // AI 解析的完整字段
//   fileInfo: { downloadUrl, stdFileName },
//   baseRecord: object,     // 不含aiResult的基础字段（recordId尚未生成）
//   originalFileName: string,
//   mimeType: string,
//   user: object,           // telegram user 对象
//   editingField: string | null,  // 当前正在编辑的字段名，null=不在编辑模式
// }
const UPLOAD_REVIEW_STATES = new Map();

// ─── 字段元数据配置 ────────────────────────────────────────────────────────────

const CANDIDATE_FIELDS = [
  { key: 'name',                   icon: '👤', label: { zh: '姓名',         en: 'Name',               km: 'ឈ្មោះ' } },
  { key: 'gender',                 icon: '🚻', label: { zh: '性别',         en: 'Gender',             km: 'ភេទ' } },
  { key: 'age',                    icon: '🎂', label: { zh: '年龄',         en: 'Age',                km: 'អាយុ' } },
  { key: 'nationality',            icon: '🌍', label: { zh: '国籍',         en: 'Nationality',        km: 'សញ្ជាតិ' } },
  { key: 'currentCity',            icon: '📍', label: { zh: '当前城市',     en: 'Current City',       km: 'ទីក្រុងបច្ចុប្បន្ន' } },
  { key: 'telegramContact',        icon: '✉️',  label: { zh: 'Telegram',    en: 'Telegram',           km: 'Telegram' } },
  { key: 'phoneWhatsApp',          icon: '📱', label: { zh: '电话/WhatsApp', en: 'Phone/WhatsApp',    km: 'ទូរស័ព្ទ/WhatsApp' } },
  { key: 'languages',              icon: '🗣', label: { zh: '语言能力',     en: 'Languages',          km: 'ភាសា' } },
  { key: 'education',              icon: '🎓', label: { zh: '最高学历',     en: 'Education',          km: 'កម្រិតវប្បធម៌' } },
  { key: 'experienceYears',        icon: '💼', label: { zh: '工作年限',     en: 'Experience',         km: 'ឆ្នាំបទពិសោធន៍' } },
  { key: 'pastExperience',         icon: '📂', label: { zh: '过往行业',     en: 'Past Industry',      km: 'វិស័យពីមុន' } },
  { key: 'expectedRole',           icon: '🎯', label: { zh: '期望岗位',     en: 'Expected Role',      km: 'មុខតំណែងរំពឹងទុក' } },
  { key: 'expectedSalary',         icon: '💰', label: { zh: '期望薪资',     en: 'Expected Salary',    km: 'ប្រាក់ខែរំពឹងទុក' } },
  { key: 'acceptableLocation',     icon: '🗺', label: { zh: '意向地点',     en: 'Work Location',      km: 'ទីតាំងការងារ' } },
  { key: 'availableStartDate',     icon: '📅', label: { zh: '可入职时间',   en: 'Start Date',         km: 'ថ្ងៃចូលធ្វើការ' } },
  { key: 'cambodiaWorkExperience', icon: '🇰🇭', label: { zh: '柬埔寨经验', en: 'Cambodia Exp.',      km: 'បទពិសោធន៍កម្ពុជា' } },
  { key: 'accommodationSupport',   icon: '🏠', label: { zh: '需住宿支持',   en: 'Need Accommodation', km: 'ត្រូវការកន្លែងស្នាក់នៅ' } },
  { key: 'visaSupport',            icon: '📋', label: { zh: '需签证支持',   en: 'Need Visa Support',  km: 'ត្រូវការទិដ្ឋាការ' } },
  { key: 'otherNotes',             icon: '📝', label: { zh: '其他备注',     en: 'Other Notes',        km: 'កំណត់សម្គាល់' } },
];

const EMPLOYER_FIELDS = [
  { key: 'companyName',           icon: '🏢', label: { zh: '公司名称',     en: 'Company Name',       km: 'ឈ្មោះក្រុមហ៊ុន' } },
  { key: 'industry',              icon: '🏭', label: { zh: '所属行业',     en: 'Industry',           km: 'វិស័យ' } },
  { key: 'companyAddress',        icon: '📍', label: { zh: '公司地址',     en: 'Company Address',    km: 'អាសយដ្ឋានក្រុមហ៊ុន' } },
  { key: 'contactName',           icon: '👤', label: { zh: '联系人姓名',   en: 'Contact Name',       km: 'ឈ្មោះអ្នកទំនាក់ទំនង' } },
  { key: 'contactPosition',       icon: '💼', label: { zh: '联系人职位',   en: 'Contact Position',   km: 'តំណែងទំនាក់ទំនង' } },
  { key: 'contactTelegram',       icon: '✉️',  label: { zh: '联系Telegram', en: 'Contact Telegram',  km: 'Telegram ទំនាក់ទំនង' } },
  { key: 'contactPhoneWhatsApp',  icon: '📱', label: { zh: '联系电话',     en: 'Contact Phone',      km: 'ទូរស័ព្ទទំនាក់ទំនង' } },
  { key: 'jobTitle',              icon: '🎯', label: { zh: '招聘岗位',     en: 'Job Title',          km: 'មុខតំណែងជ្រើសរើស' } },
  { key: 'headcount',             icon: '👥', label: { zh: '招聘人数',     en: 'Headcount',          km: 'ចំនួនបុគ្គលិក' } },
  { key: 'workLocation',          icon: '🗺', label: { zh: '工作地点',     en: 'Work Location',      km: 'ទីតាំងការងារ' } },
  { key: 'salaryRange',           icon: '💰', label: { zh: '薪资范围',     en: 'Salary Range',       km: 'ជួរប្រាក់ខែ' } },
  { key: 'workingHours',          icon: '🕐', label: { zh: '工作时间',     en: 'Working Hours',      km: 'ម៉ោងធ្វើការ' } },
  { key: 'languageRequirements',  icon: '🗣', label: { zh: '语言要求',     en: 'Language Req.',      km: 'តម្រូវការភាសា' } },
  { key: 'experienceRequirements',icon: '📊', label: { zh: '经验要求',     en: 'Experience Req.',    km: 'តម្រូវការបទពិសោធន៍' } },
  { key: 'accommodationProvided', icon: '🏠', label: { zh: '提供住宿',     en: 'Accommodation',      km: 'ផ្តល់កន្លែងស្នាក់នៅ' } },
  { key: 'visaProvided',          icon: '📋', label: { zh: '提供签证',     en: 'Visa Provided',      km: 'ផ្តល់ទិដ្ឋាការ' } },
  { key: 'expectedArrivalDate',   icon: '📅', label: { zh: '到岗时间',     en: 'Arrival Date',       km: 'ពេលវេលាចូលធ្វើការ' } },
  { key: 'jobDescription',        icon: '📄', label: { zh: '岗位描述',     en: 'Job Description',    km: 'ការពិពណ៌នាការងារ' } },
  { key: 'acceptServiceFeeRules', icon: '✅', label: { zh: '接受服务费规则', en: 'Accept Fee Rules',  km: 'យល់ព្រមកម្រៃសេវា' } },
  { key: 'otherNotes',            icon: '📝', label: { zh: '其他备注',     en: 'Other Notes',        km: 'កំណត់សម្គាល់' } },
];

// ─── 文案本地化 ────────────────────────────────────────────────────────────────

const COPY = {
  zh: {
    processing:     { candidate: '已收到您的简历文件，AI 正在深度解析中，请稍候...', employer: '已收到招聘需求文件，AI 正在梳理岗位信息，请稍候...' },
    reviewTitle:    { candidate: '📋 *AI 解析结果 — 请核实您的简历信息*', employer: '📋 *AI 解析结果 — 请核实招聘需求信息*' },
    missingTitle:   '🔴 *以下关键信息未在文件中找到，建议补充：*',
    aiScore:        (s) => `\n🤖 AI 简历质量评分：${s}/100`,
    aiSummary:      (s) => `\n💡 AI 摘要：${s}`,
    confirmBtn:     '✅ 确认提交',
    cancelBtn:      '❌ 取消',
    editPrefix:     '✏️ ',
    fillPrefix:     '➕ 补充：',
    editPrompt:     (label) => `请输入新的【${label}】：\n（输入 /skip 可跳过该字段）`,
    editSaved:      (label, val) => `✅ 已更新【${label}】为：${val}`,
    cancelled:      '已取消，解析结果未保存。如需重新提交，请再次上传文件。',
    submitSuccess:  (id) => `提交成功！✅\n\n您的资料已整理完毕，生成序号：*${id}*。\n\n我们会保护您的隐私，根据 AI 匹配度为您推荐合适机会，并在顾问确认后与您联系。`,
    submitSuccessEmployer: (id) => `需求提交成功！✅\n\n岗位登记已完成，序号：*${id}*。\n\n顾问会在确认合作规则与服务条款后，向您推荐匹配候选人。`,
    empty:          '（未填写）',
    skipConfirm:    '已跳过该字段。',
  },
  en: {
    processing:     { candidate: 'Resume received. AI is parsing your profile, please wait...', employer: 'Hiring request received. AI is analyzing job details, please wait...' },
    reviewTitle:    { candidate: '📋 *AI Parse Result — Please verify your resume info*', employer: '📋 *AI Parse Result — Please verify hiring request info*' },
    missingTitle:   '🔴 *Missing key fields (recommend filling in):*',
    aiScore:        (s) => `\n🤖 AI Resume Quality Score: ${s}/100`,
    aiSummary:      (s) => `\n💡 AI Summary: ${s}`,
    confirmBtn:     '✅ Confirm & Submit',
    cancelBtn:      '❌ Cancel',
    editPrefix:     '✏️ ',
    fillPrefix:     '➕ Fill: ',
    editPrompt:     (label) => `Please enter new value for [${label}]:\n(Type /skip to leave this field unchanged)`,
    editSaved:      (label, val) => `✅ Updated [${label}] to: ${val}`,
    cancelled:      'Cancelled. Parsed result was not saved. Upload again to restart.',
    submitSuccess:  (id) => `Submitted successfully! ✅\n\nYour profile has been processed with ID: *${id}*.\n\nWe protect your privacy using AI matching. Our consultant will reach out once matching is confirmed.`,
    submitSuccessEmployer: (id) => `Hiring request submitted! ✅\n\nYour listing has been registered with ID: *${id}*.\n\nOur consultant will verify cooperation rules and send qualified candidates.`,
    empty:          '(not provided)',
    skipConfirm:    'Field skipped.',
  },
  km: {
    processing:     { candidate: 'បានទទួល CV រួចហើយ AI កំពុងវិភាគ សូមរង់ចាំ...', employer: 'បានទទួលតម្រូវការជ្រើសរើស AI កំពុងវិភាគ សូមរង់ចាំ...' },
    reviewTitle:    { candidate: '📋 *លទ្ធផល AI — សូមពិនិត្យព័ត៌មាន CV របស់អ្នក*', employer: '📋 *លទ្ធផល AI — សូមពិនិត្យព័ត៌មានជ្រើសរើស*' },
    missingTitle:   '🔴 *ព័ត៌មានខ្វះ (ណែនាំឱ្យបំពេញ)៖*',
    aiScore:        (s) => `\n🤖 ពិន្ទុ AI: ${s}/100`,
    aiSummary:      (s) => `\n💡 AI: ${s}`,
    confirmBtn:     '✅ យល់ព្រមបញ្ជូន',
    cancelBtn:      '❌ បោះបង់',
    editPrefix:     '✏️ ',
    fillPrefix:     '➕ បំពេញ: ',
    editPrompt:     (label) => `សូមបញ្ចូលតម្លៃថ្មីសម្រាប់ [${label}]:\n(វាយ /skip ដើម្បីរំលង)`,
    editSaved:      (label, val) => `✅ បានធ្វើបច្ចុប្បន្នភាព [${label}]: ${val}`,
    cancelled:      'បានបោះបង់។ លទ្ធផល AI មិនត្រូវបានរក្សាទុក។',
    submitSuccess:  (id) => `បានបញ្ជូនដោយជោគជ័យ! ✅\n\nប្រវត្តិរូបត្រូវបានចុះបញ្ជីលេខ: *${id}*។\n\nទីប្រឹក្សានឹងទាក់ទងក្នុងពេលឆាប់ៗ។`,
    submitSuccessEmployer: (id) => `បានបញ្ជូនដោយជោគជ័យ! ✅\n\nតម្រូវការចុះបញ្ជីលេខ: *${id}*។\n\nទីប្រឹក្សានឹងទាក់ទងបញ្ជាក់ព័ត៌មាន។`,
    empty:          '(គ្មាន)',
    skipConfirm:    'បានរំលងវាល។',
  },
};

// ─── 公开 API ──────────────────────────────────────────────────────────────────

/**
 * 检查用户是否处于 upload_review 状态（等待确认或正在编辑字段）
 */
export function isInUploadReview(chatId) {
  return UPLOAD_REVIEW_STATES.has(String(chatId));
}

/**
 * 检查用户是否正处于字段编辑模式（需要拦截文字输入）
 */
export function isEditingUploadField(chatId) {
  const state = UPLOAD_REVIEW_STATES.get(String(chatId));
  return !!(state && state.editingField);
}

/**
 * 处理文字输入 —— 仅当用户处于字段编辑模式时调用
 */
export async function handleUploadEditInput(chatId, text, replyFunc) {
  const sChatId = String(chatId);
  const state = UPLOAD_REVIEW_STATES.get(sChatId);
  if (!state || !state.editingField) return;

  const { lang, editingField } = state;
  const c = COPY[lang] || COPY.zh;
  const fields = state.type === 'candidate' ? CANDIDATE_FIELDS : EMPLOYER_FIELDS;
  const fieldMeta = fields.find(f => f.key === editingField);
  const label = fieldMeta ? (fieldMeta.label[lang] || fieldMeta.label.zh) : editingField;

  if (text === '/skip') {
    state.editingField = null;
    await replyFunc(sChatId, c.skipConfirm);
    await sendReviewCard(sChatId, replyFunc);
    return;
  }

  // 保存新值
  if (editingField === 'age') {
    const num = parseInt(text, 10);
    state.aiResult[editingField] = isNaN(num) ? text : num;
  } else {
    state.aiResult[editingField] = text.trim();
  }

  // 从 missingFields 中移除（如果刚刚补充了缺失字段）
  if (Array.isArray(state.aiResult.missingFields)) {
    state.aiResult.missingFields = state.aiResult.missingFields.filter(
      f => !f.includes(label) && f !== editingField
    );
  }

  state.editingField = null;
  await replyFunc(sChatId, c.editSaved(label, text.trim()));
  await sendReviewCard(sChatId, replyFunc);
}

/**
 * 处理 upload_review: 前缀的 callback 按钮
 * data 格式：
 *   upload_review:confirm
 *   upload_review:cancel
 *   upload_review:edit:<fieldKey>
 */
export async function handleUploadReviewCallback(chatId, data, replyFunc, notifyInternalFunc) {
  const sChatId = String(chatId);
  const state = UPLOAD_REVIEW_STATES.get(sChatId);
  if (!state) return;

  const { lang } = state;
  const c = COPY[lang] || COPY.zh;

  if (data === 'upload_review:confirm') {
    state.editingField = null;
    await commitUploadRecord(sChatId, state, replyFunc, notifyInternalFunc);
    UPLOAD_REVIEW_STATES.delete(sChatId);
    return;
  }

  if (data === 'upload_review:cancel') {
    UPLOAD_REVIEW_STATES.delete(sChatId);
    await replyFunc(sChatId, c.cancelled);
    return;
  }

  if (data.startsWith('upload_review:edit:')) {
    const fieldKey = data.replace('upload_review:edit:', '');
    const fields = state.type === 'candidate' ? CANDIDATE_FIELDS : EMPLOYER_FIELDS;
    const fieldMeta = fields.find(f => f.key === fieldKey);
    const label = fieldMeta ? (fieldMeta.label[lang] || fieldMeta.label.zh) : fieldKey;

    state.editingField = fieldKey;
    await replyFunc(sChatId, c.editPrompt(label));
    return;
  }
}

/**
 * 主入口：处理文件上传（document 或 photo）
 */
export async function handleFileUpload(chatId, message, context, lang, replyFunc, notifyInternalFunc) {
  const file = message.document || message.photo?.at(-1);
  if (!file) {
    await replyFunc(chatId, lang === 'zh' ? '未找到有效文件。' : 'No valid file found.');
    return;
  }

  const user = message.from || {};
  const fileId = file.file_id;
  const originalFileName = message.document?.file_name || 'telegram-photo';
  const mimeType = message.document?.mime_type || 'image/jpeg';

  const isCandidate = context === 'candidate';
  const typePrefix = isCandidate ? 'CV' : 'JD';
  const c = COPY[lang] || COPY.zh;

  // 若用户有未完成的确认流程，上传新文件时自动清除旧状态
  UPLOAD_REVIEW_STATES.delete(String(chatId));

  await replyFunc(chatId, c.processing[isCandidate ? 'candidate' : 'employer']);

  try {
    // Step 1: 获取 Telegram 文件下载 URL
    const fileInfo = await getTelegramFileUrl(fileId);

    // Step 2: 下载文件 Buffer 供 Gemini 多模态处理
    const fileResponse = await fetch(fileInfo.downloadUrl);
    if (!fileResponse.ok) throw new Error(`Failed to download TG file: ${fileResponse.status}`);
    const buffer = Buffer.from(await fileResponse.arrayBuffer());

    // Step 3: Gemini AI 解析
    let aiResult;
    if (isCandidate) {
      aiResult = await analyzeResume(buffer, mimeType);
    } else {
      aiResult = await analyzeJob(buffer, mimeType);
    }

    // Step 4: 组装标准文件名（recordId 先不生成，确认后再生成）
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let fileExt = originalFileName.split('.').pop() || 'jpg';
    if (fileExt === originalFileName) fileExt = mimeType.split('/').pop() || 'jpg';

    let nameForFile;
    if (isCandidate) {
      nameForFile = (aiResult.name || `${user.first_name || ''}${user.last_name || ''}` || 'Candidate')
        .replace(/[\s/\\?%*:|"<>]/g, '_');
    } else {
      nameForFile = (aiResult.companyName || 'Company').replace(/[\s/\\?%*:|"<>]/g, '_');
    }
    const stdFileName = `${typePrefix}-PENDING-${dateStr}-${nameForFile}.${fileExt}`;

    // Step 5: 存入待确认状态 Map
    UPLOAD_REVIEW_STATES.set(String(chatId), {
      type: isCandidate ? 'candidate' : 'employer',
      lang,
      aiResult,
      fileInfo: { ...fileInfo, stdFileName },
      originalFileName,
      mimeType,
      user,
      editingField: null,
    });

    // Step 6: 展示 AI 解析结果确认卡片
    await sendReviewCard(String(chatId), replyFunc);

  } catch (error) {
    console.error('File upload handling failed:', error);
    UPLOAD_REVIEW_STATES.delete(String(chatId));
    const errMsg = {
      zh: '抱歉，AI 解析文件时发生错误，请稍后再试或直接在线填写。',
      en: 'Sorry, an error occurred during AI parsing. Please try again or fill in the form online.',
      km: 'សូមអភ័យទោស មានបញ្ហាកើតឡើងពេល AI វិភាគ សូមព្យាយាមម្តងទៀត។',
    };
    await replyFunc(chatId, errMsg[lang] || errMsg.zh);
  }
}

// ─── 内部函数 ──────────────────────────────────────────────────────────────────

/**
 * 渲染并发送 AI 解析结果确认卡片
 */
async function sendReviewCard(chatId, replyFunc) {
  const state = UPLOAD_REVIEW_STATES.get(chatId);
  if (!state) return;

  const { type, lang, aiResult } = state;
  const isCandidate = type === 'candidate';
  const c = COPY[lang] || COPY.zh;
  const fields = isCandidate ? CANDIDATE_FIELDS : EMPLOYER_FIELDS;

  // ── 构建消息正文 ──
  let text = `${c.reviewTitle[isCandidate ? 'candidate' : 'employer']}\n\n`;

  for (const f of fields) {
    const val = aiResult[f.key];
    const displayVal = (val === null || val === undefined || val === '')
      ? c.empty
      : String(val);
    const label = f.label[lang] || f.label.zh;
    text += `${f.icon} *${label}：* ${displayVal}\n`;
  }

  // 缺失字段高亮
  const missing = Array.isArray(aiResult.missingFields) ? aiResult.missingFields : [];
  if (missing.length > 0) {
    text += `\n${c.missingTitle}\n`;
    for (const m of missing) {
      text += `  • ${m}\n`;
    }
  }

  // AI 摘要 & 质量评分
  if (aiResult.aiSummary) text += c.aiSummary(aiResult.aiSummary);
  if (aiResult.qualityScore != null) text += c.aiScore(aiResult.qualityScore);

  // ── 构建按钮布局 ──
  const inline_keyboard = [];

  // 每行排 3 个字段编辑按钮
  const editableFields = fields.filter(f => {
    const val = aiResult[f.key];
    return val !== null && val !== undefined && val !== '';
  });

  // 缺失字段单独一组，排在最前
  const missingFieldKeys = getMissingFieldKeys(missing, fields, lang);

  if (missingFieldKeys.length > 0) {
    // 缺失字段：每行 2 个，带 ➕ 前缀
    for (let i = 0; i < missingFieldKeys.length; i += 2) {
      const row = [];
      for (let j = i; j < Math.min(i + 2, missingFieldKeys.length); j++) {
        const f = missingFieldKeys[j];
        const label = f.label[lang] || f.label.zh;
        row.push({ text: `${c.fillPrefix}${label}`, callback_data: `upload_review:edit:${f.key}` });
      }
      inline_keyboard.push(row);
    }
  }

  // 已填字段：每行 3 个，带 ✏️ 前缀
  for (let i = 0; i < editableFields.length; i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, editableFields.length); j++) {
      const f = editableFields[j];
      const label = f.label[lang] || f.label.zh;
      row.push({ text: `${c.editPrefix}${label}`, callback_data: `upload_review:edit:${f.key}` });
    }
    inline_keyboard.push(row);
  }

  // 底部操作按钮
  inline_keyboard.push([
    { text: c.confirmBtn, callback_data: 'upload_review:confirm' },
    { text: c.cancelBtn,  callback_data: 'upload_review:cancel'  },
  ]);

  await replyFunc(chatId, text, { inline_keyboard });
}

/**
 * 根据 missingFields 文本列表匹配 field meta 对象
 */
function getMissingFieldKeys(missingTexts, fields, lang) {
  if (!missingTexts || missingTexts.length === 0) return [];
  return fields.filter(f => {
    const label = f.label[lang] || f.label.zh || f.label.en;
    // 匹配：missingFields 中包含该字段的标签名（模糊匹配）
    return missingTexts.some(m =>
      m.includes(label) || m.includes(f.key) || label.includes(m)
    );
  });
}

/**
 * 用户确认后，正式写入数据库、触发匹配、发送通知
 */
async function commitUploadRecord(chatId, state, replyFunc, notifyInternalFunc) {
  const { type, lang, aiResult, fileInfo, originalFileName, mimeType, user } = state;
  const isCandidate = type === 'candidate';
  const typePrefix = isCandidate ? 'CV' : 'JD';
  const tableName = isCandidate ? 'Candidates' : 'Jobs';
  const c = COPY[lang] || COPY.zh;

  // 生成最终文件名（此时才生成 recordId）
  const recordId = await generateRecordId(typePrefix, airtableClient);

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let fileExt = originalFileName.split('.').pop() || 'jpg';
  if (fileExt === originalFileName) fileExt = mimeType.split('/').pop() || 'jpg';

  let stdFileName;
  if (isCandidate) {
    const cleanName = (aiResult.name || `${user.first_name || ''}${user.last_name || ''}` || 'Candidate')
      .replace(/[\s/\\?%*:|"<>]/g, '_');
    stdFileName = `CV-${recordId}-${dateStr}-${cleanName}.${fileExt}`;
  } else {
    const cleanCompany = (aiResult.companyName || 'Company').replace(/[\s/\\?%*:|"<>]/g, '_');
    stdFileName = `JD-${recordId}-${dateStr}-${cleanCompany}.${fileExt}`;
  }

  const fileAttachment = [{ url: fileInfo.downloadUrl, filename: stdFileName }];

  // 构建数据库记录
  const record = {
    recordId,
    status: isCandidate ? '求职中' : '招聘中',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalFileName,
    mimeType,
    lang,
    telegramId: String(chatId),
    username: user.username ? `@${user.username}` : '',
    notes: '用户通过 Telegram 上传文件并经 AI 解析确认后提交',
    ...aiResult,
  };

  if (isCandidate) {
    record.resumeFile = fileAttachment;
    if (!record.name) {
      record.name = [user.first_name, user.last_name].filter(Boolean).join(' ') || '求职者';
    }
    if (!record.telegramContact) record.telegramContact = user.username ? `@${user.username}` : '';
  } else {
    record.jobFile = fileAttachment;
    if (!record.contactTelegram) record.contactTelegram = user.username ? `@${user.username}` : '';
  }

  // 写入数据库
  await airtableClient.appendRecord(tableName, record);

  // 智能匹配
  let matchReport = '';
  try {
    if (isCandidate) {
      const activeJobs = (await airtableClient.getRecords('Jobs'))
        .filter(j => j.status === '招聘中' || j.status === 'OPEN' || !j.status);
      if (activeJobs.length > 0) {
        const matches = await matchCandidateToJobs(record, activeJobs);
        if (matches.length > 0) {
          const topMatches = matches.slice(0, 3);
          record.matchedJobs = JSON.stringify(topMatches.map(m => `${m.jobId} (${m.totalScore}分)`));
          await airtableClient.updateByRecordId('Candidates', recordId, { matchedJobs: record.matchedJobs });
          matchReport = `\n\n🎯 *智能推荐岗位：*\n` +
            topMatches.map(m => `- ${m.jobId}: [${m.jobTitle}](${m.companyName || '未知企业'}) (匹配度: ${m.totalScore}分, ${m.recommendation})`).join('\n');
        }
      }
    } else {
      const activeCandidates = (await airtableClient.getRecords('Candidates'))
        .filter(c => c.status === '求职中' || c.status === 'ACTIVE' || !c.status);
      if (activeCandidates.length > 0) {
        const matches = await matchJobToCandidates(record, activeCandidates);
        if (matches.length > 0) {
          const topMatches = matches.slice(0, 3);
          record.matchedCandidates = JSON.stringify(topMatches.map(m => `${m.candidateId} (${m.totalScore}分)`));
          await airtableClient.updateByRecordId('Jobs', recordId, { matchedCandidates: record.matchedCandidates });
          matchReport = `\n\n🎯 *智能推荐求职者：*\n` +
            topMatches.map(m => `- ${m.candidateId}: ${m.candidateName} (${m.expectedRole}) (匹配度: ${m.totalScore}分, ${m.recommendation})`).join('\n');
        }
      }
    }
  } catch (matchErr) {
    console.error('Match engine failure during upload confirm:', matchErr.message);
  }

  // 发送内部群通知
  const internalTitle = isCandidate ? '新求职者简历登记（AI解析确认）' : '新企业招聘需求登记（AI解析确认）';
  const internalDetails = isCandidate
    ? `👤 姓名：${record.name}\n💼 期望岗位：${record.expectedRole}\n💰 期望薪资：${record.expectedSalary}\n🗣 语言能力：${record.languages}\n📍 意向地点：${record.acceptableLocation}`
    : `🏢 公司：${record.companyName}\n👔 招聘岗位：${record.jobTitle}\n👥 招聘人数：${record.headcount}\n💰 薪资范围：${record.salaryRange}\n📍 工作地点：${record.workLocation}`;

  if (notifyInternalFunc) {
    await notifyInternalFunc(
      `【${internalTitle} — 序号：${recordId}】\n` +
      `时间：${record.submittedAt}\n` +
      `Telegram：[${[user.first_name, user.last_name].filter(Boolean).join(' ')}](tg://user?id=${user.id}) ${user.username ? '@' + user.username : ''}\n` +
      `${internalDetails}\n\n` +
      `🤖 *AI 摘要：*${record.aiSummary || '无'}\n` +
      `🏷 *AI 标签：*${(record.aiTags || []).join(', ') || '无'}\n` +
      `⚠️ *缺失关键信息：*${(record.missingFields || []).join(', ') || '无'}\n` +
      `📁 *归档文件：* [点击查看原始附件](${fileInfo.downloadUrl})` +
      matchReport
    );
  }

  // 告知用户提交成功
  const successMsg = isCandidate
    ? c.submitSuccess(recordId)
    : c.submitSuccessEmployer(recordId);

  await replyFunc(chatId, successMsg);
}

/**
 * 获取 Telegram 文件下载 URL
 */
async function getTelegramFileUrl(fileId) {
  const res = await fetch(
    `https://api.telegram.org/bot${CONFIG.telegram.token}/getFile?file_id=${fileId}`
  );
  const json = await res.json();
  if (!json.ok) throw new Error(`getFile failed: ${json.description}`);
  const filePath = json.result.file_path;
  return {
    downloadUrl: `https://api.telegram.org/file/bot${CONFIG.telegram.token}/${filePath}`
  };
}
