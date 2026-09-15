const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const executablePath = 'C:\\Users\\Abolfazl\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';

const outputDir = path.join(__dirname, 'review-screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

const routes = [
  { path: '/login', protected: false },
  { path: '/', protected: true },
  { path: '/quiz', protected: true },
  { path: '/quiz/play', protected: true },
  { path: '/quiz/result', protected: true },
  { path: '/1v1', protected: true },
  { path: '/profile', protected: true }
];

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const results = [];
  const screenshots = [];

  for (const vp of viewports) {
    for (const r of routes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1
      });

      if (r.protected) {
        await context.addInitScript(() => {
          localStorage.setItem('quiz_access_token', 'demo_access_token_123');
        });
      }

      const page = await context.newPage();

      const routeResult = {
        viewport: `${vp.name} (${vp.width}x${vp.height})`,
        route: r.path,
        finalUrl: null,
        status: null,
        consoleErrors: [],
        pageErrors: [],
        failedRequests: []
      };

      page.on('console', msg => {
        if (msg.type() === 'error') {
          routeResult.consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        routeResult.pageErrors.push(err.toString());
      });

      page.on('requestfailed', req => {
        routeResult.failedRequests.push(`${req.url()} - ${req.failure()?.errorText || 'failed'}`);
      });

      const targetUrl = `http://localhost:4200${r.path}`;
      try {
        const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        routeResult.status = response ? response.status() : 'No response';
        await page.waitForTimeout(1000);
        routeResult.finalUrl = page.url();

        const cleanRoute = r.path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '') || 'home';
        const fileName = `${cleanRoute}_${vp.name}_${vp.width}x${vp.height}.png`;
        const filePath = path.join(outputDir, fileName);

        await page.screenshot({ path: filePath, fullPage: false });
        screenshots.push(filePath);
        routeResult.screenshot = filePath;
      } catch (e) {
        routeResult.error = e.toString();
      }

      results.push(routeResult);
      await context.close();
    }
  }

  await browser.close();

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));

  console.log('\nCaptured Screenshots:');
  for (const s of screenshots) {
    console.log(`- ${s}`);
  }
})();

