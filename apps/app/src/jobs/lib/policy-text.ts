import { BUCKET_NAME, s3Client } from '@/app/s3';
import type { Policy } from '@db';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@trigger.dev/sdk';
import type { JSONContent } from '@tiptap/react';
import type { Readable } from 'stream';

export type PolicyTextSource = 'tiptap' | 'pdf';

export type PolicyTextResult = {
  text: string;
  source: PolicyTextSource;
};

export type PolicyForText = Pick<Policy, 'id' | 'name' | 'content' | 'displayFormat' | 'pdfUrl'>;

export async function getPolicyText(policy: PolicyForText): Promise<PolicyTextResult> {
  if (policy.displayFormat === 'PDF' && policy.pdfUrl) {
    const text = await getPdfPolicyText(policy.pdfUrl, policy.id);
    return { text, source: 'pdf' };
  }

  const text = tiptapContentToPlainText(policy.content as JSONContent[] | JSONContent | null);
  return { text, source: 'tiptap' };
}

async function getPdfPolicyText(pdfKey: string, policyId: string): Promise<string> {
  if (!s3Client || !BUCKET_NAME) {
    logger.warn('S3 not configured; returning empty PDF text', { policyId });
    return '';
  }

  try {
    ensurePdfDomPolyfills();
    const { pdf: pdfParse } = await import('pdf-parse');
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse export did not include a `pdf` function');
    }
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: pdfKey,
    });
    const response = await s3Client.send(command);
    const buffer = await bodyToBuffer(response.Body);
    if (!buffer) return '';
    const parsed = await pdfParse(buffer);
    return normalizeWhitespace(parsed.text);
  } catch (error) {
    logger.error('Failed to extract PDF policy text', {
      policyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return '';
  }
}

function tiptapContentToPlainText(content: JSONContent[] | JSONContent | null | undefined): string {
  if (!content) return '';
  if (Array.isArray(content)) {
    return normalizeWhitespace(content.map(nodeToText).join('\n'));
  }
  return normalizeWhitespace(nodeToText(content));
}

function nodeToText(node: JSONContent | null | undefined): string {
  if (!node) return '';

  if (node.type === 'text') {
    return node.text ?? '';
  }

  if (Array.isArray(node.content) && node.content.length > 0) {
    const children = node.content.map(nodeToText);

    switch (node.type) {
      case 'heading':
        return `\n${children.join(' ')}\n`;
      case 'paragraph':
        return `${children.join(' ')}`;
      case 'bulletList':
        return children
          .map((child) =>
            child
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => `- ${line}`)
              .join('\n'),
          )
          .filter(Boolean)
          .join('\n');
      case 'orderedList':
        return children
          .map((child, idx) =>
            child
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => `${idx + 1}. ${line}`)
              .join('\n'),
          )
          .filter(Boolean)
          .join('\n');
      default:
        return children.join('\n');
    }
  }

  if (typeof node.text === 'string') {
    return node.text;
  }

  return '';
}

async function bodyToBuffer(body: unknown): Promise<Buffer | null> {
  if (!body) return null;

  const asReadable = body as Readable;
  if (typeof (asReadable as any).read === 'function') {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      asReadable.on('data', (chunk: Buffer | Uint8Array | string) => {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk));
        } else if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else {
          chunks.push(Buffer.from(chunk));
        }
      });
      asReadable.on('end', () => resolve(Buffer.concat(chunks)));
      asReadable.on('error', reject);
    });
  }

  if (typeof (body as any).transformToByteArray === 'function') {
    const array = await (body as any).transformToByteArray();
    return Buffer.from(array);
  }

  return null;
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ensurePdfDomPolyfills() {
  const globalAny = globalThis as Record<string, any>;

  if (typeof globalAny.DOMMatrix === 'undefined') {
    globalAny.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;

      constructor(init?: number[] | string) {
        if (Array.isArray(init)) {
          const [a, b, c, d, e, f] = init;
          if (typeof a === 'number') this.a = a;
          if (typeof b === 'number') this.b = b;
          if (typeof c === 'number') this.c = c;
          if (typeof d === 'number') this.d = d;
          if (typeof e === 'number') this.e = e;
          if (typeof f === 'number') this.f = f;
        }
      }

      multiplySelf() {
        return this;
      }

      preMultiplySelf() {
        return this;
      }

      translateSelf(x = 0, y = 0) {
        this.e += x;
        this.f += y;
        return this;
      }

      scaleSelf(scaleX = 1, scaleY = scaleX) {
        this.a *= scaleX;
        this.d *= scaleY;
        return this;
      }

      rotateSelf() {
        return this;
      }

      skewXSelf() {
        return this;
      }

      skewYSelf() {
        return this;
      }

      toFloat64Array() {
        return new Float64Array([
          this.a,
          this.b,
          0,
          0,
          this.c,
          this.d,
          0,
          0,
          0,
          0,
          1,
          0,
          this.e,
          this.f,
          0,
          1,
        ]);
      }

      toFloat32Array() {
        return new Float32Array(this.toFloat64Array());
      }
    };
  }

  if (typeof globalAny.Path2D === 'undefined') {
    globalAny.Path2D = class Path2D {
      addPath() {}
    };
  }

  if (typeof globalAny.ImageData === 'undefined') {
    globalAny.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;

      constructor(width: number | Uint8ClampedArray, height?: number) {
        if (typeof width === 'number') {
          this.width = width;
          this.height = height ?? 0;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        } else {
          this.data = width;
          this.width = height ?? 0;
          this.height = Math.floor(this.data.length / 4 / (this.width || 1));
        }
      }
    };
  }
}
