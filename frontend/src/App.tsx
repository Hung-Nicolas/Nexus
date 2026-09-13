import React, { useEffect } from 'react';
import { useAuthStore } from './stores/useAuthStore';
import { useUIStore } from './stores/useUIStore';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { BuscadorView } from './views/BuscadorView';
import { InfoView } from './views/InfoView';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ModalDetalle } from './components/modals/ModalDetalle';
import { ModalLogout } from './components/modals/ModalLogout';
import nexusLogo from './assets/Nexus_logo.png';

export const App: React.FC = () => {
  const { status, restaurarSesion } = useAuthStore();
  const { seccionActual } = useUIStore();

  useEffect(() => {
    restaurarSesion();
  }, [restaurarSesion]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <img
          src={nexusLogo}
          alt="Nexus"
          className="h-12 w-12 animate-pulse object-contain mb-3"
        />
        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          Iniciando Nexus...
        </p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <LoginView />;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-zinc-950">
      {/* Sidebar Lateral */}
      <Sidebar />

      {/* Área Principal de Contenido */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {seccionActual === 'dashboard' && <DashboardView />}
          {seccionActual === 'buscador' && <BuscadorView />}
          {seccionActual === 'info' && <InfoView />}
        </main>
      </div>

      {/* Modales Globales */}
      <ModalDetalle />
      <ModalLogout />
    </div>
  );
};
