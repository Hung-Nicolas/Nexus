import { useRef, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { TablePagination } from './TablePagination';
import { Skeleton } from '../ui/Skeleton';
import { Search } from 'lucide-react';

interface DataTableVirtualProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export function DataTableVirtual<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  isLoading = false,
}: DataTableVirtualProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const { rows } = table.getRowModel();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-zinc-900 dark:text-zinc-500 mb-3">
          <Search className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
          No se encontraron registros
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
          Intente modificar los términos de búsqueda o ajuste los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
      <div
        ref={tableContainerRef}
        className="overflow-x-auto overflow-y-auto max-h-[600px] relative scrollbar-thin"
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick && onRowClick(row.original)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
                    e.preventDefault();
                    onRowClick(row.original);
                  }
                }}
                className={`transition-colors cursor-pointer hover:bg-brand-50/40 dark:hover:bg-zinc-900/60 focus:outline-none focus:bg-brand-50/60 dark:focus:bg-zinc-900`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm text-slate-800 dark:text-zinc-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination table={table} totalRows={data.length} />
    </div>
  );
}
