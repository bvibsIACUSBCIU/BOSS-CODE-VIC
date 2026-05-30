import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
loadEnv(path.join(rootDir, '.env'));

const pat = process.env.AIRTABLE_PAT || 'patL9Y1ki6JUWGsbs.bb9d0abe02be8d072e2edd6c048bfeb92d8694da69ff5199efe7f4341067f44';
const baseId = process.env.AIRTABLE_BASE_ID;

if (!baseId) {
  console.error("❌ ERROR: Missing AIRTABLE_BASE_ID in .env file. Please create an Airtable Base first and grab the ID from its URL.");
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${pat}`,
  'Content-Type': 'application/json'
};

const candidatesFields = [
  { name: 'recordId', type: 'singleLineText' },
  { name: 'status', type: 'singleLineText' },
  { name: 'submittedAt', type: 'singleLineText' },
  { name: 'lang', type: 'singleLineText' },
  { name: 'telegramId', type: 'singleLineText' },
  { name: 'username', type: 'singleLineText' },
  { name: 'name', type: 'singleLineText' },
  { name: 'gender', type: 'singleLineText' },
  { name: 'age', type: 'number', options: { precision: 0 } },
  { name: 'nationality', type: 'singleLineText' },
  { name: 'currentCity', type: 'singleLineText' },
  { name: 'telegramContact', type: 'singleLineText' },
  { name: 'phoneWhatsApp', type: 'singleLineText' },
  { name: 'languages', type: 'singleLineText' },
  { name: 'education', type: 'singleLineText' },
  { name: 'experienceYears', type: 'singleLineText' },
  { name: 'pastExperience', type: 'singleLineText' },
  { name: 'expectedRole', type: 'singleLineText' },
  { name: 'expectedSalary', type: 'singleLineText' },
  { name: 'acceptableLocation', type: 'singleLineText' },
  { name: 'availableStartDate', type: 'singleLineText' },
  { name: 'cambodiaWorkExperience', type: 'singleLineText' },
  { name: 'accommodationSupport', type: 'singleLineText' },
  { name: 'visaSupport', type: 'singleLineText' },
  { name: 'otherNotes', type: 'multilineText' },
  { name: 'resumeFile', type: 'multipleAttachments' },
  { name: 'aiSummary', type: 'multilineText' },
  { name: 'aiTags', type: 'multilineText' },
  { name: 'missingFields', type: 'multilineText' },
  { name: 'matchedJobs', type: 'multilineText' },
  { name: 'notes', type: 'multilineText' },
  { name: 'updatedAt', type: 'singleLineText' }
];

const jobsFields = [
  { name: 'recordId', type: 'singleLineText' },
  { name: 'status', type: 'singleLineText' },
  { name: 'submittedAt', type: 'singleLineText' },
  { name: 'companyName', type: 'singleLineText' },
  { name: 'industry', type: 'singleLineText' },
  { name: 'companyAddress', type: 'singleLineText' },
  { name: 'contactName', type: 'singleLineText' },
  { name: 'contactPosition', type: 'singleLineText' },
  { name: 'contactTelegram', type: 'singleLineText' },
  { name: 'contactPhoneWhatsApp', type: 'singleLineText' },
  { name: 'jobTitle', type: 'singleLineText' },
  { name: 'headcount', type: 'singleLineText' },
  { name: 'workLocation', type: 'singleLineText' },
  { name: 'salaryRange', type: 'singleLineText' },
  { name: 'workingHours', type: 'singleLineText' },
  { name: 'languageRequirements', type: 'singleLineText' },
  { name: 'experienceRequirements', type: 'singleLineText' },
  { name: 'accommodationProvided', type: 'singleLineText' },
  { name: 'visaProvided', type: 'singleLineText' },
  { name: 'expectedArrivalDate', type: 'singleLineText' },
  { name: 'jobDescription', type: 'multilineText' },
  { name: 'acceptServiceFeeRules', type: 'singleLineText' },
  { name: 'otherNotes', type: 'multilineText' },
  { name: 'jobFile', type: 'multipleAttachments' },
  { name: 'aiSummary', type: 'multilineText' },
  { name: 'aiTags', type: 'multilineText' },
  { name: 'missingFields', type: 'multilineText' },
  { name: 'matchedCandidates', type: 'multilineText' },
  { name: 'notes', type: 'multilineText' },
  { name: 'lang', type: 'singleLineText' },
  { name: 'telegramId', type: 'singleLineText' },
  { name: 'username', type: 'singleLineText' },
  { name: 'updatedAt', type: 'singleLineText' }
];

async function createTable(name, fields, description) {
  const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, fields, description })
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`✅ Table "${name}" created successfully in Airtable.`);
  } else {
    // If table already exists, it is safe to skip
    if (data.error?.type === 'DUPLICATE_TABLE_NAME' || response.status === 422 || (data.error?.message && data.error.message.includes('already exists'))) {
      console.log(`ℹ️ Table "${name}" already exists. Skipping creation.`);
    } else {
      console.error(`❌ Failed to create table "${name}":`, JSON.stringify(data));
    }
  }
}

async function main() {
  console.log("⚙️  Checking Airtable connection and setting up base tables...");
  
  // Verify base connection
  const checkUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
  const testRes = await fetch(checkUrl, { headers });
  if (!testRes.ok) {
    const errorDetails = await testRes.json();
    console.error("❌ Authentication error: Please check your AIRTABLE_PAT scope permissions (requires metadata.reader and metadata.writer to auto-setup) or check your BASE ID.");
    console.error("Error response details:", errorDetails);
    process.exit(1);
  }

  // Create Candidates table
  await createTable('Candidates', candidatesFields, '求职者简历档案库');
  // Create Jobs table
  await createTable('Jobs', jobsFields, '企业招聘需求岗位库');
  
  console.log("🎉 Airtable Database Schema Setup Completed!");
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    process.env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
}

main();
