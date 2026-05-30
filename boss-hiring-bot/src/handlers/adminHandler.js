import { isAdmin } from '../admin/adminGuard.js';
import { AirtableClient } from '../storage/airtableClient.js';
import { CONFIG } from '../config.js';

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
      await replyFunc(chatId, 'Usage: /admin_query <recordId> (e.g., CV-2605-0001)');
      return true;
    }
    await handleQuery(chatId, parts[1], replyFunc);
    return true;
  }

  return false;
}

export async function sendAdminMenu(chatId, replyFunc) {
  await replyFunc(chatId, '🔐 *Boss Hiring Admin Console*\n\nPlease select an administrative action:', {
    inline_keyboard: [
      [
        { text: '📊 RAG System Management', callback_data: 'admin:rag' },
        { text: '📋 Data Statistics', callback_data: 'admin:stats' }
      ],
      [
        { text: '🤖 Run Smart Matching', callback_data: 'admin:match' },
        { text: '⚙️ System Status Check', callback_data: 'admin:status' }
      ],
      [
        { text: '↩️ Back to Client Menu', callback_data: 'menu' }
      ]
    ]
  });
}

export async function handleAdminCallback(chatId, data, replyFunc) {
  if (!isAdmin(chatId)) return false;

  if (data === 'admin:rag') {
    await replyFunc(chatId, `📖 *RAG System Management*\n\n*Knowledge Base files list:*\n- FAQ Database: \`boss-hiring-faq.csv\` (Loaded)\n- Corporate Knowledge: \`boss-hiring-enterprise-knowledge-base.md\` (Loaded)\n- Scripts Database: \`boss-hiring-customer-service-scripts.csv\` (Loaded)\n\n*Status:* RAG context is online and indexed.`);
    return true;
  }

  if (data === 'admin:stats') {
    await replyFunc(chatId, '⏳ Fetching database statistics...');
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

      await replyFunc(chatId, `📊 *Database Statistics Overview*

*Candidates Database:*
- Total Profiles: ${candStats.total}
- Status "求职中 / ACTIVE": ${candStats.active}
- Status "已入职 / PLACED": ${candStats.placed}

*Jobs Database:*
- Total Job Listings: ${jobStats.total}
- Status "招聘中 / OPEN": ${jobStats.open}
- Status "已招聘 / FILLED": ${jobStats.filled}`);
    } catch (e) {
      await replyFunc(chatId, `❌ Failed to get stats: ${e.message}`);
    }
    return true;
  }

  if (data === 'admin:match') {
    await replyFunc(chatId, '⏳ Triggering cross-matching engine for all active records...');
    try {
      const candidates = await airtableClient.getRecords('Candidates');
      const jobs = await airtableClient.getRecords('Jobs');

      const activeCandidates = candidates.filter(c => c.status === '求职中' || c.status === 'ACTIVE' || !c.status);
      const activeJobs = jobs.filter(j => j.status === '招聘中' || j.status === 'OPEN' || !j.status);

      if (activeCandidates.length === 0 || activeJobs.length === 0) {
        await replyFunc(chatId, '⚠️ Matching cancelled: No active candidates or job listings found to match.');
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

      await replyFunc(chatId, `🤖 *Matching Engine Completed*
- Checked ${activeCandidates.length} active candidates against ${activeJobs.length} active jobs.
- Updated matching data for ${updatedCount} candidates.`);
    } catch (e) {
      await replyFunc(chatId, `❌ Match engine execution error: ${e.message}`);
    }
    return true;
  }

  if (data === 'admin:status') {
    const report = [];
    report.push('⚙️ *System Integration Status Report*');
    
    // Telegram Token
    report.push(CONFIG.telegram.token ? '✅ Telegram Token: Configured' : '❌ Telegram Token: Missing');
    
    // Gemini Config
    report.push(CONFIG.gemini.apiKey ? `✅ Gemini AI API Key: Configured (Models: Pro: ${CONFIG.gemini.models.pro}, Flash: ${CONFIG.gemini.models.flash})` : '❌ Gemini API Key: Missing');
    
    // Airtable config
    report.push(CONFIG.airtable.baseId ? '✅ Airtable Base ID: Configured' : '❌ Airtable Base ID: Missing');

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
