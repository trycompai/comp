'server only';
import { type Browser, type Page, chromium } from 'playwright-core';

interface BrowserSession {
  browser: Browser;
  page: Page;
}

const sessions = new Map<string, BrowserSession>();

async function getBrowser(sessionId: string) {
  const wsUrl = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
  const browser = await chromium.connectOverCDP(wsUrl);
  const context = browser.contexts()[0];
  const page = context?.pages()[0];
  if (!page) {
    throw new Error('No page to use, error configuring browser session');
  }
  return { browser, page };
}

export async function getOrCreateBrowser(sessionId: string): Promise<BrowserSession> {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const browser = await getBrowser(sessionId);
  sessions.set(sessionId, browser);
  return browser;
}
