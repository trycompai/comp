import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { assistantChatRedisClient } from './upstash-redis.client';
import type { AssistantChatMessage } from './assistant-chat.types';

const StoredMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  createdAt: z.number(),
});

const StoredMessagesSchema = z.array(StoredMessageSchema);

type GetAssistantChatKeyParams = {
  organizationId: string;
  userId: string;
};

const getAssistantChatKey = ({
  organizationId,
  userId,
}: GetAssistantChatKeyParams): string => {
  return `assistant-chat:v1:${organizationId}:${userId}`;
};

@Injectable()
export class AssistantChatService {
  /**
   * Default TTL is 7 days. This is intended to behave like "session context"
   * rather than a long-term, searchable archive.
   */
  private readonly ttlSeconds = Number(
    process.env.ASSISTANT_CHAT_TTL_SECONDS ?? 60 * 60 * 24 * 7,
  );

  async getHistory(
    params: GetAssistantChatKeyParams,
  ): Promise<AssistantChatMessage[]> {
    const key = getAssistantChatKey(params);
    const raw = await assistantChatRedisClient.get<unknown>(key);
    const parsed = StoredMessagesSchema.safeParse(raw);
    if (!parsed.success) return [];
    return parsed.data;
  }

  async saveHistory(
    params: GetAssistantChatKeyParams,
    messages: AssistantChatMessage[],
  ): Promise<void> {
    const key = getAssistantChatKey(params);
    // Always validate before writing to keep the cache shape stable.
    const validated = StoredMessagesSchema.parse(messages);
    await assistantChatRedisClient.set(key, validated, { ex: this.ttlSeconds });
  }

  async clearHistory(params: GetAssistantChatKeyParams): Promise<void> {
    const key = getAssistantChatKey(params);
    await assistantChatRedisClient.del(key);
  }
}
