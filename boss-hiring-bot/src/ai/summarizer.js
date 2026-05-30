import { callGeminiJSON } from './geminiClient.js';
import { CONFIG } from '../config.js';

/**
 * Extract structured resume data from text or file buffer.
 * 
 * @param {Buffer} [fileBuffer] 
 * @param {string} [mimeType] 
 * @param {string} [textContent] 
 * @returns {Promise<object>}
 */
export async function analyzeResume(fileBuffer, mimeType, textContent = '') {
  const prompt = `你是一位专业的招聘顾问。请分析提供的简历（可能是文件或文本内容），提取所有相关信息并生成结构化数据。
如果字段在简历中完全未提及，请将其填为空白字符串 "" 或 null，不要捏造任何信息。
对于布尔值或二选一的字段（如“是否”），请根据内容提取并输出 "是"、"否" 或 "未知"。

输出格式必须是以下 JSON：
{
  "name": "姓名（如果没有找到，请填空）",
  "gender": "男|女|未知",
  "age": "年龄（数字，未提及填 null）",
  "nationality": "国籍",
  "currentCity": "当前所在城市",
  "telegramContact": "Telegram用户名或联系方式",
  "phoneWhatsApp": "电话或 WhatsApp 号码",
  "languages": "所会语言，多个以逗号分隔，例如: '中文, 英语'",
  "education": "最高学历，例如: '本科', '专科', '硕士'",
  "experienceYears": "工作年限（例如: '1年', '3-5年', '无经验'）",
  "pastExperience": "过往行业经验，如: '科技 IT', '餐饮', '销售'",
  "expectedRole": "期望岗位",
  "expectedSalary": "期望薪资",
  "acceptableLocation": "可接受工作地点",
  "availableStartDate": "可入职时间",
  "cambodiaWorkExperience": "是否具有柬埔寨工作经验: '是'|'否'|'未知'",
  "accommodationSupport": "是否需要住宿支持: '是'|'否'|'未知'",
  "visaSupport": "是否需要签证/工作证支持: '是'|'否'|'未知'",
  "otherNotes": "其他备注信息",
  "aiSummary": "用两三句简洁的话总结求职者的核心优势和背景",
  "aiTags": ["标签1", "标签2", "标签3", "标签4"],
  "missingFields": ["列出模板中缺失的关键项，例如：'期望薪资', '工作年限'等"],
  "qualityScore": 80
}

请注意：aiTags 应包含技能、期望行业、语言优势以及是否有柬埔寨经验等维度，如：["IT开发", "中文熟练", "1年经验", "柬埔寨本地"]。
qualityScore 为 0 至 100 之间的整数，代表简历的完整程度和清晰度。

【简历内容】
${textContent}
`;

  return callGeminiJSON(CONFIG.gemini.models.flash, prompt, fileBuffer, mimeType);
}

/**
 * Extract structured job details from text or file buffer.
 * 
 * @param {Buffer} [fileBuffer] 
 * @param {string} [mimeType] 
 * @param {string} [textContent] 
 * @returns {Promise<object>}
 */
export async function analyzeJob(fileBuffer, mimeType, textContent = '') {
  const prompt = `你是一位专业的招聘顾问。请分析提供的企业招聘需求（可能是JD文件或文本内容），提取所有相关信息并生成结构化数据。
如果字段完全未提及，请将其填为空白字符串 "" 或 null，不要捏造任何信息。
对于“是否”类型的字段，请输出 "是"、"否" 或 "未知"。

输出格式必须是以下 JSON：
{
  "companyName": "公司名称（如果找不到，请填空）",
  "industry": "所属行业",
  "companyAddress": "公司地址",
  "contactName": "联系人姓名",
  "contactPosition": "联系人职位",
  "contactTelegram": "联系人 Telegram @username",
  "contactPhoneWhatsApp": "联系人 电话 / WhatsApp",
  "jobTitle": "招聘岗位名称",
  "headcount": "招聘人数，如 '3人' 或 '若干'，未提及填 null",
  "workLocation": "工作地点",
  "salaryRange": "薪资范围，如: '1000-1500 USD'",
  "workingHours": "工作时间/班次",
  "languageRequirements": "语言要求，例如: '中文', '中英双语'",
  "experienceRequirements": "工作经验要求，例如: '1年以上', '无限制'",
  "accommodationProvided": "是否提供住宿: '是'|'否'|'未知'",
  "visaProvided": "是否提供签证/工作证: '是'|'否'|'未知'",
  "expectedArrivalDate": "到岗时间要求",
  "jobDescription": "详细岗位职责描述摘要",
  "acceptServiceFeeRules": "是否接受服务费规则: '是'|'否'|'未知'",
  "otherNotes": "其他备注",
  "aiSummary": "用两三句简洁的话总结该岗位的核心要求和吸引力",
  "aiTags": ["行业标签", "岗位标签", "核心技能要求", "福利亮点"],
  "missingFields": ["列出招聘模板中缺失的关键项，例如：'薪资范围', '工作时间'等"]
}

【招聘需求内容】
${textContent}
`;

  return callGeminiJSON(CONFIG.gemini.models.flash, prompt, fileBuffer, mimeType);
}
