const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const extensionPath = path.resolve(__dirname, '../extension/dist');
  console.log("Loading extension from:", extensionPath);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--window-size=1280,800'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log("Navigating to example.com...");
  await page.goto('https://example.com', { waitUntil: 'networkidle0' });

  console.log("Waiting for extension to initialize...");
  await new Promise(r => setTimeout(r, 2000));

  console.log("Locating Service Worker...");
  const workerTarget = await browser.waitForTarget(
    target => target.type() === 'service_worker' && target.url().includes('extension')
  );
  const worker = await workerTarget.worker();

  console.log("Triggering fact-check via background worker...");
  await worker.evaluate(async () => {
    // Send a message to the active tab to simulate a fact-check result
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      
      // Simulate loading start
      chrome.tabs.sendMessage(tabId, { type: 'VERDICT_LOADING_START' });
      
      // After 1s, simulate result
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'VERDICT_RESULT',
          payload: {
            id: 'test-123',
            claim: 'The Great Wall of China is visible from space.',
            verdict: 'False',
            reasoning: 'It is a common myth. Low Earth orbit astronauts have confirmed it is generally not visible to the naked eye.',
            fact: 'The Great Wall is generally not visible to the naked eye from space.',
            source: 'NASA',
            sourceUrl: 'https://nasa.gov',
            sourceConfidence: 0.99,
            factDeviationScore: 1.0,
            factDeviationReasoning: 'Myth completely busted.'
          }
        });
      }, 1000);
    });
  });

  console.log("Waiting for animation...");
  await new Promise(r => setTimeout(r, 2000));

  const screenshotPath = path.resolve('/Users/sofian/.gemini/antigravity-ide/brain/1087c9ae-2134-41ea-8ea8-8c69d2998117/overlay-screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log("Saved overlay screenshot to:", screenshotPath);

  // Now let's try to screenshot the popup
  console.log("Opening popup HTML...");
  const popupPage = await browser.newPage();
  // Get extension ID from the worker target URL
  const extensionId = workerTarget.url().split('/')[2];
  await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`, { waitUntil: 'networkidle0' });
  
  const popupScreenshot = path.resolve('/Users/sofian/.gemini/antigravity-ide/brain/1087c9ae-2134-41ea-8ea8-8c69d2998117/popup-screenshot.png');
  await popupPage.screenshot({ path: popupScreenshot });
  console.log("Saved popup screenshot to:", popupScreenshot);

  await browser.close();
  console.log("Done.");
})();
