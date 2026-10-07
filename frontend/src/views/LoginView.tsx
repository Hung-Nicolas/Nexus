import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import nexusLogo from '../assets/Nexus_logo.png';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { iniciarSesion, iniciarSesionDemo, status, error, limpiarError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarError();
    await iniciarSesion(email, password);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <img
            src={nexusLogo}
            alt="Nexus"
            className="mx-auto h-16 w-16 object-contain drop-shadow-sm mb-3"
          />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            Nexus
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Sistema cerrado · Acceso exclusivo para personal autorizado
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Correo Institucional"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@nexus.local"
            icon={<Mail className="h-4 w-4" />}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            required
          />

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={status === 'loading'}
          >
            Iniciar Sesión
          </Button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
            </div>
            <span className="relative bg-white px-2 text-[11px] uppercase tracking-wider text-slate-400 dark:bg-zinc-900 dark:text-zinc-500">
              o para previsualización
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={iniciarSesionDemo}
            className="w-full flex items-center justify-center gap-2 border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span>Ingresar en Modo Demo (Offline)</span>
          </Button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-100 text-center dark:border-zinc-800">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
            Nexus Base de Datos Escolar Maestra v2.0
          </span>
        </div>
      </div>
    </div>
  );
};
