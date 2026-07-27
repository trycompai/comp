import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without test globals RTL cannot register its own afterEach cleanup.
afterEach(() => {
  cleanup();
});
