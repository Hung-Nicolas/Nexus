import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  School,
  BookOpen,
  Award,
  MapPin,
  Info,
  ExternalLink,
  LogOut,
  X,
} from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { UserBadge } from './UserBadge';
import { NombreTabla } from '../../types/entidades';
import { cn } from '../../lib/utils';
import nexusLogo from '../../assets/Nexus_logo.png';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isTable?: boolean;
  table?: NombreTabla;
  section?: 'dashboard' | 'info';
}

export const Sidebar: React.FC = () => {
  const {
    seccionActual,
    tablaActual,
    setSeccion,
    setTabla,
    sidebarMobileAbierto,
    setSidebarMobile,
    abrirModalLogout,
  } = useUIStore();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      section: 'dashboard',
    },
    {
      id: 'alumnos',
      label: 'Alumnos',
      icon: <GraduationCap className="h-4 w-4" />,
      isTable: true,
      table: 'alumnos',
    },
    {
      id: 'responsables',
      label: 'Responsables',
      icon: <Users className="h-4 w-4" />,
      isTable: true,
      table: 'responsables',
    },
    {
      id: 'personal',
      label: 'Personal',
      icon: <UserCheck className="h-4 w-4" />,
      isTable: true,
      table: 'personal',
    },
    {
      id: 'cursos',
      label: 'Cursos',
      icon: <School className="h-4 w-4" />,
      isTable: true,
      table: 'cursos',
    },
    {
      id: 'materias',
      label: 'Materias',
      icon: <BookOpen className="h-4 w-4" />,
      isTable: true,
      table: 'materias',
    },
    {
      id: 'roles',
      label: 'Roles',
      icon: <Award className="h-4 w-4" />,
      isTable: true,
      table: 'roles',
    },
    {
      id: 'domicilios',
      label: 'Domicilios',
      icon: <MapPin className="h-4 w-4" />,
      isTable: true,
      table: 'domicilios',
    },
    {
      id: 'info',
      label: 'Acerca de',
      icon: <Info className="h-4 w-4" />,
      section: 'info',
    },
  ];

  const handleItemClick = (item: NavItem) => {
    if (item.isTable && item.table) {
      setTabla(item.table);
    } else if (item.section) {
      setSeccion(item.section);
    }
  };

  return (
    <>
      {/* Overlay para móvil */}
      {sidebarMobileAbierto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 dark:bg-zinc-950 dark:border-zinc-800',
          sidebarMobileAbierto ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header con Marca */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <img src={nexusLogo} alt="Nexus" className="h-8 w-8 object-contain" />
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-zinc-100">
                Nexus
              </span>
              <span className="block text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                Base de Datos Escolar
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarMobile(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80">
          <UserBadge />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Navegación
          </p>

          {navItems.map((item) => {
            const isActive =
              (item.section && seccionActual === item.section) ||
              (item.isTable && seccionActual === 'buscador' && tablaActual === item.table);

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                  isActive
                    ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                <span className={cn(isActive ? 'text-brand-700 dark:text-brand-400' : 'text-slate-400 dark:text-zinc-500')}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}

          <div className="pt-4">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Proyectos Conectados
            </p>
            <a
              href="https://hung-nicolas.github.io/GIE/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                <span>GIE</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono dark:bg-zinc-800 dark:text-zinc-400">
                EXT
              </span>
            </a>
          </div>
        </nav>

        {/* Footer con Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            onClick={abrirModalLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
