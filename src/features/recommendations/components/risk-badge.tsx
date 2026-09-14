import { cn } from '@/lib/utils';
import type { RecommendationRiskLevel } from '@/features/recommendations/types';

const RISK_LABELS: Readonly<Record<RecommendationRiskLevel, string>> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
  overstocked: 'Overstocked',
};

const RISK_CLASSES: Readonly<Record<RecommendationRiskLevel, string>> = {
  low: 'border-success/40 bg-success/10 text-success',
  medium: 'border-warning/40 bg-warning/10 text-warning',
  high: 'border-danger/40 bg-danger/10 text-danger',
  critical: 'border-danger bg-danger/15 text-danger',
  overstocked: 'border-border bg-surface-muted text-foreground-muted',
};

export interface RiskBadgeProps {
  readonly riskLevel: RecommendationRiskLevel;
}

/** Visible backend risk text; color is supplementary, never the sole signal. */
export function RiskBadge({ riskLevel }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        RISK_CLASSES[riskLevel],
      )}
    >
      {RISK_LABELS[riskLevel]}
    </span>
  );
}
