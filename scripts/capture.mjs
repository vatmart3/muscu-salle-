import { chromium } from '@playwright/test';
const url = process.argv[2], out = process.argv[3], w = +(process.argv[4]||390), h = +(process.argv[5]||844);
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.screenshot({ path: out, fullPage: true });
await b.close();
