import { chromium } from "playwright";
const pdfPath = process.argv[2];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1000, height: 1300 } });
const page = await context.newPage();
const fileUrl = "file:///" + pdfPath.split("\\").join("/");
await page.goto(fileUrl, { waitUntil: "load", timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);

const before = await page.locator("#pageNumber").inputValue().catch(() => "?");
console.log("page before:", before);

// Scroll to page 2 (intro+TOC) and click the "Mode 1 — Graphique et analyse" row (page 5).
await page.locator("#pageNumber").fill("2");
await page.locator("#pageNumber").press("Enter");
await page.waitForTimeout(800);

// Find the text span on the rendered page and click it (pdf.js renders a
// transparent text layer plus the link annotation layer on top of the canvas).
const target = page.getByText("Mode 1 — Graphique et analyse", { exact: false }).first();
await target.scrollIntoViewIfNeeded().catch(() => {});
await target.click({ timeout: 5000 }).catch((e) => console.log("click failed:", e.message));
await page.waitForTimeout(800);

const after = await page.locator("#pageNumber").inputValue().catch(() => "?");
console.log("page after click:", after);
await browser.close();
