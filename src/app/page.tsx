import { AppShell } from '@/components/layout/app-shell';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { isApiBaseUrlConfigured } from '@/lib/env';

/**
 * Foundation capabilities that are actually wired up in this module.
 *
 * This is application status, not business data: the page intentionally shows no
 * metrics, products, inventory, forecasts, or recommendations.
 */
const FOUNDATION_CAPABILITIES = [
  'App Router with server components by default and strict TypeScript',
  'Tailwind design tokens with light and dark palettes',
  'Typed API client with timeouts and normalized error handling',
  'TanStack Query provider configured for dashboard workloads',
  'React Hook Form and Zod validation pattern',
  'Vitest, React Testing Library, MSW, and Playwright test harness',
] as const;

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-sm text-foreground-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Root page for the Foundation module.
 *
 * A server component: it reads configuration at request time and ships no
 * client-side JavaScript of its own.
 */
export default function HomePage() {
  // Reports configured/not configured rather than the URL itself, so deployment
  // topology is never echoed back to the page.
  const apiConfigured = isApiBaseUrlConfigured();

  return (
    <AppShell>
      <PageContainer title={APP_NAME} description={APP_TAGLINE}>
        <p className="mb-8 max-w-2xl text-sm text-foreground-muted">
          {APP_DESCRIPTION}
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Application status</CardTitle>
              <CardDescription>Current state of the frontend runtime.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl>
                <StatusRow label="Frontend module" value="Foundation" />
                <StatusRow label="Status" value="Ready" />
                <StatusRow
                  label="API base URL"
                  value={apiConfigured ? 'Configured' : 'Not configured'}
                />
                <StatusRow label="Backend integration" value="Not enabled" />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Foundation scope</CardTitle>
              <CardDescription>
                Infrastructure established for the feature modules that follow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {FOUNDATION_CAPABILITIES.map((capability) => (
                  <li
                    key={capability}
                    className="flex gap-2.5 text-sm text-foreground-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
