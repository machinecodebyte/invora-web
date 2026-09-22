import { Button } from '@/components/ui/button';
import { TableScrollArea } from '@/components/ui/table-scroll-area';
import { ProductStatusBadge } from '@/features/products/components/product-status-badge';
import type { Product } from '@/features/products/types';

export interface ProductsTableProps {
  products: readonly Product[];
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onArchive: (product: Product) => void;
}

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** Semantic, horizontally scrollable Product Catalog table. */
export function ProductsTable({
  products,
  onEdit,
  onView,
  onArchive,
}: ProductsTableProps) {
  return (
    <TableScrollArea className="rounded-lg border border-border bg-surface">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Products</caption>
        <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Product
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              SKU
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Unit
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Selling price
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Cost price
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Updated
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr key={product.id} className="text-foreground">
              <td className="break-words px-4 py-3 font-medium">{product.name}</td>
              <td className="break-all px-4 py-3 font-mono text-xs">{product.sku}</td>
              <td className="px-4 py-3">{product.unit}</td>
              <td className="px-4 py-3">
                {priceFormatter.format(product.sellingPrice)}
              </td>
              <td className="px-4 py-3">
                {product.costPrice === null
                  ? 'Unavailable'
                  : priceFormatter.format(product.costPrice)}
              </td>
              <td className="px-4 py-3">
                <ProductStatusBadge status={product.isActive ? 'active' : 'inactive'} />
              </td>
              <td className="px-4 py-3 text-foreground-muted">
                {formatUpdatedAt(product.updatedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={'Edit ' + product.name}
                  onClick={() => onEdit(product)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={'View ' + product.name}
                  onClick={() => onView(product)}
                >
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={'Archive ' + product.name}
                  onClick={() => onArchive(product)}
                >
                  Archive
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScrollArea>
  );
}
