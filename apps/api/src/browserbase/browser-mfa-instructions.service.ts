import { Injectable, Logger } from '@nestjs/common';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { normalizeHostnameFromUrl } from './browserbase-url';

// Guidance is plain natural language with no SDK-call shape to validate, so the
// cheaper/faster model is the right fit — same choice as the manual-steps
// fallback in ai-remediation.service.
const MODEL = anthropic('claude-sonnet-4-6');

// A vendor's MFA setup UI rarely changes, so a day keeps guidance fresh while
// making all-but-the-first request for a vendor instant and free. In-memory is
// deliberate: instructions are public and cheap to regenerate, so a per-instance
// TTL cache avoids a DB migration; promoting this to a shared table later is a
// drop-in swap behind `getInstructions`.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const instructionSchema = z.object({
  steps: z
    .array(z.string().min(1))
    .describe(
      'Ordered, concrete steps for a user of THIS vendor to add a NEW authenticator (TOTP) app and reveal its manual "setup key" / "secret key". Each step is one short action. 3-7 steps.',
    ),
  confident: z
    .boolean()
    .describe(
      "true ONLY if these steps reflect the vendor's CURRENT, real settings UI. false if you are guessing menu/button names or do not recognize the vendor — the caller then shows a generic fallback instead of shaky specifics.",
    ),
});

export interface MfaInstructions {
  hostname: string;
  steps: string[];
  tips: string[];
  confident: boolean;
  source: 'generated' | 'fallback';
}

interface CacheEntry {
  value: MfaInstructions;
  expiresAt: number;
}

// Always-true, vendor-agnostic pointers, safe to show alongside any steps. These
// are universal TOTP facts, NOT per-vendor hardcode.
const UNIVERSAL_TIPS = [
  'When the vendor shows a QR code, pick "Can\'t scan?" / "Enter this code manually" and copy that long key (the setup key) — not the rotating 6-digit code.',
  'Where the vendor allows more than one device, add a dedicated authenticator just for this automation so it can be revoked without touching your personal one.',
];

// The single generic safety net shown when generation is not confident. One
// universal instruction — not per-vendor hardcode — so we never show invented,
// wrong steps.
const UNIVERSAL_STEPS = [
  'Sign in to the vendor and open your account Security / Two-factor authentication settings.',
  'Choose to add an authenticator app (TOTP).',
  'When the QR code appears, select "Can\'t scan?" / "Enter this code manually" to reveal the setup key.',
  'Copy that setup key and paste it into Comp AI.',
];

const SYSTEM_PROMPT = `You help a user turn on an authenticator app (TOTP) for a third-party SaaS vendor so an automation can generate their 2FA codes.

Given only the vendor's hostname, produce the exact steps to:
1. Open that vendor's account security / two-factor settings,
2. Add a NEW authenticator app (TOTP — NOT SMS, NOT email codes, NOT a security key/passkey),
3. Reveal the manual setup key (vendors usually show a QR plus a "can't scan / enter code manually" option that reveals a long alphanumeric key).

RULES:
- Base the steps on the vendor's CURRENT, real UI. Use real menu/button names only when you are confident of them.
- Do NOT invent specific button or menu names you are unsure about.
- Only cover authenticator-app (TOTP) setup — never SMS, email, or hardware key/passkey.
- One short action per step. 3-7 steps.
- Set confident=true ONLY if the steps reflect this vendor's actual current UI. If you do not recognize the vendor or are unsure of the path, set confident=false.`;

function buildPrompt(hostname: string): string {
  return `Vendor hostname: ${hostname}

Write the steps for a user of this exact vendor to add an authenticator app and reveal its manual setup key. If you do not recognize this vendor or are not confident of its current settings UI, set confident=false.`;
}

/**
 * Produces per-vendor, human-readable instructions for obtaining an authenticator
 * (TOTP) setup key, so users can hand Comp AI the seed for unattended 2FA. Steps
 * are AI-generated (no per-vendor hardcode), confidence-gated to a universal
 * fallback, and cached per hostname.
 */
@Injectable()
export class BrowserMfaInstructionsService {
  private readonly logger = new Logger(BrowserMfaInstructionsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async getInstructions(rawHost: string): Promise<MfaInstructions> {
    const hostname = this.normalizeHost(rawHost);

    const cached = this.cache.get(hostname);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value: MfaInstructions;
    try {
      value = await this.generate(hostname);
    } catch (err) {
      this.logger.warn(
        `MFA instruction generation failed for ${hostname}; using fallback. ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      value = this.fallback(hostname);
    }

    this.cache.set(hostname, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  private async generate(hostname: string): Promise<MfaInstructions> {
    const { object } = await generateObject({
      model: MODEL,
      schema: instructionSchema,
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(hostname),
      temperature: 0.2,
    });

    // Don't show shaky, possibly-invented steps — fall back to the universal
    // instruction whenever the model isn't confident (or returned nothing).
    if (!object.confident || object.steps.length === 0) {
      this.logger.log(`MFA instructions for ${hostname}: not confident → fallback`);
      return this.fallback(hostname);
    }

    this.logger.log(
      `MFA instructions for ${hostname}: generated ${object.steps.length} step(s)`,
    );
    return {
      hostname,
      steps: object.steps,
      tips: UNIVERSAL_TIPS,
      confident: true,
      source: 'generated',
    };
  }

  private fallback(hostname: string): MfaInstructions {
    return {
      hostname,
      steps: UNIVERSAL_STEPS,
      tips: UNIVERSAL_TIPS,
      confident: false,
      source: 'fallback',
    };
  }

  /** Accepts a full URL or a bare hostname; always returns a normalized host. */
  private normalizeHost(rawHost: string): string {
    const trimmed = rawHost.trim();
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      return normalizeHostnameFromUrl(withScheme);
    } catch {
      return trimmed.toLowerCase();
    }
  }
}
