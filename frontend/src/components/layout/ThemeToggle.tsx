import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

export const ThemeToggle: React.FC = () => {
  const { tema, toggleTema } = useUIStore();

  return (
    <button
      onClick={toggleTema}
      aria-label={`Cambiar a modo ${tema === 'light' ? 'oscuro' : 'claro'}`}
      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
    >
      {tema === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
    </button>
  );
};
