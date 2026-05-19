import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  CHECK_DESCRIPTION_SYSTEM_PROMPT,
  buildCheckDescriptionPrompt,
  checkDescriptionSchema,
  findForbiddenContent,
  type CheckDescription,
  type CheckDescriptionInput,
} from './ai-description.prompt';

/**
 * Haiku 4.5 — cheap, fast, plenty good for descriptive text. Locked here
 * so cache invalidation can detect model upgrades via `modelVersion`.
 */
export const DESCRIPTION_MODEL_VERSION = 'claude-haiku-4-5';
const MODEL = anthropic(DESCRIPTION_MODEL_VERSION);

@Injectable()
export class AiDescriptionService {
  private readonly logger = new Logger(AiDescriptionService.name);

  /**
   * Generate a Tier 3 "About this check" panel from a finding's metadata.
   * Returns null on any AI failure — callers should surface a graceful
   * fallback (showing only the existing per-finding description) rather
   * than throwing.
   */
  async generate(input: CheckDescriptionInput): Promise<CheckDescription | null> {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: checkDescriptionSchema,
        system: CHECK_DESCRIPTION_SYSTEM_PROMPT,
        prompt: buildCheckDescriptionPrompt(input),
        temperature: 0,
      });

      // Server-side backstop: if Haiku slipped past the prompt and emitted
      // a compliance control number or URL, refuse to cache it. Callers
      // get null and the UI falls back to existing content.
      const violation = findForbiddenContent(object);
      if (violation) {
        this.logger.warn(
          `AI description for "${input.title}" rejected: ${violation.field} matched forbidden pattern ${violation.pattern}`,
        );
        return null;
      }

      return object;
    } catch (err) {
      this.logger.error(
        `AI description generation failed for "${input.title}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
