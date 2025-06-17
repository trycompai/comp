'server only';

import { sleep } from '@/lib/utils';
import type { Page } from 'playwright-core';
import { viewPort } from './session';

export async function scrollDownPage(page: Page, amount?: number) {
  if (amount !== undefined) {
    if (amount > 0) {
      await page.evaluate((amt: number) => {
        // Simple approach without explicit window typing
        window.scrollBy(0, amt);
      }, amount);
      return `Scrolled down ${amount}px.`;
    }
    // Negative amount - scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    return 'Scrolled to bottom of page.';
  }
  // No amount specified - use PageDown (original behavior)
  await page.keyboard.press('PageDown');
  return 'Scrolled down one page.';
}

/**
 * 6) Go to some URL
 */
export async function goToUrlPage(page: Page, url: string) {
  const urlToGoTo = url.startsWith('http') ? url : `https://${url}`;
  await page.goto(urlToGoTo, {
    waitUntil: 'commit',
    timeout: 25000,
  });
  return `Navigated to ${urlToGoTo}`;
}

/**
 * 7) Example: "search on google"
 */
export async function searchGooglePage(page: Page, query: string) {
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  await page.goto(googleUrl);
  return `Searched Google for "${query}".`;
}

export async function takeScreenshot(page: Page) {
  const screenshot = await page.screenshot({
    type: 'jpeg',
    quality: 80,
  });
  return {
    screenshot: {
      type: 'image',
      data: screenshot.toString('base64'),
      mimeType: 'image/jpeg',
    },
  };
}

export async function handleKeyboardAction(page: Page, action: 'key' | 'type', text?: string) {
  if (!text) throw new Error('Text required for keyboard actions');

  switch (action) {
    case 'key':
      await page.keyboard.press(text);
      break;
    case 'type': {
      // Implement typing with delay
      const TYPING_DELAY = 12;
      await page.keyboard.type(text, { delay: TYPING_DELAY });
      break;
    }
  }
}

async function paintDot(page: Page, x: number, y: number) {
  await page.evaluate(
    ({ x, y }) => {
      const dot = document.createElement('div');
      dot.id = 'ai-dot';
      dot.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background-color: red;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 999999;
        left: ${x}px;
        top: ${y}px;
      `;
      document.body.appendChild(dot);
    },
    { x, y },
  );
}

/**
 * Clicks the specified coordinates on a Playwright page
 */
export async function clickTargetOnPage(
  page: Page,
  coordinates: { x: number; y: number },
  paint = true,
  useDot = false,
) {
  // Convert relative coordinates to absolute pixels
  const x = Math.round(coordinates.x * viewPort.width);
  const y = Math.round(coordinates.y * viewPort.height);

  if (paint) {
    if (useDot) {
      await paintDot(page, x, y);
    } else {
      // Add and position cursor first
      await page.evaluate(() => {
        const cursor = document.createElement('div');
        cursor.id = 'ai-cursor';
        cursor.style.cssText = `
          position: fixed;
          width: 20px;
          height: 20px;
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="white" stroke="black" stroke-width="1" d="M1,1 L11,11 L7,11 L9,15 L7,16 L5,12 L1,16 Z"/></svg>');
          background-repeat: no-repeat;
          pointer-events: none;
          z-index: 999999;
        `;
        document.body.appendChild(cursor);
      });

      await page.evaluate(
        ({ x, y }) => {
          const cursor = document.getElementById('ai-cursor');
          if (cursor) {
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
          }
        },
        { x, y },
      );
    }
    await sleep(500);
  }

  // Move and click after painting
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  return `Clicked at coordinates: ${x}, ${y}`;
}

/**
 * Opens a new tab and returns its page object
 */
export async function openNewTab(page: Page) {
  const context = page.context();
  const newPage = await context.newPage();
  return {
    message: 'Opened new tab',
    newPage,
  };
}

/**
 * Switches to a specific tab by index (0-based)
 */
export async function switchToTab(page: Page, index: number) {
  const context = page.context();
  const pages = context.pages();

  if (index < 0 || index >= pages.length) {
    throw new Error(`Tab index ${index} is out of bounds (0-${pages.length - 1})`);
  }

  const targetPage = pages[index];
  await targetPage.bringToFront();
  return {
    message: `Switched to tab ${index}`,
    page: targetPage,
  };
}

/**
 * Navigates back in browser history
 */
export async function goBack(page: Page) {
  await page.goBack();
  return 'Navigated back';
}

/**
 * Navigates forward in browser history
 */
export async function goForward(page: Page) {
  await page.goForward();
  return 'Navigated forward';
}
