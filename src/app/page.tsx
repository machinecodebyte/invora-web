import type { Metadata } from 'next';

import { LandingPage } from '@/components/marketing/landing-page';

export const metadata: Metadata = {
  title: { absolute: 'Invora — AI Demand Forecasting & Inventory Replenishment' },
  description:
    'Invora connects sales history, inventory state, demand forecasting, and reorder recommendations for clearer inventory planning.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Invora — AI Demand Forecasting & Inventory Replenishment',
    description:
      'Inventory intelligence for demand planning, stock visibility, forecasting, and replenishment review.',
    type: 'website',
  },
};

/** Public, API-independent product entry point. */
export default function HomePage() {
  return <LandingPage />;
}
