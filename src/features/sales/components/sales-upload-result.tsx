import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { SalesUploadSubmission } from '@/features/sales/types';

export interface SalesUploadResultProps {
  submission: SalesUploadSubmission;
}

function resultTitle(submission: SalesUploadSubmission): string {
  return submission.result.rejectedRows === 0
    ? 'Sales upload complete'
    : 'Sales upload completed with validation errors';
}

/** Backend-aligned upload summary with a bounded, safe rejected-row projection. */
export function SalesUploadResult({ submission }: SalesUploadResultProps) {
  const { result, rowErrors } = submission;

  return (
    <Card aria-labelledby="sales-upload-result-title">
      <CardHeader>
        <CardTitle id="sales-upload-result-title" as="h2">
          {resultTitle(submission)}
        </CardTitle>
        <CardDescription>
          {result.originalFilename} finished with {result.acceptedRows} accepted row
          {result.acceptedRows === 1 ? '' : 's'} and {result.rejectedRows} rejected row
          {result.rejectedRows === 1 ? '' : 's'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md bg-surface-muted p-3">
            <dt className="text-foreground-muted">Total rows</dt>
            <dd className="mt-1 font-semibold text-foreground">{result.totalRows}</dd>
          </div>
          <div className="rounded-md bg-surface-muted p-3">
            <dt className="text-foreground-muted">Accepted</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {result.acceptedRows}
            </dd>
          </div>
          <div className="rounded-md bg-surface-muted p-3">
            <dt className="text-foreground-muted">Rejected</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {result.rejectedRows}
            </dd>
          </div>
        </dl>

        {rowErrors.length === 0 ? null : (
          <section aria-labelledby="rejected-sales-rows-title" className="space-y-3">
            <div>
              <h3
                id="rejected-sales-rows-title"
                className="text-sm font-semibold text-foreground"
              >
                Rejected rows
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Showing {rowErrors.length} of {result.rejectedRows} available row error
                {result.rejectedRows === 1 ? '' : 's'}.
              </p>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table
                className="w-full min-w-[36rem] text-left text-sm"
                aria-label="Rejected sales rows"
              >
                <thead className="bg-surface-muted text-foreground-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Row
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Code
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rowErrors.map((error) => (
                    <tr
                      key={`${error.rowNumber}-${error.errorCode}`}
                      className="border-t border-border"
                    >
                      <td className="px-4 py-3 text-foreground">{error.rowNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                        {error.errorCode}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {error.errorMessage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
