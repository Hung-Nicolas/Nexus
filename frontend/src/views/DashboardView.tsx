import React from 'react';
import { useStatsQuery } from '../api/queries';
import { useUIStore } from '../stores/useUIStore';
import {
  GraduationCap,
  Users,
  UserCheck,
  School,
  BookOpen,
  Award,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { NombreTabla } from '../types/entidades';

export const DashboardView: React.FC = () => {
  const { data: stats, isLoading, isError } = useStatsQuery();
  const { setTabla } = useUIStore();

  const statItems = [
    {
      label: 'Alumnos Registrados',
      value: stats?.alumnos,
      icon: <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      bgIcon: 'bg-blue-50 dark:bg-blue-950/60',
      table: 'alumnos' as NombreTabla,
    },
    {
      label: 'Personal & Docentes',
      value: stats?.personal,
      icon: <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      bgIcon: 'bg-emerald-50 dark:bg-emerald-950/60',
      table: 'personal' as NombreTabla,
    },
    {
      label: 'Cursos Activos',
      value: stats?.cursos,
      icon: <School className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      bgIcon: 'bg-indigo-50 dark:bg-indigo-950/60',
      table: 'cursos' as NombreTabla,
    },
    {
      label: 'Materias Curriculares',
      value: stats?.materias,
      icon: <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      bgIcon: 'bg-purple-50 dark:bg-purple-950/60',
      table: 'materias' as NombreTabla,
    },
    {
      label: 'Responsables / Tutores',
      value: stats?.responsables,
      icon: <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      bgIcon: 'bg-amber-50 dark:bg-amber-950/60',
      table: 'responsables' as NombreTabla,
    },
    {
      label: 'Roles Institucionales',
      value: stats?.roles,
      icon: <Award className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
      bgIcon: 'bg-rose-50 dark:bg-rose-950/60',
      table: 'roles' as NombreTabla,
    },
    {
      label: 'Domicilios Registrados',
      value: stats?.domicilios,
      icon: <MapPin className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />,
      bgIcon: 'bg-cyan-50 dark:bg-cyan-950/60',
      table: 'domicilios' as NombreTabla,
    },
    {
      label: 'Proyectos Conectados',
      value: stats?.proyectos || 1,
      icon: <ExternalLink className="h-6 w-6 text-slate-600 dark:text-slate-400" />,
      bgIcon: 'bg-slate-100 dark:bg-zinc-800',
      link: 'https://hung-nicolas.github.io/GIE/',
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          Panel General de Estadísticas
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Resumen consolidado de registros maestros en la base de datos escolar.
        </p>
      </div>

      {isError && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          No se pudieron cargar las estadísticas en tiempo real del servidor.
        </div>
      )}

      {/* Grid de 8 tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (item.table) setTabla(item.table);
              else if (item.link) window.open(item.link, '_blank');
            }}
            role="button"
            tabIndex={0}
            className="group relative flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-brand-500 cursor-pointer text-left select-none"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.bgIcon}`}>
              {item.icon}
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-500 dark:text-zinc-400">
                {item.label}
              </span>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <span className="text-2xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors dark:text-zinc-100 dark:group-hover:text-brand-400">
                  {item.value ?? 0}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
