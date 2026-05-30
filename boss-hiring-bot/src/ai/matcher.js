import { callGeminiJSON } from './geminiClient.js';
import { CONFIG } from '../config.js';

/**
 * Perform programmatic pre-filtering followed by Gemini Pro deep matching.
 * Returns sorted list of jobs matching a candidate.
 * 
 * @param {object} candidate - Candidate record
 * @param {object[]} jobs - Array of job records
 * @returns {Promise<object[]>}
 */
export async function matchCandidateToJobs(candidate, jobs) {
  if (!jobs || jobs.length === 0) return [];

  // Step 1: Programmatic pre-filtering (soft match)
  const candidateTags = candidate.aiTags || [];
  const candidateLanguages = String(candidate.languages || '').toLowerCase();
  
  const preFiltered = jobs.filter(job => {
    // 1. Language checks (if job requires Chinese and candidate doesn't speak Chinese, skip)
    const reqLang = String(job.languageRequirements || '').toLowerCase();
    if (reqLang.includes('中') && !candidateLanguages.includes('中')) {
      return false;
    }
    if (reqLang.includes('英') && !candidateLanguages.includes('英')) {
      return false;
    }
    // Location check (soft: if they both specify locations and they don't match, still allow if candidate accepts 1234 / flexible)
    // Salary comparison (allow some room)
    return true;
  });

  // If no jobs pass the filter, fall back to evaluating all jobs (up to 5 to avoid token overhead)
  const candidatesForAI = preFiltered.length > 0 ? preFiltered.slice(0, 5) : jobs.slice(0, 5);

  const matchedResults = [];

  for (const job of candidatesForAI) {
    const prompt = `你是一位高阶招聘猎头专家。请对求职者简历与招聘岗位需求进行双向智能撮合与匹配度评分。

【求职者信息】
- 序号: ${candidate.recordId}
- 姓名: ${candidate.name}
- 优势摘要: ${candidate.aiSummary}
- 年龄/性别/国籍: ${candidate.age}/${candidate.gender}/${candidate.nationality}
- 期望岗位/薪资: ${candidate.expectedRole} / ${candidate.expectedSalary}
- 语言能力: ${candidate.languages}
- 工作年限/行业经验: ${candidate.experienceYears} / ${candidate.pastExperience}
- 可接受工作地点: ${candidate.acceptableLocation}
- 柬埔寨工作经验: ${candidate.cambodiaWorkExperience}
- 是否需要住宿/签证: ${candidate.accommodationSupport} / ${candidate.visaSupport}
- 其他备注: ${candidate.otherNotes}
- 标签: ${JSON.stringify(candidateTags)}

【招聘岗位需求】
- 序号: ${job.recordId}
- 岗位名称: ${job.jobTitle}
- 岗位摘要: ${job.aiSummary}
- 公司/行业: ${job.companyName} / ${job.industry}
- 招聘人数: ${job.headcount}
- 工作地点/时间: ${job.workLocation} / ${job.workingHours}
- 薪资范围: ${job.salaryRange}
- 语言/工作经验要求: ${job.languageRequirements} / ${job.experienceRequirements}
- 是否提供住宿/签证: ${job.accommodationProvided} / ${job.visaProvided}
- 岗位描述: ${job.jobDescription}
- 其他备注: ${job.otherNotes}
- 标签: ${JSON.stringify(job.aiTags || [])}

评估标准包括以下维度：
1. 岗位职责与求职者过往技能契合度 (30分)
2. 语言技能匹配度 (20分)
3. 经验年限与期望岗位适配 (15分)
4. 期望薪资与岗位范围匹配 (15分)
5. 工作地点、住宿与签证等物流条件可行性 (20分)

请输出以下 JSON：
{
  "totalScore": 85,
  "matchReason": "匹配原因的详细陈述，说明优势与风险点",
  "recommendation": "强烈推荐|推荐|谨慎推荐|不推荐"
}
`;

    try {
      // Must use Pro model for complex matching reasoning
      const result = await callGeminiJSON(CONFIG.gemini.models.pro, prompt);
      
      matchedResults.push({
        jobId: job.recordId,
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        totalScore: result.totalScore || 0,
        matchReason: result.matchReason || '',
        recommendation: result.recommendation || '未知',
      });
    } catch (e) {
      console.error(`Error matching ${candidate.recordId} to ${job.recordId}:`, e.message);
    }
  }

  // Sort by score descending
  return matchedResults.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Perform deep matching to find the best candidates for a job.
 * 
 * @param {object} job - Job record
 * @param {object[]} candidates - Array of candidate records
 * @returns {Promise<object[]>}
 */
export async function matchJobToCandidates(job, candidates) {
  if (!candidates || candidates.length === 0) return [];

  // Step 1: Programmatic pre-filtering
  const jobLanguages = String(job.languageRequirements || '').toLowerCase();
  
  const preFiltered = candidates.filter(cand => {
    const candLanguages = String(cand.languages || '').toLowerCase();
    if (jobLanguages.includes('中') && !candLanguages.includes('中')) {
      return false;
    }
    if (jobLanguages.includes('英') && !candLanguages.includes('英')) {
      return false;
    }
    return true;
  });

  const candidatesForAI = preFiltered.length > 0 ? preFiltered.slice(0, 5) : candidates.slice(0, 5);
  const matchedResults = [];

  for (const candidate of candidatesForAI) {
    const prompt = `你是一位高阶招聘猎头专家。请对求职者简历与招聘岗位需求进行双向智能撮合与匹配度评分。

【求职者信息】
- 序号: ${candidate.recordId}
- 姓名: ${candidate.name}
- 优势摘要: ${candidate.aiSummary}
- 年龄/性别/国籍: ${candidate.age}/${candidate.gender}/${candidate.nationality}
- 期望岗位/薪资: ${candidate.expectedRole} / ${candidate.expectedSalary}
- 语言能力: ${candidate.languages}
- 工作年限/行业经验: ${candidate.experienceYears} / ${candidate.pastExperience}
- 可接受工作地点: ${candidate.acceptableLocation}
- 柬埔寨工作经验: ${candidate.cambodiaWorkExperience}
- 是否需要住宿/签证: ${candidate.accommodationSupport} / ${candidate.visaSupport}
- 其他备注: ${candidate.otherNotes}

【招聘岗位需求】
- 序号: ${job.recordId}
- 岗位名称: ${job.jobTitle}
- 岗位摘要: ${job.aiSummary}
- 公司/行业: ${job.companyName} / ${job.industry}
- 招聘人数: ${job.headcount}
- 工作地点/时间: ${job.workLocation} / ${job.workingHours}
- 薪资范围: ${job.salaryRange}
- 语言/工作经验要求: ${job.languageRequirements} / ${job.experienceRequirements}
- 是否提供住宿/签证: ${job.accommodationProvided} / ${job.visaProvided}
- 岗位描述: ${job.jobDescription}
- 其他备注: ${job.otherNotes}

评估标准包括以下维度：
1. 岗位职责与求职者过往技能契合度 (30分)
2. 语言技能匹配度 (20分)
3. 经验年限与期望岗位适配 (15分)
4. 期望薪资与岗位范围匹配 (15分)
5. 工作地点、住宿与签证等物流条件可行性 (20分)

请输出以下 JSON：
{
  "totalScore": 85,
  "matchReason": "匹配原因的详细陈述，说明优势与风险点",
  "recommendation": "强烈推荐|推荐|谨慎推荐|不推荐"
}
`;

    try {
      // Must use Pro model for complex matching reasoning
      const result = await callGeminiJSON(CONFIG.gemini.models.pro, prompt);
      
      matchedResults.push({
        candidateId: candidate.recordId,
        candidateName: candidate.name,
        expectedRole: candidate.expectedRole,
        totalScore: result.totalScore || 0,
        matchReason: result.matchReason || '',
        recommendation: result.recommendation || '未知',
      });
    } catch (e) {
      console.error(`Error matching ${candidate.recordId} to ${job.recordId}:`, e.message);
    }
  }

  // Sort by score descending
  return matchedResults.sort((a, b) => b.totalScore - a.totalScore);
}
