import { CONFIG } from '../config.js';

export const CANDIDATE_SCHEMA_FIELDS = [
  'recordId', 'status', 'submittedAt', 'lang', 'telegramId', 'username', 'name', 'gender', 'age',
  'nationality', 'currentCity', 'telegramContact', 'phoneWhatsApp', 'languages', 'education',
  'experienceYears', 'pastExperience', 'expectedRole', 'expectedSalary', 'acceptableLocation',
  'availableStartDate', 'cambodiaWorkExperience', 'accommodationSupport', 'visaSupport', 'otherNotes',
  'resumeFile', 'aiSummary', 'aiTags', 'missingFields', 'matchedJobs', 'notes', 'updatedAt'
];

export const JOB_SCHEMA_FIELDS = [
  'recordId', 'status', 'submittedAt', 'companyName', 'industry', 'companyAddress', 'contactName',
  'contactPosition', 'contactTelegram', 'contactPhoneWhatsApp', 'jobTitle', 'headcount', 'workLocation',
  'salaryRange', 'workingHours', 'languageRequirements', 'experienceRequirements', 'accommodationProvided',
  'visaProvided', 'expectedArrivalDate', 'jobDescription', 'acceptServiceFeeRules', 'otherNotes',
  'jobFile', 'aiSummary', 'aiTags', 'missingFields', 'matchedCandidates', 'notes', 'updatedAt',
  'lang', 'telegramId', 'username'
];

export class AirtableClient {
  #pat;
  #baseId;
  #headers;

