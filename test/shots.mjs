// Screenshot loop: open the running game in a real headless browser and save
// a picture of the menu and a picture of gameplay into shots/. This is the
// "eyes" loop. Future sessions can build a change, run this, and look.
//
// Prereq: a local server at http://localhost:8000 (python3 -m http.server 8000).
// Run with: npm run shots

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, '..', 'shots');
const URL = process.env.ZENITH_URL || 'http://localhost:8000/index.html';

mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  // SwiftShader gives us software WebGL so the Three.js scene renders headless.
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('#menu', { state: 'visible', timeout: 10000 });
await page.waitForTimeout(1200); // let the menu wheel settle
await page.screenshot({ path: join(SHOTS, 'menu.png') });
console.log('  ok   saved shots/menu.png (the start menu)');

// Drive into gameplay: start sign 0 (Aries), level 1, then begin play.
await page.evaluate(() => { startLevel(0, 0); });
await page.waitForTimeout(600);
await page.evaluate(() => { beginPlay(); });
await page.waitForTimeout(2000); // let the arena build and render a few frames
await page.screenshot({ path: join(SHOTS, 'gameplay.png') });
console.log('  ok   saved shots/gameplay.png (a normal level in play)');

await browser.close();

if (errors.length) {
  console.error('\n  page errors during capture:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}
console.log('\nScreenshots captured with no page errors.\n');
