import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loading, EmptyState } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}

function cellValue<T>(col: Column<T>, row: T): ReactNode {
  if (col.render) return col.render(row);
  return String((row as Record<string, unknown>)[col.key] ?? '—');
}

// Renders a table on >=sm screens and a stacked card list on mobile.
export function DataTable<T>({ columns, rows, rowKey, loading, onRowClick, empty }: Props<T>) {
  if (loading) return <Loading />;
  if (!rows.length) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.key} className={cn('whitespace-nowrap px-3 py-2.5 font-semibold', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-slate-100 last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-accent-50/50'
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-2.5 align-middle text-slate-700', c.className)}>
                    {cellValue(c, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={cn('card p-3', onRowClick && 'active:bg-accent-50')}
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex justify-between gap-3 py-0.5 text-sm">
                  <span className="text-xs font-medium uppercase text-slate-400">{c.header}</span>
                  <span className="text-right text-slate-700">{cellValue(c, row)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
