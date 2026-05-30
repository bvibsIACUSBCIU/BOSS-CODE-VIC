import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config.js';

let genAIInstance = null;

function getGenAI() {
  if (!genAIInstance) {
    if (!CONFIG.gemini.apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }
    genAIInstance = new GoogleGenerativeAI(CONFIG.gemini.apiKey);
  }
  return genAIInstance;
}

function resolveModelName(modelName) {
  if (!modelName) return 'gemini-3.5-flash';
  const cleanName = modelName.trim().toLowerCase();

  const standardModels = [
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];

  if (standardModels.includes(cleanName)) {
    return cleanName;
  }

  // Graceful fallbacks for hypothetical model names (e.g. gemini-3.1-flash)
  if (cleanName.includes('flash')) {
    console.warn(`[Gemini Client] Warning: Model "${modelName}" is not officially supported. Falling back to "gemini-3.5-flash".`);
    return 'gemini-3.5-flash';
  }

  console.warn(`[Gemini Client] Warning: Model "${modelName}" is not officially supported. Falling back to "gemini-3.1-pro-preview".`);
  return 'gemini-3.1-pro-preview';
}

/**
 * Call Gemini with text prompt and optionally file buffer (multimodal)
 * Returns the text response.
 * 
 * @param {string} modelName 
 * @param {string} prompt 
 * @param {Buffer} [fileBuffer] 
 * @param {string} [mimeType] 
 * @returns {Promise<string>}
 */
export async function callGemini(modelName, prompt, fileBuffer, mimeType) {
  const genAI = getGenAI();
  const resolvedModel = resolveModelName(modelName);
  const model = genAI.getGenerativeModel({ model: resolvedModel });

  const contents = [prompt];
  if (fileBuffer && mimeType) {
    contents.push({
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType,
      },
    });
  }

  const result = await model.generateContent(contents);
  return result.response.text();
}

/**
 * Call Gemini and expect a JSON object back.
 * 
 * @param {string} modelName 
 * @param {string} prompt 
 * @param {Buffer} [fileBuffer] 
 * @param {string} [mimeType] 
 * @returns {Promise<object>}
 */
export async function callGeminiJSON(modelName, prompt, fileBuffer, mimeType) {
  const genAI = getGenAI();
  const resolvedModel = resolveModelName(modelName);
  const model = genAI.getGenerativeModel({
    model: resolvedModel,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const contents = [prompt];
  if (fileBuffer && mimeType) {
    contents.push({
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType,
      },
    });
  }

  const result = await model.generateContent(contents);
  const responseText = result.response.text();

  try {
    return JSON.parse(responseText);
  } catch (error) {
    // Attempt fallback parsing if JSON formatting wasn't strictly adhered to
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        // Fall through
      }
    }
    throw new Error(`Gemini response is not valid JSON. Response received: ${responseText.slice(0, 300)}`);
  }
}
