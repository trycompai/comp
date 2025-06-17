import Browserbase from '@browserbasehq/sdk';

export const BROWSER_WIDTH = 1440;
export const BROWSER_HEIGHT = 900;
export const viewPort = {
  width: BROWSER_WIDTH,
  height: BROWSER_HEIGHT,
};

export async function createSession() {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
  });

  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID || '',
    browserSettings: {
      fingerprint: {
        screen: {
          maxHeight: viewPort.height,
          maxWidth: viewPort.width,
          minHeight: viewPort.height,
          minWidth: viewPort.width,
        },
      },
      viewport: viewPort,
    },
    keepAlive: true,
  });
  return session;
}

export async function closeBrowserSession(sessionId: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
  });
  await bb.sessions.update(sessionId, {
    projectId: process.env.BROWSERBASE_PROJECT_ID || '',
    status: 'REQUEST_RELEASE',
  });
}

export async function getSessionUrl(sessionId: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
  });
  const session = await bb.sessions.debug(sessionId);
  return session.debuggerFullscreenUrl;
}
