import { setupServer } from 'msw/node';

import { handlers } from '@/tests/mocks/handlers';

/**
 * Shared MSW server for Node-based tests.
 *
 * Lifecycle (listen / resetHandlers / close) is owned by `src/tests/setup.ts`
 * so every test file gets the same isolation guarantees.
 */
export const server = setupServer(...handlers);
