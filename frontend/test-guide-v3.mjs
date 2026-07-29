import { chromium } from "playwright";
import fs from "node:fs";

const outDir = "C:\\Users\\albre\\AppData\\Local\\Temp\\claude\\c--Users-albre-Documents-Dev-Stage-Yonsei-Lab-Internship\\324427a3-3b60-4192-855c-93e3aac89e70\\scratchpad\\downloads";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1000, height: 8000 } });
const page = await context.newPage();

const logs = [];
page.on("console", (msg) => { if (msg.type() !== "debug") logs.push(`[${msg.type()}] ${msg.text()}`); });
page.on("pageerror", (err) => logs.push("[pageerror] " + String(err)));

await page.addInitScript(() => localStorage.setItem("locale", "fr"));
await page.goto("http://localhost:5195/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

await page.evaluate(() => {
  const el = document.querySelector('[aria-hidden="true"].fixed');
  if (el) { el.style.left = "0px"; el.style.zIndex = "99999"; }
});
await page.waitForTimeout(800);

const info = await page.evaluate(() => Array.from(document.querySelectorAll(".guide-page")).map(p => ({ box: Math.round(p.getBoundingClientRect().height), scroll: p.scrollHeight })));
console.log("pages:", JSON.stringify(info));

const pageCount = info.length;
for (let i = 0; i < pageCount; i++) {
  const el = page.locator(".guide-page").nth(i);
  await el.screenshot({ path: `${outDir}/v3-live-page${i + 1}.png` });
}

await page.evaluate(() => {
  const el = document.querySelector('[aria-hidden="true"].fixed');
  if (el) { el.style.left = "-9999px"; }
});

const button = page.getByRole("button", { name: /manuel utilisateur/i });
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 30000 }),
  button.click(),
]);
const savePath = `${outDir}/${download.suggestedFilename()}`;
await download.saveAs(savePath);
console.log("PDF saved:", savePath, fs.statSync(savePath).size, "bytes");
console.log("Console:", JSON.stringify(logs, null, 2));
await browser.close();
