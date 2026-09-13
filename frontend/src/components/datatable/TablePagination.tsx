import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Table } from '@tanstack/react-table';
import { Button } from '../ui/Button';

interface TablePaginationProps<T> {
  table: Table<T>;
  totalRows?: number;
}

export function TablePagination<T>({ table, totalRows }: TablePaginationProps<T>) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();

  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows || 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400">
      <div className="flex items-center gap-2">
        <span>Mostrando</span>
        <span className="font-semibold text-slate-900 dark:text-zinc-100">
          {startRow}-{endRow}
        </span>
        <span>de</span>
        <span className="font-semibold text-slate-900 dark:text-zinc-100">
          {totalRows || 0}
        </span>
        <span>registros</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span className="px-3 py-1 font-medium text-slate-900 dark:text-zinc-100">
            Página {pageIndex + 1} de {Math.max(pageCount, 1)}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Última página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 cursor-pointer"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} por pág.
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
