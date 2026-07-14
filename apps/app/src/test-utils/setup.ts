// Global test setup for Vitest
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// jsdom does not implement PointerEvent, which base-ui components (e.g. Switch)
// dispatch on interaction. Provide a minimal shim so pointer-driven tests work
// instead of throwing "PointerEvent is not defined".
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? '';
    }
  }

  globalThis.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
}

// Stub `server-only` so modules that use the marker can still be imported
// in jsdom test runs (the package throws on client environments by design).
vi.mock('server-only', () => ({}));

// Mock Next.js modules globally
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(
    () =>
      new Map([
        ['x-pathname', '/'],
        ['x-forwarded-for', '127.0.0.1'],
        ['user-agent', 'test-agent'],
      ]),
  ),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock server actions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Set up environment variables for testing
beforeAll(() => {
  process.env.AUTH_SECRET = 'test-auth-secret';
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL = 'http://localhost:3000';
  // NODE_ENV is automatically set to 'test' by Vitest
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global cleanup
afterAll(() => {
  vi.restoreAllMocks();
});
