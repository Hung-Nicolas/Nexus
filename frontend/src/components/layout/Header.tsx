import React from 'react';
import { Menu, LayoutList, LayoutGrid } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { ThemeToggle } from './ThemeToggle';
import { CONFIG_TABLAS } from '../../config/configTablas';

export const Header: React.FC = () => {
  const {
    seccionActual,
    tablaActual,
    modoVista,
    setModoVista,
    setSidebarMobile,
  } = useUIStore();

  const getBreadcrumbTitle = () => {
    if (seccionActual === 'dashboard') return 'Dashboard Principal';
    if (seccionActual === 'info') return 'Acerca del Sistema';
    return CONFIG_TABLAS[tablaActual]?.titulo || 'Buscador';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 sm:px-8 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarMobile(true)}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            {getBreadcrumbTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Selector de Vista (Tabla vs Cards) en sección Buscador */}
        {seccionActual === 'buscador' && (
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setModoVista('table')}
              aria-label="Vista en Tabla Densa"
              title="Vista en Tabla Densa"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                modoVista === 'table'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
            <button
              onClick={() => setModoVista('cards')}
              aria-label="Vista en Tarjetas"
              title="Vista en Tarjetas"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                modoVista === 'cards'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
};
