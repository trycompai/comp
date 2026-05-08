// apps/api/src/browserbase/screenshot-overlay.ts
import sharp from 'sharp';

export const OVERLAY_HEIGHT_PX = 88;
const OVERLAY_BG = '#0A0A0A';
const OVERLAY_SURFACE = '#111113';
const OVERLAY_BORDER = '#1F1F23';
const OVERLAY_TEXT = '#FAFAFA';
const OVERLAY_MUTED = '#8B8B92';
const OVERLAY_ACCENT = '#22C55E';
const BRAND_PILLAR_WIDTH = 168;
const MAX_INSTRUCTION_CHARS = 120;
const MAX_URL_CHARS = 140;

// Comp AI hex logo mark, viewBox 0 0 56 56. Fill is overridden at render time.
const COMP_LOGO_PATH =
  'M41 13.3327L39.3682 12.16L28.5853 4.41866C28.2368 4.16845 27.7675 4.16844 27.419 4.41863L2.41685 22.3661C2.15517 22.5539 2 22.8563 2 23.1784V32.8194C2 33.1415 2.15515 33.4439 2.41681 33.6317L27.4189 51.5813C27.7675 51.8315 28.2368 51.8315 28.5854 51.5812L53.5833 33.6317C53.8449 33.4439 54 33.1415 54 32.8194V23.1784C54 22.8563 53.8448 22.5539 53.5832 22.3661L41 13.3327ZM27.419 9.11825C27.7675 8.86804 28.2368 8.86802 28.5854 9.11822L34.9638 13.6969C35.5198 14.096 35.5195 14.9232 34.9633 15.322L31.9378 17.4913C31.7156 17.6504 31.4167 17.6502 31.1947 17.4908L28.5853 15.6178C28.2368 15.3676 27.7675 15.3676 27.419 15.6178L18.7338 21.8529C18.178 22.2519 18.178 23.0787 18.7339 23.4776L21.1661 25.2235L24.4382 27.5755L27.4188 29.7149C27.7674 29.9651 28.2368 29.965 28.5854 29.7146L37.2698 23.4751C37.8251 23.0761 37.8252 22.25 37.2699 21.8509L35.2116 20.3717C35.0294 20.2407 35.0296 19.9695 35.2121 19.8389L38.7873 17.2754C39.1358 17.0255 39.6049 17.0257 39.9532 17.2758L46.3287 21.8531C46.8844 22.252 46.8844 23.0786 46.3288 23.4777L43.3017 25.6513L28.5875 36.2167C28.239 36.467 27.7696 36.467 27.4211 36.2168L19.9104 30.8253L16.6382 28.4777L12.7026 25.6535L9.67725 23.48C9.12177 23.0809 9.12192 22.2544 9.67753 21.8555L27.419 9.11825Z';

export interface RenderOverlayInput {
  buffer: Buffer;
  instruction: string;
  sourceUrl: string;
  capturedAt: Date;
}

/**
 * Composite an audit metadata banner onto the bottom of a screenshot.
 * The banner adds OVERLAY_HEIGHT_PX to the total image height.
 * Failure-mode contract: throws on malformed input; callers should handle
 * and fall back to the raw image.
 */
export async function renderOverlay(input: RenderOverlayInput): Promise<Buffer> {
  const { buffer, instruction, sourceUrl, capturedAt } = input;

  const sourceMeta = await sharp(buffer).metadata();
  const width = sourceMeta.width;
  const height = sourceMeta.height;
  if (!width) {
    throw new Error('renderOverlay: source image has no width');
  }
  if (!height) {
    throw new Error('renderOverlay: source image has no height');
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
        top: height,
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
  // Strip XML 1.0 illegal control chars (keep tab 0x09, LF 0x0A, CR 0x0D)
  const stripped = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return stripped
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
  const rowFontSize = 12;
  const labelFontSize = 9;
  // Explicit Linux-safe font stack. The production container only ships
  // DejaVu Sans (via fonts-dejavu-core); Apple/Segoe/Roboto aren't available
  // so librsvg would render .notdef glyphs ("□ □ □") on servers.
  const fontFamily = '"DejaVu Sans", sans-serif';

  const w = Math.floor(width);
  const h = Math.floor(height);
  const pillarW = Math.min(BRAND_PILLAR_WIDTH, Math.floor(w / 3));
  const infoX = pillarW + 20;
  const accentStripeH = 2;
  const logoSize = 28;
  const logoX = 18;
  const logoY = Math.floor((h - accentStripeH - logoSize) / 2);
  const brandTextX = logoX + logoSize + 12;
  const brandTextY = logoY + 14;
  const brandTaglineY = logoY + 27;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="${OVERLAY_BG}"/>
  <rect x="0" y="0" width="${pillarW}" height="${h - accentStripeH}" fill="${OVERLAY_SURFACE}"/>
  <rect x="${pillarW}" y="0" width="1" height="${h - accentStripeH}" fill="${OVERLAY_BORDER}"/>
  <rect x="0" y="${h - accentStripeH}" width="${w}" height="${accentStripeH}" fill="${OVERLAY_ACCENT}"/>
  <g transform="translate(${logoX} ${logoY}) scale(${logoSize / 56})">
    <path d="${COMP_LOGO_PATH}" fill="${OVERLAY_TEXT}"/>
  </g>
  <g font-family='${fontFamily}' fill="${OVERLAY_TEXT}">
    <text x="${brandTextX}" y="${brandTextY}" font-size="13" font-weight="700" letter-spacing="-0.2">Comp AI</text>
    <text x="${brandTextX}" y="${brandTaglineY}" font-size="${labelFontSize}" font-weight="500" fill="${OVERLAY_MUTED}" letter-spacing="0.8">AUDIT TRAIL</text>
  </g>
  <g font-family='${fontFamily}' fill="${OVERLAY_TEXT}">
    <text x="${infoX}" y="22" font-size="${rowFontSize}" font-weight="600">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}" letter-spacing="0.6">REQUIREMENT  </tspan>
      <tspan letter-spacing="0">${escapeXml(instruction)}</tspan>
    </text>
    <text x="${infoX}" y="46" font-size="${rowFontSize}">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}" letter-spacing="0.6">CAPTURED  </tspan>
      <tspan letter-spacing="0">${escapeXml(timestamp)}</tspan>
    </text>
    <text x="${infoX}" y="70" font-size="${rowFontSize}">
      <tspan fill="${OVERLAY_MUTED}" font-size="${labelFontSize}" letter-spacing="0.6">SOURCE  </tspan>
      <tspan letter-spacing="0">${escapeXml(sourceUrl)}</tspan>
    </text>
  </g>
</svg>`;
}
