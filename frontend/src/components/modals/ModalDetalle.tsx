import React from 'react';
import { Dialog } from '../ui/Dialog';
import { useUIStore } from '../../stores/useUIStore';
import { CONFIG_TABLAS } from '../../config/configTablas';
import { capitalizar, formatearFecha, limpiarTelefono } from '../../lib/utils';
import { ExternalLink, Mail, Phone } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { NombreTabla } from '../../types/entidades';
import { apiDetalle } from '../../api/client';

export const ModalDetalle: React.FC = () => {
  const { registroSeleccionado, cerrarModalDetalle, abrirModalDetalle } = useUIStore();

  if (!registroSeleccionado) return null;

  const { tabla, row } = registroSeleccionado;
  const config = CONFIG_TABLAS[tabla];
  const rendered = config.renderCard(row);

  const tablasRelacionadas = new Set<string>(
    Object.values(config.relaciones || {}).map((rel) => rel.tabla)
  );

  // Campos directos excluyendo IDs internos y tablas anidadas
  const camposDirectos = Object.entries(row).filter(
    ([key]) => key !== 'id' && !key.startsWith('id_') && !tablasRelacionadas.has(key)
  );

  // Claves foráneas al final
  const camposFk = Object.entries(row).filter(
    ([key]) => key.startsWith('id_') && key !== 'id'
  );

  const handleNavegarFk = async (fkTabla: NombreTabla, fkPk: string, fkId: string | number) => {
    try {
      const res = await apiDetalle(fkTabla, fkPk, fkId);
      if (res.data) {
        abrirModalDetalle(fkTabla, res.data);
      }
    } catch (err) {
      console.error('Error al cargar FK:', err);
    }
  };

  const renderValorCampo = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-400 dark:text-zinc-600">—</span>;
    }

    // Fechas
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return <span className="font-medium text-slate-800 dark:text-zinc-200">{formatearFecha(value)}</span>;
    }

    // Emails
    if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return (
        <a
          href={`mailto:${value}`}
          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 hover:underline font-medium dark:text-brand-400 dark:hover:text-brand-300"
        >
          <Mail className="h-3.5 w-3.5" />
          <span>{value}</span>
        </a>
      );
    }

    // Teléfonos (solo si el nombre del campo corresponde)
    if (
      key.toLowerCase().includes('telefono') &&
      typeof value === 'string' &&
      /^[\d\s\+\-\(\)]{6,}$/.test(value)
    ) {
      return (
        <a
          href={`tel:${limpiarTelefono(value)}`}
          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 hover:underline font-medium dark:text-brand-400 dark:hover:text-brand-300"
        >
          <Phone className="h-3.5 w-3.5" />
          <span>{value}</span>
        </a>
      );
    }

    return <span className="font-medium text-slate-800 dark:text-zinc-200">{String(value)}</span>;
  };

  return (
    <Dialog
      isOpen={Boolean(registroSeleccionado)}
      onClose={cerrarModalDetalle}
      title={rendered.titulo}
      description={`Ficha técnica de ${config.titulo.toLowerCase()}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Cabecera con Avatar e Información Resumida */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-zinc-900/60 dark:border-zinc-800">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white font-bold text-lg shadow-sm dark:bg-brand-600">
            {rendered.avatar}
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              {rendered.titulo}
            </h4>
            {rendered.meta.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {rendered.meta.join(' · ')}
              </p>
            )}
            {rendered.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rendered.tags.map((t, i) => (
                  <Badge key={i} variant={t.variant}>
                    {t.text}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grilla de Campos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {camposDirectos.map(([key, val]) => (
            <div
              key={key}
              className="p-3 rounded-lg border border-slate-100 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 text-left"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                {capitalizar(key)}
              </span>
              <div className="text-sm break-words">{renderValorCampo(key, val)}</div>
            </div>
          ))}

          {/* Relaciones Foráneas (FK) */}
          {camposFk.map(([key, val]) => {
            const relacion = config.relaciones?.[key];
            if (!relacion || val == null) return null;

            const relacionado = row[relacion.tabla];
            const relacionadoObj = Array.isArray(relacionado) ? relacionado[0] : relacionado;
            const textoRelacion = relacionadoObj
              ? relacion.render(relacionadoObj)
              : `ID: ${val}`;

            return (
              <div
                key={key}
                className="p-3 rounded-lg border border-slate-100 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 text-left"
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                  {capitalizar(key.replace(/^id_/, ''))}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-zinc-200 truncate">
                    {textoRelacion || `ID: ${val}`}
                  </span>
                  {val && (
                    <button
                      type="button"
                      onClick={() => handleNavegarFk(relacion.tabla, relacion.pk, val)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/80 dark:text-brand-300 dark:hover:bg-brand-900 transition-colors"
                    >
                      <span>Ver</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
};
