'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/lib/query-client';

export interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Client-side provider composition mounted by the root layout.
 *
 * The QueryClient is created in state rather than at module scope: a
 * module-level client would be shared across concurrent server renders and leak
 * one user's cached data into another user's request.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