  constructor() {
    this.#pat = CONFIG.airtable.pat;
    this.#baseId = CONFIG.airtable.baseId;
    this.#headers = {
      'Authorization': `Bearer ${this.#pat}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Insert a record into Airtable
   * @param {string} tableName 
   * @param {object} record 
   */
  async appendRecord(tableName, record) {
    if (!this.#baseId) throw new Error('Missing AIRTABLE_BASE_ID config.');

    const url = `https://api.airtable.com/v0/${this.#baseId}/${tableName}`;
    
    const allowedFields = tableName === 'Candidates' ? CANDIDATE_SCHEMA_FIELDS : JOB_SCHEMA_FIELDS;

    // Map array values for multiple select if needed, or serialize objects
    const fields = {};
    for (const [key, val] of Object.entries(record)) {
      if (val === undefined || val === null) continue;
      
      // Filter out fields that are not in the schema
      if (!allowedFields.includes(key)) continue;
      
      // In Airtable, attachments should be an array of objects
      if (key === 'resumeFile' || key === 'jobFile') {
        fields[key] = val;
      } else if (key === 'aiTags') {
        // Convert tag array to comma-separated string to look clean in Airtable UI and prevent permission errors
        fields[key] = Array.isArray(val) ? val.filter(Boolean).join(', ') : String(val || '');
      } else if (typeof val === 'object') {
        fields[key] = JSON.stringify(val);
      } else {
        fields[key] = val;
      }
    }

    const payload = {
      records: [{ fields }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.#headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Airtable appendRecord failed: ${data.error?.message || response.statusText}`);
    }
    return data.records[0];
  }

  /**
   * Update fields for a record by its recordId
   * @param {string} tableName 
   * @param {string} recordId 
   * @param {object} updates 
   */
  async updateByRecordId(tableName, recordId, updates) {
    if (!this.#baseId) throw new Error('Missing AIRTABLE_BASE_ID config.');

    // Step 1: Find internal Airtable ID (recXXXXXX)
    const airtableId = await this.#getAirtableId(tableName, recordId);
    if (!airtableId) {
      throw new Error(`Record ${recordId} not found in ${tableName}`);
    }

    // Step 2: Patch updates
    const url = `https://api.airtable.com/v0/${this.#baseId}/${tableName}/${airtableId}`;
    
    const allowedFields = tableName === 'Candidates' ? CANDIDATE_SCHEMA_FIELDS : JOB_SCHEMA_FIELDS;

    const fields = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined || val === null) continue;
      
      // Filter out fields that are not in the schema
      if (!allowedFields.includes(key)) continue;

      if (key === 'aiTags') {
        // Convert tag array to comma-separated string to look clean in Airtable UI and prevent permission errors
        fields[key] = Array.isArray(val) ? val.filter(Boolean).join(', ') : String(val || '');
      } else if (typeof val === 'object') {
        fields[key] = JSON.stringify(val);
      } else {
        fields[key] = val;
      }
    }

    const payload = { fields };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.#headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Airtable updateByRecordId failed: ${data.error?.message || response.statusText}`);
    }
    return data;
  }

  /**
   * Find internal Airtable record ID by its custom recordId field
   */
  async #getAirtableId(tableName, recordId) {
    const filter = encodeURIComponent(`{recordId}='${recordId}'`);
    const url = `https://api.airtable.com/v0/${this.#baseId}/${tableName}?filterByFormula=${filter}&maxRecords=1`;
    
    const response = await fetch(url, { headers: this.#headers });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Airtable query failed: ${data.error?.message || response.statusText}`);
    }
    return data.records?.[0]?.id || null;
  }

  /**
   * Find max sequence number under specified prefix in column recordId
   * @param {string} tableName 
   * @param {string} prefix 
   * @returns {Promise<number>}
   */
  async getLastSequenceNumber(tableName, prefix) {
    if (!this.#baseId) return 0;

    // We can filter using formula: SEARCH("CV-2605-", {recordId}) = 1
    const filter = encodeURIComponent(`SEARCH('${prefix}', {recordId}) = 1`);
    const url = `https://api.airtable.com/v0/${this.#baseId}/${tableName}?filterByFormula=${filter}&fields[]=recordId`;
    
    try {
      const response = await fetch(url, { headers: this.#headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message);

      let maxSeq = 0;
      for (const record of data.records || []) {
        const val = record.fields.recordId;
        if (val && val.startsWith(prefix)) {
          const parts = val.split('-');
          const seqPart = parts[parts.length - 1];
          const seq = parseInt(seqPart, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
      return maxSeq;
    } catch (e) {
      console.warn(`[Airtable Client] Could not read table ${tableName} to find last sequence. Defaulting to 0. Error: ${e.message}`);
      return 0;
    }
  }

  /**
   * Get all records from a table
   * @param {string} tableName 
   * @returns {Promise<object[]>}
   */
  async getRecords(tableName) {
    if (!this.#baseId) return [];

    let allRecords = [];
    let offset = null;
    
    try {
      do {
        let url = `https://api.airtable.com/v0/${this.#baseId}/${tableName}`;
        if (offset) {
          url += `?offset=${offset}`;
        }
        
        const response = await fetch(url, { headers: this.#headers });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || response.statusText);
        }
        
        allRecords.push(...(data.records || []));
        offset = data.offset;
      } while (offset);

      return allRecords.map(r => {
        const record = { airtableRecordId: r.id, ...r.fields };
        // Post-process stringified fields if any
        for (const [key, val] of Object.entries(record)) {
          if (key === 'aiTags' && typeof val === 'string') {
            // Support parsing comma-separated tags or JSON arrays
            if (val.startsWith('[') && val.endsWith(']')) {
              try {
                record[key] = JSON.parse(val);
              } catch (e) {
                record[key] = val.split(',').map(s => s.trim()).filter(Boolean);
              }
            } else {
              record[key] = val.split(',').map(s => s.trim()).filter(Boolean);
            }
          } else if (typeof val === 'string' && 
              ((val.startsWith('[') && val.endsWith(']')) || 
               (val.startsWith('{') && val.endsWith('}')))) {
            try {
              record[key] = JSON.parse(val);
            } catch (e) {
              // Ignore
            }
          }
        }
        return record;
      });
    } catch (e) {
      console.error(`Airtable getRecords failed for ${tableName}:`, e.message);
      return [];
    }
  }
}
