import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const pageUrl = process.argv[2] ?? "http://localhost:5173/the-arcane-bazaar/";
const screenshotPath = resolve(process.argv[3] ?? ".docs/browser-snapshot.png");
const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const parsedUrl = new URL(pageUrl);

if (!allowedHosts.has(parsedUrl.hostname)) {
    throw new Error("This local browser accepts only localhost URLs.");
}

const executablePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((path): path is string => typeof path === "string" && existsSync(path));

if (executablePaths.length === 0) {
    throw new Error("Chrome or Edge was not found. Set PUPPETEER_EXECUTABLE_PATH.");
}

const browser = await puppeteer.launch({
    executablePath: executablePaths[0],
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
});

try {
    const page = await browser.newPage();
    const errors: string[] = [];

    page.on("pageerror", (error) => errors.push(error instanceof Error ? error.message : String(error)));
    page.on("console", (message) => {
        if (message.type() === "error") {
            errors.push(message.text());
        }
    });

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const response = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("h1", { visible: true, timeout: 30000 });
    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const summary = {
        url: page.url(),
        status: response?.status() ?? null,
        title: await page.title(),
        heading: await page.$$eval("h1", (elements) => elements.map((element) => element.textContent?.trim() ?? "")),
        screenshot: screenshotPath,
        errors,
    };

    console.log(JSON.stringify(summary, null, 4));
} finally {
    await browser.close();
}
