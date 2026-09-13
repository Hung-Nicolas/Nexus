import { create } from 'zustand';
import { UsuarioPerfil } from '../types/entidades';
import { apiGetMe, apiLogin, apiLogout, getRefreshToken } from '../api/client';

interface AuthState {
  perfil: UsuarioPerfil | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  
  // Acciones
  iniciarSesion: (email: string, password: string) => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
  restaurarSesion: () => Promise<void>;
  limpiarError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  perfil: null,
  status: 'idle',
  error: null,

  iniciarSesion: async (email: string, password: string) => {
    set({ status: 'loading', error: null });
    try {
      const tokenRes = await apiLogin(email, password);
      let usuario = tokenRes.usuario;

      if (!usuario) {
        const meRes = await apiGetMe();
        usuario = meRes.usuario;
      }

      const perfil: UsuarioPerfil = {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
      };

      set({ perfil, status: 'authenticated', error: null });
      return true;
    } catch (err: any) {
      let mensaje = 'Error al iniciar sesión';
      if (err.response?.status === 401) {
        mensaje = 'Email o contraseña incorrectos.';
      } else if (err.code === 'ECONNABORTED' || !err.response) {
        mensaje = 'No se pudo conectar con el servidor. Verifique su conexión.';
      } else if (err.response?.data?.message) {
        mensaje = err.response.data.message;
      }

      set({ status: 'unauthenticated', error: mensaje, perfil: null });
      return false;
    }
  },

  cerrarSesion: async () => {
    try {
      await apiLogout();
    } catch {
      // noop
    } finally {
      set({ perfil: null, status: 'unauthenticated', error: null });
    }
  },

  restaurarSesion: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      set({ status: 'unauthenticated', perfil: null });
      return;
    }

    set({ status: 'loading' });
    try {
      const { usuario } = await apiGetMe();
      if (usuario) {
        set({
          perfil: {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol,
          },
          status: 'authenticated',
          error: null,
        });
      } else {
        set({ status: 'unauthenticated', perfil: null });
      }
    } catch {
      set({ status: 'unauthenticated', perfil: null });
    }
  },

  limpiarError: () => set({ error: null }),
}));

if (import.meta.env.DEV) {
  (window as any).__nexusAuthStore = useAuthStore;
}
