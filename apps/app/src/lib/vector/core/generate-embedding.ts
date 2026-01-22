import 'server-only';

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { env } from '@/env.mjs';

/**
 * Generates an embedding vector for the given text using OpenAI's embedding model
 * @param text - The text to generate an embedding for
 * @returns An array of numbers representing the embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });

    return embedding;
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

