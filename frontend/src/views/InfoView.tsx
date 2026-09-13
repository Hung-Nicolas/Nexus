import React from 'react';
import { NEXUS_INFO } from '../config/infoNexus';
import { CheckCircle2, Mail, Users, Info, Sparkles } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const InfoView: React.FC = () => {
  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            Nexus — Base de Datos Escolar Maestra
          </h2>
          <Badge variant="primary" className="font-mono text-xs">
            v{NEXUS_INFO.version}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          {NEXUS_INFO.descripcion}
        </p>
      </div>

      {/* Tarjeta de Novedades / Changelog */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
            Novedades de la Versión
          </h3>
        </div>

        <div className="space-y-6">
          {NEXUS_INFO.novedades.map((nov, idx) => (
            <div key={idx} className="space-y-2">
              <span className="text-xs font-semibold text-brand-700 dark:text-brand-400 font-mono">
                {nov.version}
              </span>
              <ul className="space-y-2">
                {nov.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Tarjeta de Integrantes y Contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Integrantes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <Users className="h-4 w-4 text-slate-500" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Equipo de Desarrollo
            </h4>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
            {NEXUS_INFO.integrantes.map((int, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                <span className="font-medium text-slate-900 dark:text-zinc-200">{int.nombre}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Soporte y Contacto */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <Info className="h-4 w-4 text-slate-500" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Soporte y Notificaciones
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            En caso de advertir inconsistencias en los datos o fallas técnicas del servidor, contactar a regencia o escribir a:
          </p>
          <a
            href={`mailto:${NEXUS_INFO.contacto}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <Mail className="h-4 w-4" />
            <span>{NEXUS_INFO.contacto}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
