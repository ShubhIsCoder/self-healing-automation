const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

// Initialize Gemini client. Assumes GEMINI_API_KEY is in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const CACHE_FILE = path.join(process.cwd(), 'healed_selectors.json');

async function getCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

async function getCachedHealedSelector(intent, failedSelector) {
  const cache = await getCache();
  return cache[`${intent}|${failedSelector}`] || null;
}

async function saveHealedSelector(intent, failedSelector, healedSelector) {
  const cache = await getCache();
  cache[`${intent}|${failedSelector}`] = healedSelector;
  await saveCache(cache);
}

/**
 * Heals a failed selector by finding the best alternative element based on intent.
 * 
 * @param {string} intent - The user's intended action (e.g., 'Complete Purchase').
 * @param {string} failedSelector - The CSS selector that failed to find an element.
 * @param {string[]} pageDOM - An array of HTML strings representing clickable elements on the page.
 * @returns {Promise<string|null>} - The HTML string of the best matching element, or null if none found.
 */
async function healSelector(intent, failedSelector, pageDOM) {
  if (!pageDOM || pageDOM.length === 0) {
    return null;
  }

  // We no longer check the HTML cache here since we cache the derived CSS selector instead.
  // The Recorder checks the CSS selector cache before even needing to heal.

  const systemPrompt = `You are an expert web scraping and automation assistant.
Your task is to heal a broken CSS selector by identifying the correct target element from a list of available clickable elements.

You will be given:
1. The user's intent (what they are trying to achieve).
2. The CSS selector that failed.
3. A list of available clickable elements (as HTML strings).

Instructions:
- Analyze the user's intent.
- Review the available elements.
- Select the element that best matches the intent.
- EXPLICITLY REJECT elements that contradict the intent (e.g., if intent is 'Save', reject 'Cancel' or 'Delete' buttons).
- Return ONLY the exact HTML string of the selected element from the provided list. Do not add any conversational text, markdown formatting, or explanations.
- If no element matches the intent, return the string "null".`;

  const userPrompt = `Intent: ${intent}
Failed Selector: ${failedSelector}

Available Elements:
${pageDOM.map((el, i) => `[Element ${i}]: ${el}`).join('\n')}

Select the best matching element based on the intent.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0,
      }
    });

    const result = (response.text || '').trim();
    
    if (result === 'null' || result === 'None' || !result) {
      return null;
    }

    // Verify the result is actually in the original array to prevent hallucinations
    const matchedElement = pageDOM.find(el => el.trim() === result || result.includes(el.trim()));
    
    return matchedElement || result;
  } catch (error) {
    console.error('Error in healSelector:', error);
    throw error;
  }
}

module.exports = {
  healSelector,
  getCachedHealedSelector,
  saveHealedSelector
};
