import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { LogOut } from 'lucide-react';

export const ModalLogout: React.FC = () => {
  const { modalLogoutAbierto, cerrarModalLogout } = useUIStore();
  const { cerrarSesion } = useAuthStore();
  const [segundosRestantes, setSegundosRestantes] = useState(5);

  useEffect(() => {
    let interval: any = null;
    if (modalLogoutAbierto) {
      setSegundosRestantes(5);
      interval = setInterval(() => {
        setSegundosRestantes((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [modalLogoutAbierto]);

  const handleConfirmar = async () => {
    cerrarModalLogout();
    await cerrarSesion();
  };

  return (
    <Dialog
      isOpen={modalLogoutAbierto}
      onClose={cerrarModalLogout}
      title="¿Cerrar sesión?"
      maxWidth="sm"
    >
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
          <LogOut className="h-6 w-6" />
        </div>

        <p className="text-sm text-slate-600 dark:text-zinc-300">
          ¿Está seguro de que desea salir del sistema escolar? Se cerrará la sesión actual en este equipo.
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
          <Button variant="outline" size="sm" onClick={cerrarModalLogout}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={segundosRestantes > 0}
            onClick={handleConfirmar}
          >
            {segundosRestantes > 0 ? `Cerrar (${segundosRestantes})` : 'Confirmar Salida'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
