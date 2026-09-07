const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const REFRESH_TOKEN_KEY = 'nexus-refresh-token';

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshToken(token) {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch (e) { /* noop */ }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function clearTokens() {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (e) { /* noop */ }
}

async function doFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No hay sesión activa');
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Sesión expirada');
  }

  const data = await response.json();
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

async function ensureValidToken() {
  if (refreshPromise) {
    await refreshPromise;
    return;
  }

  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  await refreshPromise;
}

export async function apiFetch(endpoint, options = {}) {
  let response = await doFetch(endpoint, options);

  if (response.status === 401 && getRefreshToken()) {
    try {
      await ensureValidToken();
      response = await doFetch(endpoint, options);
    } catch (err) {
      clearTokens();
      throw err;
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Error ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ========== Auth ==========

export async function apiLogin(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogout() {
  const refreshToken = getRefreshToken();
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } finally {
    clearTokens();
  }
}

export async function apiGetMe() {
  return apiFetch('/auth/me');
}

// ========== Buscador ==========

export async function apiBuscar(tabla, { termino, filtros, limite } = {}) {
  const params = new URLSearchParams();
  if (termino) params.set('term', termino);
  if (limite) params.set('limite', String(limite));
  Object.entries(filtros || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return apiFetch(`/buscar/${tabla}${query ? `?${query}` : ''}`);
}

export async function apiDetalle(tabla, campo, id) {
  return apiFetch(`/registros/${tabla}/${campo}/${id}`);
}

export async function apiOpcionesFiltros(tabla) {
  return apiFetch(`/tablas/${tabla}/opciones-filtros`);
}

// ========== Dashboard ==========

export async function apiStats() {
  return apiFetch('/stats');
}
