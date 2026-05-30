import { CONFIG } from '../config.js';

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

let isSyncing = false;
let hasSynced = false;

/**
 * Automatically check and synchronize Airtable tables and fields
 */
export async function syncAirtableSchema() {
  if (hasSynced || isSyncing) return;
  isSyncing = true;

  const pat = CONFIG.airtable.pat;
  const baseId = CONFIG.airtable.baseId;

  if (!pat || !baseId) {
    console.warn('[Airtable Schema Sync] Missing PAT or Base ID config. Skipping automatic schema sync.');
    isSyncing = false;
    return;
  }

  const headers = {
    'Authorization': `Bearer ${pat}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('[Airtable Schema Sync] Starting automatic schema verification...');
    
    // Step 1: Fetch all tables
    const checkUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
    const checkRes = await fetch(checkUrl, { headers });
    
    if (!checkRes.ok) {
      const err = await checkRes.json();
      throw new Error(`Failed to read base metadata: ${JSON.stringify(err)}`);
    }

    const { tables = [] } = await checkRes.json();
    
    // Helper to get schema fields from table
    const tableMap = new Map(tables.map(t => [t.name, t]));

    // Step 2: Sync Candidates table
    await syncTable('Candidates', candidatesFields, '求职者简历档案库', tableMap, baseId, headers);

    // Step 3: Sync Jobs table
    await syncTable('Jobs', jobsFields, '企业招聘需求岗位库', tableMap, baseId, headers);

    console.log('[Airtable Schema Sync] Automatic schema verification completed successfully!');
    hasSynced = true;
  } catch (error) {
    console.error('[Airtable Schema Sync] Schema verification error:', error.message);
  } finally {
    isSyncing = false;
  }
}

async function syncTable(tableName, expectedFields, description, tableMap, baseId, headers) {
  const table = tableMap.get(tableName);

  if (!table) {
    console.log(`[Airtable Schema Sync] Table "${tableName}" not found. Creating table...`);
    const createUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
    
    const response = await fetch(createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: tableName, fields: expectedFields, description })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to create table "${tableName}": ${JSON.stringify(data)}`);
    }
    console.log(`[Airtable Schema Sync] Table "${tableName}" created successfully.`);
  } else {
    // Table exists, check fields
    console.log(`[Airtable Schema Sync] Table "${tableName}" exists. Checking for missing fields...`);
    const existingFieldNames = new Set(table.fields.map(f => f.name));
    
    for (const field of expectedFields) {
      if (!existingFieldNames.has(field.name)) {
        console.log(`[Airtable Schema Sync] Field "${field.name}" is missing in table "${tableName}". Adding field...`);
        const addFieldUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${table.id}/fields`;
        
        const response = await fetch(addFieldUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(field)
        });

        const data = await response.json();
        if (!response.ok) {
          // If field was added in parallel or already exists, log it but don't crash
          if (data.error?.type === 'DUPLICATE_FIELD_NAME' || (data.error?.message && data.error.message.includes('already exists'))) {
            console.log(`[Airtable Schema Sync] Field "${field.name}" already exists in table "${tableName}". Skipping.`);
          } else {
            console.error(`[Airtable Schema Sync] Failed to add field "${field.name}" to table "${tableName}":`, JSON.stringify(data));
          }
        } else {
          console.log(`[Airtable Schema Sync] Field "${field.name}" added successfully to table "${tableName}".`);
        }
      }
    }
  }
}
