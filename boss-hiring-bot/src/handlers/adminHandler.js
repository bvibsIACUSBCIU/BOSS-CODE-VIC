import { isAdmin } from '../admin/adminGuard.js';
import { AirtableClient } from '../storage/airtableClient.js';
import { CONFIG } from '../config.js';
import fs from 'node:fs';
import path from 'node:path';

const airtableClient = new AirtableClient();

export async function handleAdminCommand(chatId, text, replyFunc) {
  if (!isAdmin(chatId)) return false;

  const trimmed = text.trim();
  if (trimmed === '/admin') {
    await sendAdminMenu(chatId, replyFunc);
    return true;
  }

  // Handle specific text commands for admins if any
  if (trimmed.startsWith('/admin_query')) {
    const parts = trimmed.split(' ');
    if (parts.length < 2) {
      await replyFunc(chatId, '用法：/admin_query <recordId> (例如：CV-2605-0001)');
      return true;
    }
    await handleQuery(chatId, parts[1], replyFunc);
    return true;
  }

  return false;
}

export async function sendAdminMenu(chatId, replyFunc) {
  await replyFunc(chatId, '🔐 *Boss Hiring 管理员控制台*\n\n请选择您要执行的管理操作：', {
    inline_keyboard: [
      [
        { text: '📊 RAG 系统管理', callback_data: 'admin:rag' },
        { text: '📋 数据统计', callback_data: 'admin:stats' }
      ],
      [
        { text: '🤖 运行智能匹配', callback_data: 'admin:match' },
        { text: '⚙️ 系统状态检查', callback_data: 'admin:status' }
      ],
      [
        { text: '↩️ 返回客户菜单', callback_data: 'menu' }
      ]
    ]
  });
}

