import {
  apiLogin,
  apiLogout,
  apiGetMe,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  getRefreshToken,
} from './lib/api.js';

// Estado
let _perfil = null;
let _callbacks = [];
let _cargandoPerfil = false;
const PERFIL_CACHE_KEY = 'nexus-perfil-cache';

export function getPerfil() { return _perfil; }

export function onAuthChange(cb) {
  _callbacks.push(cb);
  return () => { _callbacks = _callbacks.filter(c => c !== cb); };
}

function guardarPerfilCache(perfil) {
  try {
    localStorage.setItem(PERFIL_CACHE_KEY, JSON.stringify(perfil));
  } catch (e) { /* noop */ }
}

function leerPerfilCache() {
  try {
    const raw = localStorage.getItem(PERFIL_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function limpiarPerfilCache() {
  try {
    localStorage.removeItem(PERFIL_CACHE_KEY);
  } catch (e) { /* noop */ }
}

function notify(estado, perfil) {
  _callbacks.forEach(cb => cb(estado, perfil));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (timeout ${ms}ms)`)), ms)
    ),
  ]);
}

async function cargarPerfil() {
  if (_cargandoPerfil) return;
  _cargandoPerfil = true;

  try {
    const { usuario } = await withTimeout(
      apiGetMe(),
      10000,
      'cargarPerfil timeout'
    );

    if (!usuario) {
      _perfil = null;
      limpiarPerfilCache();
      notify('signed_out', null);
      return;
    }

    _perfil = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
    };

    guardarPerfilCache(_perfil);
    notify('signed_in', _perfil);
  } catch (err) {
    _perfil = null;
    limpiarPerfilCache();
    notify('signed_out', null);
  } finally {
    _cargandoPerfil = false;
  }
}

// ========== AUTH BASICO ==========

export async function iniciarSesion(email, password) {
  // 1. Si ya hay sesión activa, intentar restaurar
  if (getRefreshToken()) {
    const perfil = await restaurarSesion();
    if (perfil) return perfil;
    // Si el refresh falló, limpiar y continuar con login
    clearTokens();
  }

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Servidor lento o sin conexión. Reintentá en unos segundos.'));
    }, 10000);
  });

  try {
    const result = await Promise.race([apiLogin(email, password), timeoutPromise]);
    clearTimeout(timeoutId);

    setAccessToken(result.accessToken);
    setRefreshToken(result.refreshToken);

    _perfil = {
      id: result.usuario.id,
      email: result.usuario.email,
      nombre: result.usuario.nombre,
      apellido: result.usuario.apellido,
      rol: result.usuario.rol,
    };

    guardarPerfilCache(_perfil);
    notify('signed_in', _perfil);
    return _perfil;
  } catch (err) {
    clearTimeout(timeoutId);
    clearTokens();
    throw err;
  }
}

export async function cerrarSesion() {
  try {
    await apiLogout();
  } catch (err) {
    console.error('[Nexus] Error al cerrar sesión:', err);
  } finally {
    _perfil = null;
    clearTokens();
    limpiarPerfilCache();
    notify('signed_out', null);
  }
}

export async function restaurarSesion() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    const cache = leerPerfilCache();
    if (cache) {
      // Mostrar cache mientras refrescamos silenciosamente
      _perfil = cache;
    }
    limpiarPerfilCache();
    notify('signed_out', null);
    return null;
  }

  try {
    await withTimeout(
      cargarPerfil(),
      8000,
      'restaurarSesion timeout'
    );
    return _perfil;
  } catch (err) {
    clearTokens();
    limpiarPerfilCache();
    notify('signed_out', null);
    return null;
  }
}

// Nota: el frontend de Nexus es de solo lectura.
// La gestión de usuarios (crear, eliminar, cambiar contraseñas)
// se realiza desde el backend o directamente en la base de datos.
