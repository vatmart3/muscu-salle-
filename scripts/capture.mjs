/**
 * Capture d'écran de contrôle.
 * Usage : node scripts/capture.mjs <url> <sortie.png> [largeur] [hauteur] [--pleine]
 */
import { chromium } from "@playwright/test";

const [url, sortie, largeur = "390", hauteur = "844", ...options] = process.argv.slice(2);
const pleine = options.includes("--pleine");

const navigateur = await chromium.launch({
  executablePath: process.env.CHROME_BIN || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await navigateur.newPage({
  viewport: { width: Number(largeur), height: Number(hauteur) },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({ path: sortie, fullPage: pleine });
await navigateur.close();
