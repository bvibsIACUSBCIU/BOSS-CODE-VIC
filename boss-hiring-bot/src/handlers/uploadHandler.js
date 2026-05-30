import { CONFIG } from '../config.js';
import { AirtableClient } from '../storage/airtableClient.js';
import { generateRecordId } from '../storage/recordIdGenerator.js';
import { analyzeResume, analyzeJob } from '../ai/summarizer.js';
import { matchCandidateToJobs, matchJobToCandidates } from '../ai/matcher.js';

const airtableClient = new AirtableClient();

/**
 * Handle document or photo uploaded by a user.
 * 
 * @param {string} chatId 
 * @param {object} message 
 * @param {string} context - 'candidate' | 'employer' | 'unknown'
 * @param {string} lang - 'zh' | 'en' | 'km'
 * @param {function} replyFunc - async function(chatId, text, replyMarkup)
 * @param {function} notifyInternalFunc - async function(text)
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
  const tableName = isCandidate ? 'Candidates' : 'Jobs';

  const processingMsg = isCandidate
    ? {
        zh: '已收到您的简历文件。系统正在由 AI 进行深度解析、提取标签并上传归档，请稍候...',
        en: 'Resume received. The system is parsing details, extracting tags, and archiving via AI. Please wait...',
        km: 'បានទទួលឯកសារ CV របស់អ្នកហើយ។ ប្រព័ន្ធកំពុងដំណើរការវិភាគ AI និងបញ្ចូលឯកសារ សូមរង់ចាំ...'
      }
    : {
        zh: '已收到您的招聘需求。系统正在由 AI 梳理岗位摘要、提取标签并上传归档，请稍候...',
        en: 'Hiring request received. The system is summarizing, extracting tags, and archiving via AI. Please wait...',
        km: 'បានទទួលឯកសារតម្រូវការជ្រើសរើសហើយ។ ប្រព័ន្ធកំពុងដំណើរការវិភាគ AI សូមរង់ចាំ...'
      };

  await replyFunc(chatId, processingMsg[lang] || processingMsg.zh);

  try {
    // Step 1: Get Telegram File download URL
    const fileInfo = await getTelegramFileUrl(fileId);

    // Step 2: Download file buffer for Gemini multimodal processing
    const fileResponse = await fetch(fileInfo.downloadUrl);
    if (!fileResponse.ok) throw new Error(`Failed to download TG file: ${fileResponse.status}`);
    const buffer = Buffer.from(await fileResponse.arrayBuffer());

    // Step 3: Extract details with Gemini
    let aiResult;
    if (isCandidate) {
      aiResult = await analyzeResume(buffer, mimeType);
    } else {
      aiResult = await analyzeJob(buffer, mimeType);
    }

    // Step 4: Generate record ID
    const recordId = await generateRecordId(typePrefix, airtableClient);

    // Step 5: Resolve Names for Standardized file naming
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let fileExt = originalFileName.split('.').pop() || 'jpg';
    if (fileExt === originalFileName) fileExt = mimeType.split('/').pop() || 'jpg';

    let stdFileName;
    if (isCandidate) {
      const cleanName = (aiResult.name || `${user.first_name || ''}${user.last_name || ''}` || 'Candidate')
        .replace(/[\s/\\?%*:|"<>]/g, '_');
      stdFileName = `CV-${recordId}-${dateStr}-${cleanName}.${fileExt}`;
    } else {
      const cleanCompany = (aiResult.companyName || 'Company')
        .replace(/[\s/\\?%*:|"<>]/g, '_');
      stdFileName = `JD-${recordId}-${dateStr}-${cleanCompany}.${fileExt}`;
    }

    // Step 6: Create Airtable Attachment structure
    const fileAttachment = [
      {
        url: fileInfo.downloadUrl,
        filename: stdFileName
      }
    ];

    // Step 7: Create database record
    const record = {
      recordId,
      status: isCandidate ? '求职中' : '招聘中',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalFileName,
      mimeType,
      ...aiResult
    };

    if (isCandidate) {
      record.resumeFile = fileAttachment;
    } else {
      record.jobFile = fileAttachment;
    }

    // Make sure telegram info is captured correctly
    record.lang = lang;
    record.telegramId = String(chatId);
    record.username = user.username ? `@${user.username}` : '';

    if (isCandidate) {
      if (!record.name) {
        record.name = [user.first_name, user.last_name].filter(Boolean).join(' ') || '求职者';
      }
      if (!record.telegramContact) record.telegramContact = user.username ? `@${user.username}` : '';
    } else {
      if (!record.contactTelegram) record.contactTelegram = user.username ? `@${user.username}` : '';
    }

    // Step 8: Write to Airtable
    await airtableClient.appendRecord(tableName, record);

    // Step 9: Trigger smart matching (AI assist)
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
            await airtableClient.updateByRecordId('Candidates', recordId, {
              matchedJobs: record.matchedJobs
            });
            matchReport = `\n\n🎯 *智能推荐岗位：*\n` + topMatches.map(m => `- ${m.jobId}: [${m.jobTitle}](${m.companyName || '未知企业'}) (匹配度: ${m.totalScore}分, ${m.recommendation})`).join('\n');
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
            await airtableClient.updateByRecordId('Jobs', recordId, {
              matchedCandidates: record.matchedCandidates
            });
            matchReport = `\n\n🎯 *智能推荐求职者：*\n` + topMatches.map(m => `- ${m.candidateId}: ${m.candidateName} (${m.expectedRole}) (匹配度: ${m.totalScore}分, ${m.recommendation})`).join('\n');
          }
        }
      }
    } catch (matchErr) {
      console.error('Match engine failure during upload:', matchErr.message);
    }

    // Step 10: Send internal group notification
    const internalTitle = isCandidate ? '新求职者简历登记' : '新企业招聘需求登记';
    const internalDetails = isCandidate
      ? `👤 姓名：${record.name}\n💼 期望岗位：${record.expectedRole}\n💰 期望薪资：${record.expectedSalary}\n🗣 语言能力：${record.languages}\n📍 意向地点：${record.acceptableLocation}`
      : `🏢 公司：${record.companyName}\n👔 招聘岗位：${record.jobTitle}\n👥 招聘人数：${record.headcount}\n💰 薪资范围：${record.salaryRange}\n📍 工作地点：${record.workLocation}`;

    await notifyInternalFunc(
      `【${internalTitle} - 序号：${recordId}】\n` +
      `时间：${record.submittedAt}\n` +
      `Telegram：[${[user.first_name, user.last_name].filter(Boolean).join(' ')}](tg://user?id=${user.id}) ${user.username ? '@' + user.username : ''}\n` +
      `${internalDetails}\n\n` +
      `🤖 *AI 摘要：*${record.aiSummary}\n` +
      `🏷 *AI 标签：*${(record.aiTags || []).join(', ')}\n` +
      `⚠️ *缺失关键信息：*${(record.missingFields || []).join(', ') || '无'}\n` +
      `📁 *归档文件：* [点击查看原始附件](${fileInfo.downloadUrl})` +
      matchReport
    );

    // Step 11: Inform the client of completion
    const completionMsg = isCandidate
      ? {
          zh: `提交成功！\n\n您的简历已整理完毕，生成序号：*${recordId}*。\n\n我们会保护您的隐私（不会对外直接暴露您的姓名和联系方式），根据 AI 匹配度为您推荐岗位，并在顾问确认后与您联系。`,
          en: `Submitted successfully!\n\nYour profile has been processed with ID: *${recordId}*.\n\nWe protect your privacy by hidden contact details, using AI to match jobs, and our consultant will reach out to you once matching is confirmed.`,
          km: `បានបញ្ជូនដោយជោគជ័យ!\n\nប្រវត្តិរូបរបស់អ្នកត្រូវបានចុះបញ្ជីលេខ៖ *${recordId}*។\n\nយើងខ្ញុំនឹងរក្សាការសម្ងាត់ព័ត៌មានរបស់អ្នក ផ្គូផ្គងជាមួយឱកាសការងារ AI ហើយទីប្រឹក្សានឹងទាក់ទងទៅវិញក្នុងពេលឆាប់ៗ។`
        }
      : {
          zh: `需求提交成功！\n\n您的岗位登记已处理完毕，生成序号：*${recordId}*。\n\n顾问会在确认合作规则与服务条款后，向您推荐匹配的候选人。`,
          en: `Hiring request submitted!\n\nYour listing has been registered with ID: *${recordId}*.\n\nOur consultant will verify cooperation rules and then send qualified candidates matching your role.`,
          km: `បានបញ្ជូនតម្រូវការជ្រើសរើសដោយជោគជ័យ!\n\nតម្រូវការការងារត្រូវបានចុះបញ្ជីលេខ៖ *${recordId}*។\n\nទីប្រឹក្សានឹងទាក់ទងបញ្ជាក់ព័ត៌មាន បន្ទាប់មកណែនាំបេក្ខជនដែលសមរម្យ。`
        };

    await replyFunc(chatId, completionMsg[lang] || completionMsg.zh);

  } catch (error) {
    console.error('File upload handling failed:', error);
    await replyFunc(chatId, lang === 'zh' ? '抱歉，处理文件上传时发生错误，请稍后再试。' : 'Sorry, an error occurred while processing your file upload. Please try again later.');
  }
}

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
