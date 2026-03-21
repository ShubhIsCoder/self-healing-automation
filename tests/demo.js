const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const Recorder = require('../src/recorder');
const { healSelector } = require('../src/discovery');

const DUMMY_HTML_PATH = path.join(__dirname, 'dummy.html');
const FILE_URL = 'file://' + DUMMY_HTML_PATH;

async function run() {
  console.log('--- Setting up initial UI ---');
  fs.writeFileSync(DUMMY_HTML_PATH, `
<!DOCTYPE html>
<html>
<body>
  <form id="myform">
    <input type="text" name="data" value="initial data">
    <button type="button" id="submit-btn">Submit</button>
  </form>
</body>
</html>`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL);

  const intent = 'Submit the form';
  const originalSelector = '#submit-btn';

  console.log('--- Executing Initial Action ---');
  console.log(`Intent: "${intent}" using selector: "${originalSelector}"`);
  await Recorder.click(page, originalSelector, intent);
  console.log('Successfully clicked the original element.\n');

  console.log('--- Simulating UI Update (Intent-Breaking Change) ---');
  fs.writeFileSync(DUMMY_HTML_PATH, `
<!DOCTYPE html>
<html>
<body>
  <form id="myform">
    <input type="text" name="data" value="updated data">
    <button type="button" id="confirm-btn">Confirm</button>
    <button type="button" id="submit-btn">Cancel</button>
  </form>
</body>
</html>`);
  console.log('HTML mutated: Changed original button ID to #confirm-btn ("Confirm") and added a decoy #submit-btn ("Cancel").\n');

  await page.reload();

  console.log('--- Attempting Action After UI Update ---');
  try {
    // We expect the original selector to still exist but point to the wrong element ("Cancel").
    // We simulate a smart agent detecting this mismatch before clicking.
    const textContent = await page.locator(originalSelector).textContent();
    console.log(`Checking text content of selector "${originalSelector}"... Found: "${textContent.trim()}"`);
    
    if (textContent.trim() !== 'Submit' && textContent.trim() !== 'Confirm') {
        throw new Error(`Intent mismatch: Selector "${originalSelector}" points to "${textContent.trim()}" instead of the expected intent "${intent}".`);
    }
    
    // If it didn't throw (unlikely here), perform the normal click
    await Recorder.click(page, originalSelector, intent);
  } catch (error) {
    console.log('\\n[ERROR] Action failed:', error.message);
    console.log('\\n--- Initiating Intent-Preservation Healing Engine ---');

    // Extract clickable elements to feed the Healing Engine
    const clickableElements = await page.$$eval('button, a, input[type="button"], input[type="submit"]', 
        els => els.map(el => el.outerHTML)
    );

    console.log('Available clickable elements found on page:');
    clickableElements.forEach((el, idx) => console.log(`  [${idx}]: ${el}`));
    
    console.log(`\\nHealing selector for intent: "${intent}"...`);
    const healedElementHtml = await healSelector(intent, originalSelector, clickableElements);
    
    if (healedElementHtml) {
        console.log('\\n[SUCCESS] Healing Engine found matching element:');
        console.log(healedElementHtml);
        
        // Convert the HTML back to a workable selector. 
        // For demonstration, we'll evaluate the DOM to find it.
        const newSelectorId = await page.evaluate((htmlSnippet) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlSnippet;
            const element = tempDiv.firstElementChild;
            return element.id ? '#' + element.id : null;
        }, healedElementHtml);

        if (newSelectorId) {
            console.log(`\\nGenerated new selector: "${newSelectorId}"`);
            console.log(`Executing click on healed selector...`);
            await Recorder.click(page, newSelectorId, intent);
            console.log('[SUCCESS] Successfully completed the action on the correct (healed) element!');
        } else {
             console.log('[FAILURE] Could not derive a valid selector from the healed element HTML.');
        }
    } else {
        console.log('[FAILURE] Healing Engine failed to find a suitable element matching the intent.');
    }
  }

  await browser.close();
  // Cleanup
  if (fs.existsSync(DUMMY_HTML_PATH)) {
      fs.unlinkSync(DUMMY_HTML_PATH);
  }
}

run().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});
