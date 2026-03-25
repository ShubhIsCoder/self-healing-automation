const fs = require('fs').promises;
const path = require('path');
const { getCachedHealedSelector } = require('../discovery');

const LOG_FILE = path.join(process.cwd(), 'intent_logs.json');

/**
 * Initializes the log file if it doesn't exist.
 */
async function initLogFile() {
  try {
    await fs.access(LOG_FILE);
  } catch (error) {
    await fs.writeFile(LOG_FILE, JSON.stringify([]));
  }
}

/**
 * Logs the intent and element metadata to a local JSON file.
 * 
 * @param {object} logEntry - The metadata to log.
 */
async function logIntent(logEntry) {
  await initLogFile();
  try {
    const data = await fs.readFile(LOG_FILE, 'utf8');
    const logs = JSON.parse(data);
    logs.push({
      timestamp: new Date().toISOString(),
      ...logEntry
    });
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Failed to write to intent log:', error);
  }
}

/**
 * Gets the XPath for a given element.
 * We evaluate a function in the browser context to generate the XPath.
 * 
 * @param {object} elementHandle - The Playwright ElementHandle.
 * @returns {Promise<string>} - The generated XPath.
 */
async function getXPath(elementHandle) {
  return await elementHandle.evaluate(el => {
    function getPath(node) {
      if (node.id !== '') {
        return 'id("' + node.id + '")';
      }
      if (node === document.body) {
        return node.tagName.toLowerCase();
      }
      let ix = 0;
      const siblings = node.parentNode.childNodes;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === node) {
          return getPath(node.parentNode) + '/' + node.tagName.toLowerCase() + '[' + (ix + 1) + ']';
        }
        if (sibling.nodeType === 1 && sibling.tagName === node.tagName) {
          ix++;
        }
      }
    }
    return getPath(el);
  });
}

/**
 * Recorder module wrapping Playwright page actions.
 */
class Recorder {
  /**
   * Wrapper for page.click()
   * 
   * @param {object} page - The Playwright Page object.
   * @param {string} selector - The selector to click.
   * @param {string} intent - The human-readable intent for this action.
   * @param {object} [options] - Optional Playwright click options.
   */
  static async click(page, selector, intent, options = {}) {
    let effectiveSelector = selector;
    const cachedHealedSelector = await getCachedHealedSelector(intent, selector);
    if (cachedHealedSelector) {
      console.log(`\\n[Recorder] Cache hit for intent "${intent}". Using healed selector: "${cachedHealedSelector}" instead of "${selector}"`);
      effectiveSelector = cachedHealedSelector;
    }

    const element = await page.locator(effectiveSelector).first();
    const elementHandle = await element.elementHandle();
    
    if (elementHandle) {
      const html = await elementHandle.evaluate(el => el.outerHTML);
      const boundingBox = await elementHandle.boundingBox();
      const xpath = await getXPath(elementHandle);
      
      await logIntent({
        action: 'click',
        intent,
        selector: effectiveSelector,
        originalSelector: selector,
        html,
        boundingBox,
        xpath
      });
    }

    await page.click(effectiveSelector, options);
  }

  /**
   * Wrapper for page.fill()
   * 
   * @param {object} page - The Playwright Page object.
   * @param {string} selector - The selector to fill.
   * @param {string} value - The value to fill.
   * @param {string} intent - The human-readable intent for this action.
   * @param {object} [options] - Optional Playwright fill options.
   */
  static async fill(page, selector, value, intent, options = {}) {
    let effectiveSelector = selector;
    const cachedHealedSelector = await getCachedHealedSelector(intent, selector);
    if (cachedHealedSelector) {
      console.log(`\\n[Recorder] Cache hit for intent "${intent}". Using healed selector: "${cachedHealedSelector}" instead of "${selector}"`);
      effectiveSelector = cachedHealedSelector;
    }

    const element = await page.locator(effectiveSelector).first();
    const elementHandle = await element.elementHandle();
    
    if (elementHandle) {
      const html = await elementHandle.evaluate(el => el.outerHTML);
      const boundingBox = await elementHandle.boundingBox();
      const xpath = await getXPath(elementHandle);
      
      await logIntent({
        action: 'fill',
        intent,
        selector: effectiveSelector,
        originalSelector: selector,
        value,
        html,
        boundingBox,
        xpath
      });
    }

    await page.fill(effectiveSelector, value, options);
  }
}

module.exports = Recorder;