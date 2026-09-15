const { chromium } = require('playwright-core');
const executablePath = 'C:\\Users\\Abolfazl\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  console.log('Navigating to /login...');
  await page.goto('http://localhost:4200/login');
  await page.waitForTimeout(2000);

  console.log('URL:', page.url());
  const content = await page.content();
  console.log('HTML snippet:', content.substring(0, 500));

  await browser.close();
})();

