import { supabase } from './lib/supabase.js';

// Estado
let _perfil = null;
const _callbacks = [];
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
  console.log('[Nexus Debug] notify → estado:', estado, '| perfil:', perfil ? perfil.email : null);
  _callbacks.forEach(cb => cb(estado, perfil));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (timeout ${ms}ms)`)), ms)
    )
  ]);
}

async function cargarPerfil(user) {
  if (_cargandoPerfil) {
    console.log('[Nexus Debug] cargarPerfil ya en progreso, ignorando duplicado');
    return;
  }
  _cargandoPerfil = true;
  console.log('[Nexus Debug] cargarPerfil iniciado para user.id:', user.id);
  try {
    const t0 = performance.now();
    const { data, error } = await withTimeout(
      supabase.from('perfiles').select('*').eq('id', user.id).single(),
      10000,
      'cargarPerfil timeout'
    );
    const t1 = performance.now();
    console.log(`[Nexus Debug] cargarPerfil respondió en ${Math.round(t1 - t0)}ms → data:`, data, '| error:', error);

    if (error || !data) {
      console.warn('[Nexus Debug] cargarPerfil sin perfil válido. Error:', error?.message || 'sin datos');
      _perfil = null;
      limpiarPerfilCache();
      notify('signed_out', null);
      return;
    }

    _perfil = {
      id: data.id,
      email: data.email,
      nombre: data.nombre,
      apellido: data.apellido,
      rol: data.rol,
    };

    guardarPerfilCache(_perfil);
    console.log('[Nexus Debug] cargarPerfil exitoso, perfil:', _perfil);
    notify('signed_in', _perfil);
  } catch (err) {
    console.warn('[Nexus Debug] cargarPerfil excepción/timeout:', err.message);
    _perfil = null;
    limpiarPerfilCache();
    notify('signed_out', null);
  } finally {
    _cargandoPerfil = false;
  }
}

// ========== AUTH BASICO ==========

export async function iniciarSesion(email, password) {
  console.log('[Nexus Debug] iniciarSesion llamado con email:', email);

  // 1. Primero verificar si ya hay sesión activa
  console.log('[Nexus Debug] Verificando sesión existente...');
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    console.log('[Nexus Debug] Sesión existente encontrada, saltando signInWithPassword');
    await cargarPerfil(session.user);
    return _perfil;
  }

  // 2. No hay sesión → llamar signInWithPassword con timeout
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error('[Nexus Debug] TIMEOUT: signInWithPassword no respondió en 10s');
      reject(new Error('Servidor lento o sin conexión. Reintentá en unos segundos.'));
    }, 10000);
  });

  console.log('[Nexus Debug] Llamando signInWithPassword...');
  const t0 = performance.now();
  const authPromise = supabase.auth.signInWithPassword({ email, password });

  try {
    const result = await Promise.race([authPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    const t1 = performance.now();
    console.log('[Nexus Debug] signInWithPassword respondió en', Math.round(t1 - t0), 'ms');
    console.log('[Nexus Debug] Resultado:', result);

    const { data, error } = result;

    if (error) {
      console.error('[Nexus Debug] signInWithPassword devolvió error:', error);
      throw error;
    }

    console.log('[Nexus Debug] signInWithPassword OK. user.id:', data?.user?.id);
    await cargarPerfil(data.user);
    console.log('[Nexus Debug] iniciarSesion terminó OK, perfil:', _perfil);
    return _perfil;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[Nexus Debug] iniciarSesion lanzó error:', err);
    throw err;
  }
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  _perfil = null;
  limpiarPerfilCache();
  notify('signed_out', null);
}

export async function restaurarSesion() {
  console.log('[Nexus Debug] restaurarSesion iniciado');
  try {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      8000,
      'getSession timeout'
    );
    console.log('[Nexus Debug] getSession → session:', session ? 'presente' : 'null');

    if (!session?.user) {
      console.log('[Nexus Debug] No hay sesión activa');
      limpiarPerfilCache();
      notify('signed_out', null);
      return null;
    }

    console.log('[Nexus Debug] Sesión activa encontrada, user.id:', session.user.id);
    await cargarPerfil(session.user);

    return _perfil;
  } catch (err) {
    console.warn('[Nexus Debug] restaurarSesion error/timeout:', err.message);
    limpiarPerfilCache();
    notify('signed_out', null);
    return null;
  }
}

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('[Nexus Debug] onAuthStateChange → event:', event, '| session:', session ? 'presente' : 'null');
  // Solo manejar SIGNED_OUT aquí. El inicio lo maneja restaurarSesion() en app.js
  // para evitar doble ejecución de cargarPerfil.
  if (event === 'SIGNED_OUT') {
    _perfil = null;
    _cargandoPerfil = false;
    limpiarPerfilCache();
    notify('signed_out', null);
  }
});

// Nota: el frontend de Nexus es de solo lectura.
// La gestión de usuarios (crear, eliminar, cambiar contraseñas)
// se realiza desde Supabase Dashboard, no desde la app.
