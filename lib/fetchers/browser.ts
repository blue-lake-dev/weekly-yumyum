import puppeteer, { Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * Launch browser with appropriate config for the environment:
 * - Vercel/Lambda: Use @sparticuz/chromium (Linux binary)
 * - Local dev: Use system Chrome/Chromium
 */
export async function launchBrowser(): Promise<Browser> {
  const isVercel = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isVercel) {
    // Production: Use @sparticuz/chromium for serverless
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // Local dev: Use system Chrome
    const executablePath = getLocalChromePath();
    return puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
      headless: true,
    });
  }
}

function getLocalChromePath(): string {
  switch (process.platform) {
    case "darwin":
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    case "win32":
      return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    default:
      return "/usr/bin/google-chrome";
  }
}
