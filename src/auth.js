import { supabase } from './lib/supabase.js';

// Estado
let _perfil = null;
let _callbacks = [];

export function getPerfil() { return _perfil; }

export function onAuthChange(cb) {
  _callbacks.push(cb);
  return () => {
    _callbacks = _callbacks.filter(c => c !== cb);
  };
}

function notify(estado, perfil) {
  _callbacks.forEach(cb => cb(estado, perfil));
}

// Login
export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await cargarPerfil(data.user.id);
  return _perfil;
}

// Registro
export async function registrarUsuario(email, password, nombre, apellido) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, apellido, rol: 'viewer' }
    }
  });
  if (error) throw error;
  return data.user;
}

// Logout
export async function cerrarSesion() {
  await supabase.auth.signOut();
  _perfil = null;
  notify('signed_out', null);
}

// Cargar perfil desde tabla perfiles
async function cargarPerfil(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    _perfil = null;
    notify('signed_out', null);
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
}

// Restaurar sesión al cargar la página
export async function restaurarSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    notify('signed_out', null);
    return null;
  }
  await cargarPerfil(session.user.id);
  return _perfil;
}

// Escuchar cambios de auth en tiempo real
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    await cargarPerfil(session.user.id);
  } else if (event === 'SIGNED_OUT') {
    _perfil = null;
    notify('signed_out', null);
  }
});
