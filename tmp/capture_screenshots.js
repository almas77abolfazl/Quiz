const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, 'review-screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 }
];

const routes = ['/login', '/'];

async function main() {
  let executablePath;
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  console.log('Using browser executable:', executablePath);
  const browser = await chromium.launch({ executablePath, headless: true });

  const screenshotsTaken = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[Console Error on ${page.url()}]: ${msg.text()}`);
      }
    });

    for (const route of routes) {
      const url = `http://localhost:4200${route}`;
      console.log(`Navigating to ${url} (${vp.name} ${vp.width}x${vp.height})...`);

      if (route === '/') {
        // Set auth token for home route
        await page.goto('http://localhost:4200/login', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.setItem('quiz_access_token', 'demo_access_token_123'));
      } else if (route === '/login') {
        // Clear auth token for login route
        await page.goto('http://localhost:4200/login', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.removeItem('quiz_access_token'));
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      const cleanRoute = route.replace(/\//g, '_').replace(/^_/, '') || 'home';
      const filename = `${cleanRoute}_${vp.name}_${vp.width}x${vp.height}.png`;
      const filepath = path.join(outputDir, filename);

      await page.screenshot({ path: filepath, fullPage: false });
      screenshotsTaken.push(filepath);
      console.log(`Captured: ${filepath}`);
    }

    await context.close();
  }

  await browser.close();

  console.log('\nAll screenshots captured successfully:');
  screenshotsTaken.forEach(s => console.log(s));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

