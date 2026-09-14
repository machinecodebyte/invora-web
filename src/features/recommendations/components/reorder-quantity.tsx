import { formatNumber } from '@/lib/utils';

export interface ReorderQuantityProps {
  readonly quantity: number;
  readonly unit: string;
}

/** Display-only backend recommendation; this component never calculates or edits quantity. */
export function ReorderQuantity({ quantity, unit }: ReorderQuantityProps) {
  const formatted = formatNumber(quantity, { maximumFractionDigits: 3 });
  return <span className="font-medium tabular-nums">{formatted} {unit}</span>;
}
