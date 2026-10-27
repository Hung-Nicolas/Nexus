import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';
import * as apiClient from '../api/client';

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      perfil: null,
      status: 'idle',
      error: null,
      esModoDemo: false,
    });
  });

  it('inicia sesion demo correctamente', () => {
    useAuthStore.getState().iniciarSesionDemo();

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.esModoDemo).toBe(true);
    expect(state.perfil?.email).toBe('regente@nexus.local');
    expect(state.perfil?.rol).toBe('regente');
  });

  it('inicia sesion regular con éxito vía apiLogin', async () => {
    vi.spyOn(apiClient, 'apiLogin').mockResolvedValueOnce({
      accessToken: 'token-abc',
      refreshToken: 'refresh-xyz',
      usuario: {
        id: 'usr-1',
        email: 'docente@nexus.local',
        nombre: 'Maria',
        apellido: 'Lopez',
        rol: 'docente',
      },
    });

    const success = await useAuthStore.getState().iniciarSesion('docente@nexus.local', 'pass123');

    expect(success).toBe(true);
    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.perfil?.nombre).toBe('Maria');
    expect(state.error).toBeNull();
  });

  it('maneja errores de credenciales incorrectas en iniciarSesion', async () => {
    const error401: any = new Error('Unauthorized');
    error401.response = { status: 401 };
    vi.spyOn(apiClient, 'apiLogin').mockRejectedValueOnce(error401);

    const success = await useAuthStore.getState().iniciarSesion('docente@nexus.local', 'wrong');

    expect(success).toBe(false);
    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.perfil).toBeNull();
    expect(state.error).toBe('Email o contraseña incorrectos.');
  });

  it('cerrarSesion resetea perfil y status', async () => {
    useAuthStore.getState().iniciarSesionDemo();
    vi.spyOn(apiClient, 'apiLogout').mockResolvedValueOnce();

    await useAuthStore.getState().cerrarSesion();

    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.perfil).toBeNull();
  });

  it('limpiarError borra el error almacenado', () => {
    useAuthStore.setState({ error: 'Algún error' });
    useAuthStore.getState().limpiarError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
