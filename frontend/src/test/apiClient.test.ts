import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  apiLogin,
  apiLogout,
  apiGetMe,
  apiStats,
  apiBuscar,
  apiDetalle,
  apiOpcionesFiltros,
  apiClient,
} from '../api/client';

describe('API Client & Token Management', () => {
  beforeEach(() => {
    clearTokens();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('gestiona tokens de acceso en memoria correctamente', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('jwt-access-token-123');
    expect(getAccessToken()).toBe('jwt-access-token-123');
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it('gestiona tokens de refresco en localStorage correctamente', () => {
    expect(getRefreshToken()).toBeNull();
    setRefreshToken('refresh-token-456');
    expect(getRefreshToken()).toBe('refresh-token-456');
    expect(localStorage.getItem('nexus-refresh-token')).toBe('refresh-token-456');

    setRefreshToken(null);
    expect(getRefreshToken()).toBeNull();
  });

  it('apiLogin almacena access y refresh token tras respuesta exitosa', async () => {
    const mockResponse = {
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        usuario: {
          id: 'uuid-1',
          email: 'regente@nexus.local',
          nombre: 'Juan',
          apellido: 'Perez',
          rol: 'regente',
        },
      },
    };

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResponse);

    const result = await apiLogin('regente@nexus.local', 'password');

    expect(result.accessToken).toBe('new-access-token');
    expect(getAccessToken()).toBe('new-access-token');
    expect(getRefreshToken()).toBe('new-refresh-token');
  });

  it('apiLogout limpia tokens en memoria y en localStorage', async () => {
    setAccessToken('token-a-borrar');
    setRefreshToken('refresh-a-borrar');

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: {} });

    await apiLogout();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('nexus-refresh-token')).toBeNull();
  });

  it('apiGetMe obtiene perfil del usuario autenticado', async () => {
    const mockMe = {
      usuario: {
        id: 'uuid-1',
        email: 'regente@nexus.local',
        nombre: 'Admin',
        apellido: 'Regente',
        rol: 'regente',
      },
    };
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockMe });

    const res = await apiGetMe();
    expect(res.usuario.email).toBe('regente@nexus.local');
  });

  it('apiStats retorna estadísticas de tablas', async () => {
    const mockStats = {
      stats: {
        alumnos: 450,
        personal: 65,
        cursos: 18,
        materias: 32,
      },
    };
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockStats });

    const res = await apiStats();
    expect(res.stats.alumnos).toBe(450);
  });

  it('apiBuscar construye query params adecuadamente', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { data: [{ id: 1, nombre: 'Juan' }], total: 1 },
    });

    await apiBuscar('alumnos', {
      termino: 'Perez',
      limite: 25,
      filtros: { turno: 'Mañana' },
    });

    expect(getSpy).toHaveBeenCalledWith(
      expect.stringContaining('/buscar/alumnos?term=Perez&limite=25&turno=Ma%C3%B1ana')
    );
  });

  it('apiDetalle consulta registro individual por id', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { data: { id: 'uuid-10', nombre: 'Carlos' } },
    });

    const res = await apiDetalle('alumnos', 'id', 'uuid-10');
    expect(getSpy).toHaveBeenCalledWith('/registros/alumnos/id/uuid-10');
    expect(res.data.nombre).toBe('Carlos');
  });

  it('apiOpcionesFiltros consulta opciones para una tabla', async () => {
    const mockOpciones = {
      tabla: 'cursos',
      opciones: {
        'cursos.especialidad': ['Computación', 'Automotores'],
      },
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockOpciones,
    });

    const res = await apiOpcionesFiltros('cursos');
    expect(getSpy).toHaveBeenCalledWith('/tablas/cursos/opciones-filtros');
    expect(res.opciones['cursos.especialidad']).toContain('Computación');
  });
});
