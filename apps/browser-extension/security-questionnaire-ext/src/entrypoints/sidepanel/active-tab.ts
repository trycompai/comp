import { browser } from 'wxt/browser';

export async function getActiveTab(): Promise<Browser.tabs.Tab> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab found.');
  return tab;
}

export function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'current page';
  }
}
