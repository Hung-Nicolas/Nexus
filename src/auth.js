import { supabase } from './lib/supabase.js';

// Estado
let _perfil = null;
let _callbacks = [];

export function getPerfil() { return _perfil; }

export function onAuthChange(cb) {
  _callbacks.push(cb);
  return () => { _callbacks = _callbacks.filter(c => c !== cb); };
}

function notify(estado, perfil) {
  console.log('[Nexus Debug] notify → estado:', estado, '| perfil:', perfil ? perfil.email : null);
  _callbacks.forEach(cb => cb(estado, perfil));
}

function perfilFallback(user) {
  return {
    id: user.id,
    email: user.email || 'usuario@nexus.com',
    nombre: user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
    apellido: user.user_metadata?.apellido || 'Sin Perfil',
    rol: 'regente',
    activo: true,
  };
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
  console.log('[Nexus Debug] cargarPerfil iniciado para user.id:', user.id);
  try {
    const t0 = performance.now();
    const { data, error } = await withTimeout(
      supabase.from('perfiles').select('*').eq('id', user.id).single(),
      5000,
      'cargarPerfil timeout'
    );
    const t1 = performance.now();
    console.log(`[Nexus Debug] cargarPerfil respondió en ${Math.round(t1 - t0)}ms → data:`, data, '| error:', error);

    if (error) {
      console.warn('[Nexus Debug] cargarPerfil error, usando fallback. Error:', error.message);
      _perfil = perfilFallback(user);
      notify('signed_in', _perfil);
      return;
    }

    if (!data) {
      console.warn('[Nexus Debug] cargarPerfil sin datos, usando fallback');
      _perfil = perfilFallback(user);
      notify('signed_in', _perfil);
      return;
    }

    _perfil = {
      id: data.id,
      email: data.email,
      nombre: data.nombre,
      apellido: data.apellido,
      rol: data.rol,
      activo: data.activo,
    };

    console.log('[Nexus Debug] cargarPerfil exitoso, perfil:', _perfil);
    notify('signed_in', _perfil);
  } catch (err) {
    console.warn('[Nexus Debug] cargarPerfil excepción/timeout:', err.message);
    _perfil = perfilFallback(user);
    notify('signed_in', _perfil);
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
  notify('signed_out', null);
}

export async function restaurarSesion() {
  console.log('[Nexus Debug] restaurarSesion iniciado');
  try {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      5000,
      'getSession timeout'
    );
    console.log('[Nexus Debug] getSession → session:', session ? 'presente' : 'null');

    if (!session?.user) {
      console.log('[Nexus Debug] No hay sesión activa');
      notify('signed_out', null);
      return null;
    }

    console.log('[Nexus Debug] Sesión activa encontrada, user.id:', session.user.id);
    await cargarPerfil(session.user);
    return _perfil;
  } catch (err) {
    console.warn('[Nexus Debug] restaurarSesion error/timeout:', err.message);
    notify('signed_out', null);
    return null;
  }
}

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('[Nexus Debug] onAuthStateChange → event:', event, '| session:', session ? 'presente' : 'null');
  if (event === 'SIGNED_IN' && session?.user) {
    await cargarPerfil(session.user);
  } else if (event === 'SIGNED_OUT') {
    _perfil = null;
    notify('signed_out', null);
  }
});

// ========== ADMIN: GESTION DE USUARIOS (solo regentes) ==========

export async function listarUsuarios() {
  const { data, error } = await supabase.rpc('listar_usuarios_completos');
  if (!error && data) return { data, error: null };
  return await supabase.from('perfiles').select('*').order('created_at', { ascending: false });
}

export async function crearUsuario(email, password, nombre, apellido) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, apellido } }
  });
  if (error) throw error;
  return data.user;
}

export async function eliminarUsuario(userId) {
  const { error } = await supabase.rpc('eliminar_usuario_completo', { user_id: userId });
  if (error) throw error;
}

export async function cambiarPasswordUsuario(userId, newPassword) {
  const { error } = await supabase.rpc('actualizar_password_usuario', { user_id: userId, new_password: newPassword });
  if (error) throw error;
}

export async function sincronizarPerfil(userId, email, nombre, apellido, activo = true) {
  const { error } = await supabase.rpc('sincronizar_perfil', {
    p_id: userId, p_email: email, p_nombre: nombre, p_apellido: apellido, p_rol: 'regente', p_activo: activo
  });
  if (error) throw error;
}
