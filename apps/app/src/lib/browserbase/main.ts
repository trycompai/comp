// 🤘 Welcome to Stagehand!
// This file is from the [Stagehand docs](https://docs.stagehand.dev/sections/examples/nextjs).

'use server';

import { Browserbase } from '@browserbasehq/sdk';
import { Stagehand } from '@browserbasehq/stagehand';
import { writeFileSync } from 'node:fs';
import { getGitHubCredentials } from './onepassword';

/**
 * Run the main Stagehand script
 */
async function main(stagehand: Stagehand) {
  const page = stagehand.page;

  // Get credentials from 1Password
  const { username, password } = await getGitHubCredentials();

  // In this example, we'll get the title of the Stagehand quickstart page
  await page.goto('https://github.com/login', { waitUntil: 'domcontentloaded' });
  console.log('Navigated to GitHub login page');

  // Login process
  await page.act({
    action: 'Type in the username: %username%',
    variables: {
      username: username,
    },
  });
  console.log('Typed in the username');

  await page.act({
    action: 'Type in the password: %password%',
    variables: {
      password: password,
    },
  });
  console.log('Typed in the password');

  await page.act('Click the sign in button');
  console.log('Clicked the sign in button');

  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');
  console.log('Page loaded');

  await page.goto('https://github.com/trycompai/comp/security/dependabot', {
    waitUntil: 'domcontentloaded',
  });
  console.log('Navigated to GitHub security page');

  const client = await stagehand.context.newCDPSession(page);

  // Capture the screenshot using CDP
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 80,
  });

  // Convert base64 to buffer and save
  const buffer = Buffer.from(data, 'base64');
  writeFileSync('screenshot.jpeg', buffer);
  console.log('Screenshot saved');

  await page.close();

  return 'success';
}

/**
 * Initialize and run the main() function
 */
export async function runStagehand(sessionId?: string) {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    verbose: 1,
    logger: console.log,
    browserbaseSessionID: sessionId,
    disablePino: true,
  });
  await stagehand.init();
  await main(stagehand);
  await stagehand.close();
}

/**
 * Start a Browserbase session
 */
export async function startBBSSession() {
  const browserbase = new Browserbase();
  const session = await browserbase.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  });
  const debugUrl = await browserbase.sessions.debug(session.id);
  return {
    sessionId: session.id,
    debugUrl: debugUrl.debuggerFullscreenUrl,
  };
}
