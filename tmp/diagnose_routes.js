const { chromium } = require('playwright-core');

const executablePath = 'C:\\Users\\Abolfazl\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';

const routes = [
  '/login',
  '/',
  '/quiz',
  '/quiz/play',
  '/quiz/result',
  '/1v1',
  '/profile'
];

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const report = {};

  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const routeData = {
      initialRoute: route,
      finalUrl: null,
      status: null,
      consoleErrors: [],
      consoleWarnings: [],
      consoleLogs: [],
      pageErrors: [],
      failedRequests: []
    };

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') routeData.consoleErrors.push(text);
      else if (type === 'warning') routeData.consoleWarnings.push(text);
      else routeData.consoleLogs.push(text);
    });

    page.on('pageerror', err => {
      routeData.pageErrors.push(err.toString());
    });

    page.on('requestfailed', req => {
      routeData.failedRequests.push(`${req.url()} - ${req.failure()?.errorText || 'failed'}`);
    });

    const url = `http://localhost:4200${route}`;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      routeData.status = response ? response.status() : 'No response';
      await page.waitForTimeout(1500);
      routeData.finalUrl = page.url();
    } catch (e) {
      routeData.error = e.toString();
    }

    report[route] = routeData;
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})();