export async function handleAdminCallback(chatId, data, replyFunc) {
  if (!isAdmin(chatId)) return false;

  if (data === 'admin:menu') {
    await sendAdminMenu(chatId, replyFunc);
    return true;
  }

  if (data === 'admin:rag') {
    const kbDir = path.join(process.cwd(), 'knowledge-base');
    let uploadedText = '';
    if (fs.existsSync(kbDir)) {
      const files = fs.readdirSync(kbDir);
      const uploadedFiles = files.filter(f => f.startsWith('uploaded_'));
      if (uploadedFiles.length > 0) {
        uploadedText = `\n*已上传的补充知识库:*\n` + uploadedFiles.map(f => `- \`${f}\``).join('\n');
      }
    }

    await replyFunc(chatId, `📖 *RAG 系统管理*\n\n*标准知识库文件:*\n- FAQ 问答库: \`boss-hiring-faq.csv\`\n- 企业知识总文档: \`boss-hiring-enterprise-knowledge-base.md\`\n- 客服标准话术: \`boss-hiring-customer-service-scripts.csv\`${uploadedText}\n\n*状态:* RAG 检索服务在线，向量索引已构建。\n\n请点击下方按钮补充知识库。`, {
      inline_keyboard: [
        [{ text: '➕ 补充 RAG 知识库', callback_data: 'admin:rag_upload_prompt' }],
        [{ text: '↩️ 返回管理员菜单', callback_data: 'admin:menu' }]
      ]
    });
    return true;
  }

  if (data === 'admin:stats') {
    await replyFunc(chatId, '⏳ 正在从数据库获取统计数据，请稍候...');
    try {
      const candidates = await airtableClient.getRecords('Candidates');
      const jobs = await airtableClient.getRecords('Jobs');

      const candStats = { total: candidates.length, active: 0, placed: 0 };
      candidates.forEach(c => {
        if (c.status === '求职中' || c.status === 'ACTIVE') candStats.active++;
        if (c.status === '已入职' || c.status === 'PLACED') candStats.placed++;
      });

      const jobStats = { total: jobs.length, open: 0, filled: 0 };
      jobs.forEach(j => {
        if (j.status === '招聘中' || j.status === 'OPEN') jobStats.open++;
        if (j.status === '已招聘' || j.status === 'FILLED') jobStats.filled++;
      });

      await replyFunc(chatId, `📊 *数据库统计概览*
 
*求职者数据库:*
- 个人档案总数: ${candStats.total}
- 状态为 "求职中 / ACTIVE": ${candStats.active}
- 状态为 "已入职 / PLACED": ${candStats.placed}
 
*企业招聘数据库:*
- 岗位发布总数: ${jobStats.total}
- 状态为 "招聘中 / OPEN": ${jobStats.open}
- 状态为 "已招聘 / FILLED": ${jobStats.filled}`);
    } catch (e) {
      await replyFunc(chatId, `❌ 获取统计数据失败: ${e.message}`);
    }
    return true;
  }

  if (data === 'admin:match') {
    await replyFunc(chatId, '⏳ 正在为所有活跃记录运行智能匹配引擎...');
    try {
      const candidates = await airtableClient.getRecords('Candidates');
      const jobs = await airtableClient.getRecords('Jobs');

      const activeCandidates = candidates.filter(c => c.status === '求职中' || c.status === 'ACTIVE' || !c.status);
      const activeJobs = jobs.filter(j => j.status === '招聘中' || j.status === 'OPEN' || !j.status);

      if (activeCandidates.length === 0 || activeJobs.length === 0) {
        await replyFunc(chatId, '⚠️ 智能匹配取消：未找到活跃的求职者或招聘岗位。');
        return true;
      }

      const { matchCandidateToJobs } = await import('../ai/matcher.js');

      let updatedCount = 0;
      for (const cand of activeCandidates) {
        const matches = await matchCandidateToJobs(cand, activeJobs);
        if (matches.length > 0) {
          const matchString = JSON.stringify(matches.slice(0, 3).map(m => `${m.jobId} (${m.totalScore}分)`));
          await airtableClient.updateByRecordId('Candidates', cand.recordId, {
            matchedJobs: matchString,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      }

      await replyFunc(chatId, `🤖 *智能匹配执行完成*
- 匹配校验：${activeCandidates.length} 位活跃求职者 vs ${activeJobs.length} 个活跃岗位
- 成功更新匹配数据的求职者数：${updatedCount} 人`);
    } catch (e) {
      await replyFunc(chatId, `❌ 匹配引擎运行错误: ${e.message}`);
    }
    return true;
  }

  if (data === 'admin:status') {
    const report = [];
    report.push('⚙️ *系统集成状态检查报告*');
    
    // Telegram Token
    report.push(CONFIG.telegram.token ? '✅ Telegram Token: 已配置' : '❌ Telegram Token: 未配置');
    
    // Gemini Config
    report.push(CONFIG.gemini.apiKey ? `✅ Gemini AI API Key: 已配置 (模型: Pro: ${CONFIG.gemini.models.pro}, Flash: ${CONFIG.gemini.models.flash})` : '❌ Gemini API Key: 未配置');
    
    // Airtable config
    report.push(CONFIG.airtable.baseId ? '✅ Airtable Base ID: 已配置' : '❌ Airtable Base ID: 未配置');

    await replyFunc(chatId, report.join('\n'));
    return true;
  }

  return false;
}

async function handleQuery(chatId, recordId, replyFunc) {
  const isCV = recordId.startsWith('CV-');
  const tableName = isCV ? 'Candidates' : 'Jobs';
  
  try {
    const records = await airtableClient.getRecords(tableName);
    const item = records.find(r => r.recordId === recordId);
    
    if (!item) {
      await replyFunc(chatId, `❌ Record not found: "${recordId}"`);
      return;
    }

    let summaryText = `📋 *Record Detail: ${recordId}* (Status: ${item.status || 'SUBMITTED'})\n\n`;
    
    if (isCV) {
      const fileUrl = item.resumeFile?.[0]?.url || '#';
      summaryText += `*Name:* ${item.name}\n`;
      summaryText += `*Experience:* ${item.experienceYears} (${item.pastExperience})\n`;
      summaryText += `*Languages:* ${item.languages}\n`;
      summaryText += `*Expected Role:* ${item.expectedRole} (${item.expectedSalary})\n`;
      summaryText += `*AI Summary:* ${item.aiSummary}\n`;
      summaryText += `*File link:* [Open CV File](${fileUrl})\n`;
    } else {
      const fileUrl = item.jobFile?.[0]?.url || '#';
      summaryText += `*Company:* ${item.companyName} (${item.industry})\n`;
      summaryText += `*Job Title:* ${item.jobTitle} (${item.headcount})\n`;
      summaryText += `*Location:* ${item.workLocation}\n`;
      summaryText += `*Salary:* ${item.salaryRange}\n`;
      summaryText += `*AI Summary:* ${item.aiSummary}\n`;
      summaryText += `*File link:* [Open JD File](${fileUrl})\n`;
    }
    
    await replyFunc(chatId, summaryText);
  } catch (e) {
    await replyFunc(chatId, `❌ Error querying database: ${e.message}`);
  }
}
