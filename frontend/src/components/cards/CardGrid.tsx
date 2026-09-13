import { EntityCard } from './EntityCard';
import { Skeleton } from '../ui/Skeleton';
import { Search } from 'lucide-react';
import { ConfigTablaFrontend } from '../../types/api';

interface CardGridProps<T> {
  data: T[];
  config: ConfigTablaFrontend<T>;
  onCardClick: (row: T) => void;
  isLoading?: boolean;
}

export function CardGrid<T extends Record<string, any>>({
  data,
  config,
  onCardClick,
  isLoading = false,
}: CardGridProps<T>) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-1/3 rounded-full mt-2" />
            </div>
          </div>
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((row, idx) => {
        const cardData = config.renderCard(row);
        return (
          <EntityCard
            key={row[config.pk] || idx}
            cardData={cardData}
            onClick={() => onCardClick(row)}
          />
        );
      })}
    </div>
  );
}
