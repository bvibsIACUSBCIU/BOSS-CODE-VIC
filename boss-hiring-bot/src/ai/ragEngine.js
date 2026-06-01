import fs from 'node:fs';
import path from 'node:path';
import { getEmbedding, callGemini } from './geminiClient.js';
import { CONFIG } from '../config.js';

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), 'knowledge-base');
const CACHE_FILE_PATH = path.join(KNOWLEDGE_BASE_DIR, '.embeddings_cache.json');

// In-memory vector store
// Array of { text: string, source: string, embedding: number[] }
export let vectorIndex = [];
let cacheData = {};

/**
 * Initialize the RAG Engine
 * Scans knowledge-base directory, chunks files, embeds them (with cache support), and builds index.
 */
export async function initRag() {
  console.log('[RAG Engine] Initializing RAG context...');
  
  // Ensure the directory exists
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_BASE_DIR, { recursive: true });
  }

  // Load cache if exists
  if (fs.existsSync(CACHE_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      const json = JSON.parse(raw);
      cacheData = json.cache || {};
      console.log(`[RAG Engine] Loaded ${Object.keys(cacheData).length} cached embeddings.`);
    } catch (e) {
      console.warn('[RAG Engine] Failed to load embeddings cache:', e.message);
      cacheData = {};
    }
  }

  // Scan files in knowledge-base
  const files = fs.readdirSync(KNOWLEDGE_BASE_DIR);
  const newIndex = [];

  for (const file of files) {
    if (file.startsWith('.') || file === 'README.md') continue;
    const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    console.log(`[RAG Engine] Processing knowledge file: ${file}`);
    const content = fs.readFileSync(filePath, 'utf8');
    let chunks = [];

    if (file.endsWith('.md')) {
      chunks = chunkMarkdown(content, file);
    } else if (file.endsWith('.csv')) {
      chunks = chunkCSV(content, file);
    } else if (file.endsWith('.txt')) {
      chunks = chunkTXT(content, file);
    }

    // Embed chunks
    for (const chunk of chunks) {
      try {
        let embedding = cacheData[chunk.text];
        if (!embedding) {
          // Fetch embedding from Gemini
          embedding = await getEmbedding(chunk.text);
          cacheData[chunk.text] = embedding;
        }
        newIndex.push({
          text: chunk.text,
          source: chunk.source,
          embedding,
        });
      } catch (err) {
        console.error(`[RAG Engine] Error embedding chunk from ${file}:`, err.message);
      }
    }
  }

  vectorIndex = newIndex;
  console.log(`[RAG Engine] Index built successfully. Total chunks: ${vectorIndex.length}`);

  // Persist updated cache
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({ version: 1, cache: cacheData }, null, 2), 'utf8');
  } catch (e) {
    console.error('[RAG Engine] Failed to write embeddings cache:', e.message);
  }
}

/**
 * Add a new knowledge file dynamically (saves to disk and rebuilds index)
 * 
 * @param {string} filename 
 * @param {Buffer|string} content 
 */
export async function addKnowledgeFile(filename, content) {
  const sanitized = filename.replace(/[^a-zA-Z0-9.-_]/g, '_');
  const timestamp = Date.now();
  const baseName = path.basename(sanitized, path.extname(sanitized));
  const ext = path.extname(sanitized) || '.txt';
  const saveName = `uploaded_${baseName}_${timestamp}${ext}`;
  const filePath = path.join(KNOWLEDGE_BASE_DIR, saveName);

  fs.writeFileSync(filePath, content);
  console.log(`[RAG Engine] Dynamic file saved: ${saveName}`);

  // Re-build index
  await initRag();
  return saveName;
}

/**
 * Perform Cosine Similarity Search
 * 
 * @param {string} query 
 * @param {number} topK 
 * @returns {Promise<Array<{ text: string, source: string, score: number }>>}
 */
export async function searchRag(query, topK = 4) {
  if (vectorIndex.length === 0) {
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(query);
    const results = vectorIndex.map(item => {
      const score = cosineSimilarity(queryEmbedding, item.embedding);
      return {
        text: item.text,
        source: item.source,
        score,
      };
    });

    // Sort descending by score
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  } catch (e) {
    console.error('[RAG Engine] Search error:', e.message);
    return [];
  }
}

/**
 * Checks if query contains high-risk/complex business keywords that should fallback to human.
 * 
 * @param {string} query 
 * @returns {boolean}
 */
