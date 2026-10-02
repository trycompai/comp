import type { NextConfig } from 'next';
import { NodeNextRequest, NodeNextResponse } from 'next/dist/server/base-http/node';
import loadConfig from 'next/dist/server/config';
import NextNodeServer from 'next/dist/server/next-server';
import { PHASE_DEVELOPMENT_SERVER } from 'next/dist/shared/lib/constants';
import { getImgProps } from 'next/dist/shared/lib/get-img-props';
import { imageConfigDefault } from 'next/dist/shared/lib/image-config';
import defaultLoader from 'next/dist/shared/lib/image-loader';
import { mkdtempSync, rmSync } from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../env.mjs', () => ({}));
vi.mock('../../../portal/src/env.mjs', () => ({}));
vi.mock('@sentry/nextjs', () => ({ withSentryConfig: (config: NextConfig) => config }));
vi.mock('botid/next/config', () => ({ withBotId: (config: NextConfig) => config }));

import portalConfig from '../../../portal/next.config';
import appConfig from '../../next.config';

// Keep the installed Next image request handler intact. Only build manifests
// and the rendered 404 page are replaced, so this needs no build or listener.
class ImageTestServer extends NextNodeServer {
  protected getBuildId() {
    return 'image-security-test';
  }

  protected getPagesManifest() {
    return {};
  }

  protected getAppPathsManifest() {
    return {};
  }

  protected getNextFontManifest() {
    return undefined;
  }

  protected getPrerenderManifest() {
    return {
      version: 4 as const,
      routes: {},
      dynamicRoutes: {},
      notFoundRoutes: [],
      preview: {
        previewModeId: '',
        previewModeSigningKey: '',
        previewModeEncryptionKey: '',
      },
    };
  }

  async render404(_request: NodeNextRequest, response: NodeNextResponse) {
    response.statusCode = 404;
    response.body('Not Found').send();
  }

  handleImage({
    request,
    response,
    url,
  }: {
    request: NodeNextRequest;
    response: NodeNextResponse;
    url: string;
  }) {
    return this.handleNextImageRequest(request, response, {
      pathname: '/_next/image',
      query: { url, w: '64', q: '75' },
      href: request.url,
      hash: null,
      hostname: null,
      protocol: null,
      search: null,
      slashes: null,
      port: null,
    });
  }
}

const projectDir = mkdtempSync(join(tmpdir(), 'comp-image-security-'));

afterEach(() => vi.unstubAllGlobals());
afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

describe.each([
  { name: 'app', config: appConfig },
  { name: 'portal', config: portalConfig },
])('$name image security', ({ config }) => {
  it.each([
    'https://attacker.execute-api.us-east-1.amazonaws.com/redirect',
    'https://attacker.s3.us-east-1.amazonaws.com/image.png',
    'https://img.logo.dev/example.com?token=public',
    'https://outside.example/image.png',
    'http://127.0.0.1/image.png',
    '/api/private-image',
  ])('rejects anonymous optimizer requests for %s without fetching', async (url) => {
    const fetchSpy = vi.fn(() => {
      throw new Error('Image optimizer must never fetch');
    });
    vi.stubGlobal('fetch', fetchSpy);
    const normalizedConfig = await loadConfig(PHASE_DEVELOPMENT_SERVER, projectDir, {
      customConfig: { images: config.images },
      silent: true,
    });
    const server = new ImageTestServer({ dir: projectDir, dev: true, conf: normalizedConfig });
    const request = new IncomingMessage(new Socket());
    request.method = 'GET';
    request.url = `/_next/image?url=${encodeURIComponent(url)}&w=64&q=75`;
    const response = new ServerResponse(request);

    expect(
      await server.handleImage({
        request: new NodeNextRequest(request),
        response: new NodeNextResponse(response),
        url,
      }),
    ).toBe(true);
    expect(response.statusCode).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    'https://avatars.githubusercontent.com/u/1?v=4',
    'https://lh3.googleusercontent.com/avatar',
    'https://custom.example/integration-logo.png',
    'https://uploads.s3.us-east-1.amazonaws.com/image.png?X-Amz-Signature=test',
  ])('preserves direct browser loading for %s', (src) => {
    const { props, meta } = getImgProps(
      { src, alt: 'Image', width: 40, height: 40 },
      {
        imgConf: { ...imageConfigDefault, ...config.images },
        defaultLoader,
      },
    );

    expect(meta.unoptimized).toBe(true);
    expect(props.src).toBe(src);
    expect(props.srcSet).toBeUndefined();
  });
});
