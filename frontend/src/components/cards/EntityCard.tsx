import React from 'react';
import { RenderCardResult } from '../../types/api';
import { Badge } from '../ui/Badge';

interface EntityCardProps {
  cardData: RenderCardResult;
  onClick: () => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({ cardData, onClick }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-brand-500 cursor-pointer"
    >
      {/* Avatar */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-brand-800 font-bold text-sm shadow-inner group-hover:bg-brand-50 transition-colors dark:bg-zinc-900 dark:text-brand-300 dark:group-hover:bg-brand-950">
        {cardData.avatar}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-sm text-slate-900 group-hover:text-brand-700 transition-colors dark:text-zinc-100 dark:group-hover:text-brand-400">
          {cardData.titulo}
        </h3>

        {cardData.meta.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-zinc-400">
            {cardData.meta.join(' · ')}
          </p>
        )}

        {cardData.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cardData.tags.map((t, idx) => (
              <Badge key={idx} variant={t.variant || 'default'}>
                {t.text}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
