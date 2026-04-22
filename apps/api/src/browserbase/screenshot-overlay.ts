// apps/api/src/browserbase/screenshot-overlay.ts
import sharp from 'sharp';

export const OVERLAY_HEIGHT_PX = 88;
const OVERLAY_BG = '#0A0A0A';
const OVERLAY_TEXT = '#FFFFFF';
const OVERLAY_MUTED = '#A1A1AA';
const MAX_INSTRUCTION_CHARS = 120;
const MAX_URL_CHARS = 140;

export interface RenderOverlayInput {
  buffer: Buffer;
  instruction: string;
  sourceUrl: string;
  capturedAt: Date;
}

export async function renderOverlay(input: RenderOverlayInput): Promise<Buffer> {
  const { buffer, instruction, sourceUrl, capturedAt } = input;

  const sourceMeta = await sharp(buffer).metadata();
  const width = sourceMeta.width;
  if (!width) {
    throw new Error('renderOverlay: source image has no width');
  }

  const instructionText = truncate(instruction, MAX_INSTRUCTION_CHARS);
  const sourceUrlText = truncate(sourceUrl, MAX_URL_CHARS);
  const timestampText = formatUtc(capturedAt);

  const bannerSvg = buildBannerSvg({
    width,
    height: OVERLAY_HEIGHT_PX,
    instruction: instructionText,
    sourceUrl: sourceUrlText,
    timestamp: timestampText,
  });

  const bannerBuffer = await sharp(Buffer.from(bannerSvg))
    .png()
    .toBuffer();

  const extended = await sharp(buffer)
    .extend({
      bottom: OVERLAY_HEIGHT_PX,
      background: OVERLAY_BG,
    })
    .composite([
      {
        input: bannerBuffer,
        top: sourceMeta.height ?? 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  return extended;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss} UTC`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface BannerArgs {
  width: number;
  height: number;
  instruction: string;
  sourceUrl: string;
  timestamp: string;
}

function buildBannerSvg(args: BannerArgs): string {
  const { width, height, instruction, sourceUrl, timestamp } = args;
  const padX = 16;
  const rowFontSize = 13;
  const labelFontSize = 11;
  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${OVERLAY_BG}"/>
  <g font-family='${fontFamily}' fill="${OVERLAY_TEXT}">
    <text x="${padX}" y="22" font-size="${rowFontSize}" font-weight="600">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}">AUDITOR REQUIREMENT  </tspan>
      <tspan>${escapeXml(instruction)}</tspan>
    </text>
    <text x="${padX}" y="48" font-size="${rowFontSize}">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}">CAPTURED  </tspan>
      <tspan>${escapeXml(timestamp)}</tspan>
    </text>
    <text x="${padX}" y="74" font-size="${rowFontSize}">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}">SOURCE  </tspan>
      <tspan>${escapeXml(sourceUrl)}</tspan>
    </text>
  </g>
</svg>`;
}