export function isHighRiskQuery(query) {
  const q = query.toLowerCase();
  const keywords = [
    // Chinese
    "费用", "服务费", "离职补人", "保证期", "退款", "签署合同", "隐私数据泄露", "隐私泄露", "合同", "返款", "收费", "抽成", "比例", "隐私", "泄露",
    // English
    "fee", "fees", "service fee", "pricing", "refund", "refunds", "guarantee period", "replacement", "contract", "contracts", "privacy leak", "privacy leakage", "sign contract", "commission", "charge",
    // Khmer
    "កម្រៃសេវា", "តម្លៃ", "លក្ខខណ្ឌសហការ", "ការធានា", "ប្តូរមនុស្ស", "កិច្ចសន្យា", "សុវត្ថិភាពទិន្នន័យ", "កុងត្រា", "លុយ"
  ];
  return keywords.some(keyword => q.includes(keyword));
}

/**
 * Answer customer question using retrieved RAG context and Gemini Flash
 * 
 * @param {string} query 
 * @param {string} lang - 'zh' | 'en' | 'km'
 * @returns {Promise<{ isHighRisk: boolean, answer: string }>}
 */
export async function answerQuestion(query, lang = 'zh') {
  // 1. Check high risk
  if (isHighRiskQuery(query)) {
    return { isHighRisk: true, answer: '' };
  }

  // 2. Search relevant chunks
  const chunks = await searchRag(query, 4);
  const context = chunks.map(c => `[来源: ${c.source}]\n${c.text}`).join('\n\n');

  // 3. Generate Gemini response
  const systemPrompt = `你是一位专业的 Boss Hiring 智能客服助手。请根据以下参考资料回答用户的问题。
回答必须严格遵循以下原则：
1. 只能根据参考资料提供的事实回答，不要捏造或推测任何事实。如果资料里没有提到，请诚实回答“参考资料中未提及该信息，您可以联系我们的人工顾问进一步咨询”。
2. 回答语气要专业、礼貌、简洁，并且非常适合在 Telegram 聊天框中阅读。
3. 请使用用户所用的语言回答。当前用户所用语言为: ${lang === 'km' ? '高棉语/Khmer' : lang === 'en' ? '英语/English' : '中文/Chinese'}。
4. 如果用户的问题涉及费用、保证期、退款、签署合同、隐私泄露等敏感业务规则，请在此回答中提示用户直接联系人工客服。

【参考资料】
${context || '没有找到相关的参考资料。'}

【用户问题】
${query}
`;

  try {
    const answer = await callGemini(CONFIG.gemini.models.flash, systemPrompt);
    return { isHighRisk: false, answer: answer.trim() };
  } catch (e) {
    console.error('[RAG Engine] Generation error:', e.message);
    throw e;
  }
}

// ─── Chunker Helpers ───────────────────────────────────────────────────────────

function chunkMarkdown(text, source) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let currentHeader = "";
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith("#")) {
      if (currentContent.length > 0 || currentHeader) {
        chunks.push({
          text: `${currentHeader}\n${currentContent.join("\n")}`.trim(),
          source,
        });
      }
      currentHeader = line;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0 || currentHeader) {
    chunks.push({
      text: `${currentHeader}\n${currentContent.join("\n")}`.trim(),
      source,
    });
  }
  return chunks;
}

function chunkCSV(text, source) {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  const chunks = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;
    
    // Filtering disabled FAQ rows
    const isFaq = headers.includes("是否启用") && headers.includes("用户问题");
    if (isFaq) {
      const enabledIdx = headers.indexOf("是否启用");
      const isEnabled = enabledIdx !== -1 
        ? (row[enabledIdx]?.trim().toUpperCase() === "TRUE" || row[enabledIdx]?.trim() === "是") 
        : true;
      if (!isEnabled) continue;
    }

    let chunkText = "";
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j] || `Col${j}`;
      const val = row[j] || "";
      if (val.trim()) {
        chunkText += `${header}: ${val.trim()}\n`;
      }
    }
    if (chunkText.trim()) {
      chunks.push({
        text: chunkText.trim(),
        source,
      });
    }
  }
  return chunks;
}

function chunkTXT(text, source) {
  const paragraphs = text.split(/\r?\n\r?\n/);
  const chunks = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed) {
      chunks.push({
        text: trimmed,
        source,
      });
    }
  }
  return chunks;
}

// ─── Math & Parsing Helpers ───────────────────────────────────────────────────

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}
