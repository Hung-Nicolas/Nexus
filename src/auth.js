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

async function cargarPerfil(user) {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('[Nexus] No se pudo cargar el perfil:', error.message);
      _perfil = perfilFallback(user);
      notify('signed_in', _perfil);
      return;
    }

    if (!data) {
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

    notify('signed_in', _perfil);
  } catch (err) {
    console.warn('[Nexus] Error inesperado cargando perfil:', err);
    _perfil = perfilFallback(user);
    notify('signed_in', _perfil);
  }
}

// ========== AUTH BASICO ==========

export async function iniciarSesion(email, password) {
  // Timeout de 10 segundos para evitar que se cuelgue indefinidamente
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Servidor lento o sin conexión. Reintentá en unos segundos.')), 10000)
  );

  const authPromise = supabase.auth.signInWithPassword({ email, password });
  const { data, error } = await Promise.race([authPromise, timeoutPromise]);

  if (error) throw error;
  await cargarPerfil(data.user);
  return _perfil;
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
  _perfil = null;
  notify('signed_out', null);
}

export async function restaurarSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    notify('signed_out', null);
    return null;
  }
  await cargarPerfil(session.user);
  return _perfil;
}

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    await cargarPerfil(session.user);
  } else if (event === 'SIGNED_OUT') {
    _perfil = null;
    notify('signed_out', null);
  }
});

// ========== ADMIN: GESTION DE USUARIOS (solo regentes) ==========

export async function listarUsuarios() {
  // Intentar RPC primero (trae auth.users + perfiles)
  const { data, error } = await supabase.rpc('listar_usuarios_completos');
  if (!error && data) return { data, error: null };

  // Fallback: solo perfiles
  return await supabase.from('perfiles').select('*').order('created_at', { ascending: false });
}

export async function crearUsuario(email, password, nombre, apellido) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, apellido }
    }
  });
  if (error) throw error;
  return data.user;
}

export async function eliminarUsuario(userId) {
  const { error } = await supabase.rpc('eliminar_usuario_completo', { user_id: userId });
  if (error) throw error;
}

export async function cambiarPasswordUsuario(userId, newPassword) {
  const { error } = await supabase.rpc('actualizar_password_usuario', {
    user_id: userId,
    new_password: newPassword
  });
  if (error) throw error;
}

export async function sincronizarPerfil(userId, email, nombre, apellido, activo = true) {
  const { error } = await supabase.rpc('sincronizar_perfil', {
    p_id: userId,
    p_email: email,
    p_nombre: nombre,
    p_apellido: apellido,
    p_rol: 'regente',
    p_activo: activo
  });
  if (error) throw error;
}
