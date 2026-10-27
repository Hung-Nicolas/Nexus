import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../stores/useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      seccionActual: 'dashboard',
      tablaActual: 'alumnos',
      modoVista: 'table',
      tema: 'light',
      terminoBusqueda: '',
      filtrosActuales: {},
      sidebarMobileAbierto: false,
      registroSeleccionado: null,
      modalLogoutAbierto: false,
    });
  });

  it('permite cambiar de sección', () => {
    useUIStore.getState().setSeccion('buscador');
    expect(useUIStore.getState().seccionActual).toBe('buscador');
    expect(useUIStore.getState().sidebarMobileAbierto).toBe(false);
  });

  it('permite cambiar de tabla y resetea filtros y término de búsqueda', () => {
    useUIStore.setState({
      terminoBusqueda: 'busqueda previa',
      filtrosActuales: { curso: '1' },
    });

    useUIStore.getState().setTabla('materias');

    const state = useUIStore.getState();
    expect(state.tablaActual).toBe('materias');
    expect(state.seccionActual).toBe('buscador');
    expect(state.terminoBusqueda).toBe('');
    expect(state.filtrosActuales).toEqual({});
  });

  it('alterna el tema entre light y dark actualizando el DOM y localStorage', () => {
    expect(useUIStore.getState().tema).toBe('light');

    useUIStore.getState().toggleTema();
    expect(useUIStore.getState().tema).toBe('dark');
    expect(localStorage.getItem('nexus-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useUIStore.getState().toggleTema();
    expect(useUIStore.getState().tema).toBe('light');
    expect(localStorage.getItem('nexus-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('asigna y elimina filtros dinámicos', () => {
    useUIStore.getState().setFiltro('especialidad', 'Computación');
    expect(useUIStore.getState().filtrosActuales).toEqual({ especialidad: 'Computación' });

    // Quitar filtro pasando undefined o string vacío
    useUIStore.getState().setFiltro('especialidad', '');
    expect(useUIStore.getState().filtrosActuales).toEqual({});
  });

  it('gestiona modal de detalle de registro', () => {
    const mockRow = { id: 1, nombre: 'Ana' };
    useUIStore.getState().abrirModalDetalle('alumnos', mockRow);

    expect(useUIStore.getState().registroSeleccionado).toEqual({
      tabla: 'alumnos',
      row: mockRow,
    });

    useUIStore.getState().cerrarModalDetalle();
    expect(useUIStore.getState().registroSeleccionado).toBeNull();
  });

  it('gestiona modal de logout', () => {
    expect(useUIStore.getState().modalLogoutAbierto).toBe(false);
    useUIStore.getState().abrirModalLogout();
    expect(useUIStore.getState().modalLogoutAbierto).toBe(true);
    useUIStore.getState().cerrarModalLogout();
    expect(useUIStore.getState().modalLogoutAbierto).toBe(false);
  });
});
