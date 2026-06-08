import { browser } from 'wxt/browser';

export async function sendRuntimeMessage(message: unknown): Promise<unknown> {
  try {
    return await browser.runtime.sendMessage(message);
  } catch (error) {
    if (isInvalidatedContextError(error)) return null;
    throw error;
  }
}

export function isInvalidatedContextError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes('extension context invalidated');
}
