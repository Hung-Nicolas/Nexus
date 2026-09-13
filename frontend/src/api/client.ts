import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { TokenResponse, BuscarParams, BuscarResponse, OpcionesFiltrosResponse } from '../types/api';
import { StatsData, UsuarioPerfil, NombreTabla } from '../types/entidades';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const REFRESH_TOKEN_KEY = 'nexus-refresh-token';

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export function setAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setRefreshToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignorar errores de localStorage deshabilitado
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearTokens() {
  memoryAccessToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // noop
  }
}

// Interceptor de Request: agrega JWT si existe
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (memoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${memoryAccessToken}`;
  }
  return config;
});

// Interceptor de Response: refresco automático de token en caso de 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si es un 401 y no es ya una reintentada de login/refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const storedRefreshToken = getRefreshToken();

      if (!storedRefreshToken) {
        clearTokens();
        return Promise.reject(error);
      }

      try {
        // Mutex: compartir una sola promesa de refresco para todas las peticiones concurrentes
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              const res = await axios.post<TokenResponse>(`${API_URL}/auth/refresh`, {
                refreshToken: storedRefreshToken,
              });

              const { accessToken, refreshToken } = res.data;
              if (accessToken) {
                setAccessToken(accessToken);
                if (refreshToken) setRefreshToken(refreshToken);
                return accessToken;
              }
              return null;
            } catch {
              clearTokens();
              return null;
            } finally {
              refreshPromise = null;
            }
          })();
        }

        const newAccessToken = await refreshPromise;
        if (newAccessToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        clearTokens();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// ========== MÉTODOS DE LA API ==========

export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', { email, password });
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
  }
  return data;
}

export async function apiLogout(): Promise<void> {
  const storedRefreshToken = getRefreshToken();
  try {
    if (storedRefreshToken) {
      await apiClient.post('/auth/logout', { refreshToken: storedRefreshToken });
    }
  } finally {
    clearTokens();
  }
}

export async function apiGetMe(): Promise<{ usuario: UsuarioPerfil }> {
  const { data } = await apiClient.get<{ usuario: UsuarioPerfil }>('/auth/me');
  return data;
}

export async function apiStats(): Promise<{ stats: StatsData }> {
  const { data } = await apiClient.get<{ stats: StatsData }>('/stats');
  return data;
}

export async function apiBuscar<T = Record<string, unknown>>(
  tabla: NombreTabla,
  params: BuscarParams = {}
): Promise<BuscarResponse<T>> {
  const queryParams = new URLSearchParams();
  if (params.termino) queryParams.set('term', params.termino);
  if (params.limite) queryParams.set('limite', String(params.limite));

  if (params.filtros) {
    Object.entries(params.filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        queryParams.set(k, String(v));
      }
    });
  }

  const { data } = await apiClient.get<BuscarResponse<T>>(`/buscar/${tabla}?${queryParams.toString()}`);
  return data;
}

export async function apiDetalle<T = Record<string, unknown>>(
  tabla: NombreTabla,
  campo: string,
  id: string | number
): Promise<{ data: T }> {
  const { data } = await apiClient.get<{ data: T }>(`/registros/${tabla}/${campo}/${id}`);
  return data;
}

export async function apiOpcionesFiltros(tabla: string): Promise<OpcionesFiltrosResponse> {
  const { data } = await apiClient.get<OpcionesFiltrosResponse>(`/tablas/${tabla}/opciones-filtros`);
  return data;
}
