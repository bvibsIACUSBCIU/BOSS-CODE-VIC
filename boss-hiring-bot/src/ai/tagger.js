import { callGeminiJSON } from './geminiClient.js';
import { CONFIG } from '../config.js';

/**
 * Generate tags for a resume or job description content
 * @param {string} content 
 * @param {'CV'|'JD'} type 
 * @returns {Promise<string[]>}
 */
export async function generateTags(content, type) {
  const label = type === 'CV' ? '求职者简历' : '企业招聘岗位';
  const prompt = `你是一个专业的招聘标签分类引擎。请分析以下${label}的内容，生成包含多维度的核心标签列表。
标签需涵盖以下维度：
1. 行业与职能（如：IT互联网、销售、行政）
2. 核心技能（如：Python, 沟通技巧, 商务洽谈）
3. 语言能力（如：中文熟练, 英语熟练, 柬埔寨语）
4. 工作地点与亮点（如：金边, 西港, 提供住宿）

仅输出 JSON 字符串数组，格式为：["标签1", "标签2", "标签3", "标签4", "标签5"]。数量在 4 到 8 个之间。

【内容】
${content}
`;

  try {
    const result = await callGeminiJSON(CONFIG.gemini.models.flash, prompt);
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.tags)) return result.tags;
    return [];
  } catch (e) {
    console.error('generateTags failed:', e.message);
    return [];
  }
}
