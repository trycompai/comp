// apps/api/src/browserbase/screenshot-overlay.spec.ts
import sharp from 'sharp';
import { renderOverlay, OVERLAY_HEIGHT_PX } from './screenshot-overlay';

describe('renderOverlay', () => {
  const makeSolidJpeg = async (width = 800, height = 600) => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();
  };

  it('adds a bottom banner that increases image height by OVERLAY_HEIGHT_PX', async () => {
    const input = await makeSolidJpeg(800, 600);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Verify MFA is enforced',
      sourceUrl: 'https://github.com/settings/security',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600 + OVERLAY_HEIGHT_PX);
    expect(meta.format).toBe('jpeg');
  });

  it('preserves non-800 widths (narrow image)', async () => {
    const input = await makeSolidJpeg(400, 300);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Check',
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300 + OVERLAY_HEIGHT_PX);
  });

  it('preserves wide widths (4000px)', async () => {
    const input = await makeSolidJpeg(4000, 1200);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Check',
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(4000);
    expect(meta.height).toBe(1200 + OVERLAY_HEIGHT_PX);
  });

  it('paints a dark banner on the bottom (top-left pixel is light source color; bottom-center is dark banner)', async () => {
    const input = await makeSolidJpeg(800, 600);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Check',
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const raw = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const { data, info } = raw;
    // Top-left pixel: source color, ~240
    const topLeft = { r: data[0], g: data[1], b: data[2] };
    expect(topLeft.r).toBeGreaterThan(200);
    // Bottom-center pixel (in the banner region): dark
    const bottomRow = info.height - Math.floor(OVERLAY_HEIGHT_PX / 2);
    const midCol = Math.floor(info.width / 2);
    const idx = (bottomRow * info.width + midCol) * info.channels;
    const bottomMid = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
    expect(bottomMid.r).toBeLessThan(40);
    expect(bottomMid.g).toBeLessThan(40);
    expect(bottomMid.b).toBeLessThan(40);
  });

  it('truncates very long instruction text without throwing', async () => {
    const input = await makeSolidJpeg(800, 600);
    const longInstruction = 'a'.repeat(500);
    const out = await renderOverlay({
      buffer: input,
      instruction: longInstruction,
      sourceUrl: 'https://example.com',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.height).toBe(600 + OVERLAY_HEIGHT_PX);
  });

  it('handles unicode in instruction and URL', async () => {
    const input = await makeSolidJpeg(800, 600);
    const out = await renderOverlay({
      buffer: input,
      instruction: 'Vérifier MFA — 🔐',
      sourceUrl: 'https://exämple.com/café',
      capturedAt: new Date('2026-04-22T14:32:07Z'),
    });
    const meta = await sharp(out).metadata();
    expect(meta.height).toBe(600 + OVERLAY_HEIGHT_PX);
  });
});
