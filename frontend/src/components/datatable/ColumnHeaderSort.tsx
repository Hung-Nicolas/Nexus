import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Header } from '@tanstack/react-table';

interface ColumnHeaderSortProps<T> {
  header: Header<T, unknown>;
  title: string;
}

export function ColumnHeaderSort<T>({ header, title }: ColumnHeaderSortProps<T>) {
  const isSorted = header.column.getIsSorted();

  return (
    <button
      onClick={header.column.getToggleSortingHandler()}
      className="flex items-center gap-1.5 font-semibold text-xs text-slate-700 uppercase tracking-wider hover:text-brand-700 dark:text-zinc-300 dark:hover:text-brand-400 select-none group"
    >
      <span>{title}</span>
      {isSorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" />
      ) : isSorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
