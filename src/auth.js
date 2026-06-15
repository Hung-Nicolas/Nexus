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
    return;
  }
  _cargandoPerfil = true;
  try {
    const { data, error } = await withTimeout(
      supabase.from('perfiles').select('*').eq('id', user.id).single(),
      10000,
      'cargarPerfil timeout'
    );

    if (error || !data) {
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

  // 1. Primero verificar si ya hay sesión activa
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await cargarPerfil(session.user);
    return _perfil;
  }

  // 2. No hay sesión → llamar signInWithPassword con timeout
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Servidor lento o sin conexión. Reintentá en unos segundos.'));
    }, 10000);
  });

  const authPromise = supabase.auth.signInWithPassword({ email, password });

  try {
    const result = await Promise.race([authPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    const { data, error } = result;

    if (error) {
      throw error;
    }

    await cargarPerfil(data.user);
    return _perfil;
  } catch (err) {
    clearTimeout(timeoutId);
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
  try {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      8000,
      'getSession timeout'
    );

    if (!session?.user) {
      limpiarPerfilCache();
      notify('signed_out', null);
      return null;
    }

    await cargarPerfil(session.user);

    return _perfil;
  } catch (err) {
    limpiarPerfilCache();
    notify('signed_out', null);
    return null;
  }
}

supabase.auth.onAuthStateChange(async (event, session) => {
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
