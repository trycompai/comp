import { auth } from '@/app/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Mark route as dynamic to prevent static analysis during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const { GET, POST } = toNextJsHandler(auth.handler);
