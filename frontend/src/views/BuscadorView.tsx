import React, { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useBuscarQuery, useOpcionesFiltrosQuery } from '../api/queries';
import { CONFIG_TABLAS } from '../config/configTablas';
import { DataTableVirtual } from '../components/datatable/DataTableVirtual';
import { CardGrid } from '../components/cards/CardGrid';
import { ColumnHeaderSort } from '../components/datatable/ColumnHeaderSort';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Search, X, RotateCcw, Copy, Check } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { capitalizar } from '../lib/utils';

export const BuscadorView: React.FC = () => {
  const {
    tablaActual,
    modoVista,
    terminoBusqueda,
    setTerminoBusqueda,
    filtrosActuales,
    setFiltro,
    limpiarFiltros,
    abrirModalDetalle,
  } = useUIStore();

  const [debouncedTerm, setDebouncedTerm] = useState(terminoBusqueda);
  const [copiado, setCopiado] = useState(false);

  // Debounce de búsqueda de 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(terminoBusqueda);
    }, 250);
    return () => clearTimeout(timer);
  }, [terminoBusqueda]);

  const config = CONFIG_TABLAS[tablaActual];

  const { data: opcionesRes } = useOpcionesFiltrosQuery(tablaActual);

  const { data: buscarRes, isLoading, isFetching } = useBuscarQuery(
    tablaActual,
    {
      termino: debouncedTerm,
      filtros: filtrosActuales,
      limite: 100,
    }
  );

  const records = useMemo(() => buscarRes?.data || [], [buscarRes]);

  // Copiar resumen al portapapeles
  const handleCopiarDatos = () => {
    if (records.length === 0) return;
    const jsonStr = JSON.stringify(records, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Definición de columnas dinámicas según la tabla seleccionada
  const columns: ColumnDef<any, any>[] = useMemo(() => {
    switch (tablaActual) {
      case 'alumnos':
        return [
          {
            accessorKey: 'apellido',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Alumno / Apellido y Nombre" />,
            cell: ({ row }) => (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-bold text-xs text-brand-800 dark:bg-zinc-800 dark:text-brand-300">
                  {row.original.nombre?.[0]}
                  {row.original.apellido?.[0]}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-zinc-100">
                    {row.original.apellido}, {row.original.nombre}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400">
                    {row.original.email || 'Sin email'}
                  </div>
                </div>
              </div>
            ),
          },
          {
            accessorKey: 'dni',
            header: ({ header }) => <ColumnHeaderSort header={header} title="DNI" />,
            cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() || '—'}</span>,
          },
          {
            id: 'curso',
            header: 'Curso & Especialidad',
            cell: ({ row }) => {
              const curso = Array.isArray(row.original.cursos) ? row.original.cursos[0] : row.original.cursos;
              if (!curso) return <span className="text-slate-400">—</span>;
              return (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs">
                    {curso.anio}° {curso.division} ({curso.turno})
                  </span>
                  {curso.especialidad && (
                    <Badge variant="purple" className="text-[10px]">
                      {curso.especialidad}
                    </Badge>
                  )}
                </div>
              );
            },
          },
          {
            accessorKey: 'telefono',
            header: 'Contacto',
            cell: ({ getValue }) => <span className="text-xs text-slate-600 dark:text-zinc-400">{getValue() || '—'}</span>,
          },
        ];

      case 'responsables':
        return [
          {
            accessorKey: 'apellido',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Responsable" />,
            cell: ({ row }) => (
              <div className="font-semibold text-slate-900 dark:text-zinc-100">
                {row.original.apellido}, {row.original.nombre}
              </div>
            ),
          },
          {
            accessorKey: 'vinculo',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Vínculo" />,
            cell: ({ getValue }) => (
              <Badge variant="primary" className="text-[11px]">
                {capitalizar(getValue()) || 'Tutor'}
              </Badge>
            ),
          },
          {
            accessorKey: 'telefono',
            header: 'Teléfono',
            cell: ({ getValue }) => <span className="text-xs font-mono">{getValue() || '—'}</span>,
          },
          {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ getValue }) => <span className="text-xs text-slate-600 dark:text-zinc-400">{getValue() || '—'}</span>,
          },
        ];

      case 'personal':
        return [
          {
            accessorKey: 'apellido',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Personal / Docente" />,
            cell: ({ row }) => (
              <div className="font-semibold text-slate-900 dark:text-zinc-100">
                {row.original.apellido}, {row.original.nombre}
              </div>
            ),
          },
          {
            accessorKey: 'dni',
            header: ({ header }) => <ColumnHeaderSort header={header} title="DNI" />,
            cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() || '—'}</span>,
          },
          {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ getValue }) => <span className="text-xs text-slate-600 dark:text-zinc-400">{getValue() || '—'}</span>,
          },
          {
            accessorKey: 'telefono',
            header: 'Teléfono',
            cell: ({ getValue }) => <span className="text-xs font-mono">{getValue() || '—'}</span>,
          },
        ];

      case 'cursos':
        return [
          {
            accessorKey: 'anio',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Año y División" />,
            cell: ({ row }) => (
              <span className="font-bold text-slate-900 dark:text-zinc-100">
                {row.original.anio}° {row.original.division}
              </span>
            ),
          },
          {
            accessorKey: 'turno',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Turno" />,
            cell: ({ getValue }) => <Badge variant="default">{getValue()}</Badge>,
          },
          {
            accessorKey: 'especialidad',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Especialidad" />,
            cell: ({ getValue }) => (
              getValue() ? <Badge variant="purple">{getValue()}</Badge> : <span className="text-slate-400">—</span>
            ),
          },
        ];

      case 'materias':
        return [
          {
            accessorKey: 'nombre',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Nombre de la Materia" />,
            cell: ({ getValue }) => <span className="font-bold text-slate-900 dark:text-zinc-100">{getValue()}</span>,
          },
          {
            accessorKey: 'descripcion',
            header: 'Descripción / Plan de Estudios',
            cell: ({ getValue }) => <span className="text-xs text-slate-600 dark:text-zinc-400">{getValue() || '—'}</span>,
          },
        ];

      case 'roles':
        return [
          {
            accessorKey: 'nombre',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Rol Institucional" />,
            cell: ({ getValue }) => (
              <Badge variant="primary" className="font-semibold">
                {capitalizar(getValue())}
              </Badge>
            ),
          },
          {
            accessorKey: 'descripcion',
            header: 'Descripción del Rol',
            cell: ({ getValue }) => <span className="text-xs text-slate-600 dark:text-zinc-400">{getValue() || '—'}</span>,
          },
        ];

      case 'domicilios':
        return [
          {
            accessorKey: 'calle',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Dirección" />,
            cell: ({ row }) => (
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                {row.original.calle} {row.original.numero}
                {row.original.departamento ? ` (Dpto ${row.original.departamento})` : ''}
              </span>
            ),
          },
          {
            accessorKey: 'localidad',
            header: ({ header }) => <ColumnHeaderSort header={header} title="Localidad" />,
            cell: ({ getValue }) => <span className="text-xs text-slate-600 dark:text-zinc-400">{getValue() || '—'}</span>,
          },
        ];

      default:
        return [];
    }
  }, [tablaActual]);

  const filtrosActivosCount = Object.keys(filtrosActuales).length;

  return (
    <div className="space-y-6 text-left">
      {/* Barra de Búsqueda y Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Input
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              placeholder={config.placeholder}
              icon={<Search className="h-4 w-4" />}
            />
            {terminoBusqueda && (
              <button
                onClick={() => setTerminoBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiarDatos}
              disabled={records.length === 0}
              className="whitespace-nowrap"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiado ? 'Copiado' : 'Exportar JSON'}</span>
            </Button>
          </div>
        </div>

        {/* Filtros Dinámicos */}
        {config.filtros.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
            {config.filtros.map((f) => {
              // Combinar opciones predefinidas con las dinámicas de la API
              const opcionesDinamicas =
                opcionesRes?.opciones?.[`${tablaActual}.${f.key}`] || f.opciones;

              const selectOptions = opcionesDinamicas.map((opt) => ({
                label: opt.includes('°') ? opt : `${opt}`,
                value: opt,
              }));

              return (
                <div key={f.key} className="w-full sm:w-44">
                  <Select
                    label={f.label}
                    placeholderOption={`Todos (${f.label})`}
                    options={selectOptions}
                    value={filtrosActuales[f.key] || ''}
                    onChange={(e) => setFiltro(f.key, e.target.value || undefined)}
                  />
                </div>
              );
            })}

            {filtrosActivosCount > 0 && (
              <div className="self-end pb-0.5">
                <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-xs text-slate-600">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Limpiar filtros</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Indicador de estado y total */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
            {config.titulo}
          </h2>
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            ({records.length} registros cargados)
          </span>
          {isFetching && !isLoading && (
            <span className="text-[10px] text-brand-600 font-medium animate-pulse">
              Actualizando...
            </span>
          )}
        </div>
      </div>

      {/* Renderizado de Vista Híbrida (Tabla o Cards) */}
      {modoVista === 'table' ? (
        <DataTableVirtual
          data={records}
          columns={columns}
          onRowClick={(row) => abrirModalDetalle(tablaActual, row)}
          isLoading={isLoading}
        />
      ) : (
        <CardGrid
          data={records}
          config={config}
          onCardClick={(row) => abrirModalDetalle(tablaActual, row)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
