import { create } from 'zustand';
import { NombreTabla } from '../types/entidades';

export type SeccionApp = 'dashboard' | 'buscador' | 'info';
export type ModoVista = 'table' | 'cards';
export type TemaApp = 'light' | 'dark';

interface UIState {
  seccionActual: SeccionApp;
  tablaActual: NombreTabla;
  modoVista: ModoVista;
  tema: TemaApp;
  terminoBusqueda: string;
  filtrosActuales: Record<string, string | number>;
  sidebarMobileAbierto: boolean;
  
  // Registro seleccionado para modal detalle
  registroSeleccionado: { tabla: NombreTabla; row: Record<string, any> } | null;
  modalLogoutAbierto: boolean;

  // Acciones
  setSeccion: (seccion: SeccionApp) => void;
  setTabla: (tabla: NombreTabla) => void;
  setModoVista: (modo: ModoVista) => void;
  toggleTema: () => void;
  setTerminoBusqueda: (term: string) => void;
  setFiltro: (key: string, value: string | number | undefined) => void;
  limpiarFiltros: () => void;
  setSidebarMobile: (abierto: boolean) => void;
  abrirModalDetalle: (tabla: NombreTabla, row: Record<string, any>) => void;
  cerrarModalDetalle: () => void;
  abrirModalLogout: () => void;
  cerrarModalLogout: () => void;
}

export const useUIStore = create<UIState>((set) => {
  // Inicializar tema desde localStorage o preferencia del sistema
  const temaGuardado = (localStorage.getItem('nexus-theme') as TemaApp) || 'light';
  if (temaGuardado === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    seccionActual: 'dashboard',
    tablaActual: 'alumnos',
    modoVista: 'table',
    tema: temaGuardado,
    terminoBusqueda: '',
    filtrosActuales: {},
    sidebarMobileAbierto: false,
    registroSeleccionado: null,
    modalLogoutAbierto: false,

    setSeccion: (seccion) => set({ seccionActual: seccion, sidebarMobileAbierto: false }),
    
    setTabla: (tabla) =>
      set({
        tablaActual: tabla,
        seccionActual: 'buscador',
        filtrosActuales: {},
        terminoBusqueda: '',
        sidebarMobileAbierto: false,
      }),

    setModoVista: (modo) => set({ modoVista: modo }),

    toggleTema: () =>
      set((state) => {
        const nuevoTema: TemaApp = state.tema === 'light' ? 'dark' : 'light';
        localStorage.setItem('nexus-theme', nuevoTema);
        if (nuevoTema === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { tema: nuevoTema };
      }),

    setTerminoBusqueda: (termino) => set({ terminoBusqueda: termino }),

    setFiltro: (key, value) =>
      set((state) => {
        const nuevos = { ...state.filtrosActuales };
        if (value === undefined || value === '') {
          delete nuevos[key];
        } else {
          nuevos[key] = value;
        }
        return { filtrosActuales: nuevos };
      }),

    limpiarFiltros: () => set({ filtrosActuales: {}, terminoBusqueda: '' }),

    setSidebarMobile: (abierto) => set({ sidebarMobileAbierto: abierto }),

    abrirModalDetalle: (tabla, row) => set({ registroSeleccionado: { tabla, row } }),
    cerrarModalDetalle: () => set({ registroSeleccionado: null }),

    abrirModalLogout: () => set({ modalLogoutAbierto: true }),
    cerrarModalLogout: () => set({ modalLogoutAbierto: false }),
  };
});

if (import.meta.env.DEV) {
  (window as any).__nexusUIStore = useUIStore;
}
