import { env } from '@/env.mjs';
import { Dub } from 'dub';

export const dub = new Dub({
  token: env.DUB_API_KEY,
});
