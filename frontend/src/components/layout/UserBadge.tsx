import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { capitalizar, obtenerIniciales } from '../../lib/utils';

export const UserBadge: React.FC = () => {
  const { perfil } = useAuthStore();

  if (!perfil) return null;

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-zinc-900/80 dark:border-zinc-800">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white font-bold text-xs shadow-sm dark:bg-brand-600">
        {obtenerIniciales(perfil.nombre, perfil.apellido)}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-zinc-100">
          {perfil.apellido}, {perfil.nombre}
        </p>
        <span className="inline-block text-[10px] font-medium text-brand-700 uppercase tracking-wide dark:text-brand-400">
          {capitalizar(perfil.rol)}
        </span>
      </div>
    </div>
  );
};
