-- ============================================================
-- NEXUS - Sistema de usuarios (cerrado, solo regentes)
-- ============================================================

-- Tabla de perfiles de usuario (vinculada 1:1 con auth.users)
-- Solo existe el rol 'regente' porque el sistema es cerrado
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'regente' CHECK (rol = 'regente'),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- RLS para perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_all" ON public.perfiles;
CREATE POLICY "perfiles_select_all"
    ON public.perfiles FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "perfiles_insert_trigger" ON public.perfiles;
CREATE POLICY "perfiles_insert_trigger"
    ON public.perfiles FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "perfiles_update_regente" ON public.perfiles;
CREATE POLICY "perfiles_update_regente"
    ON public.perfiles FOR UPDATE
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Sin'),
        COALESCE(new.raw_user_meta_data->>'apellido', 'Nombre'),
        'regente'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_nexus'
    ) THEN
        CREATE TRIGGER on_auth_user_created_nexus
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$$;

-- ============================================================
-- FUNCIONES RPC (solo para regentes)
-- ============================================================

-- Listar todos los usuarios (auth.users + perfiles)
DROP FUNCTION IF EXISTS public.listar_usuarios_completos();
CREATE OR REPLACE FUNCTION public.listar_usuarios_completos()
RETURNS TABLE(
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    nombre TEXT,
    apellido TEXT,
    rol TEXT,
    tiene_perfil BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.created_at,
    COALESCE(p.nombre, 'Sin')::TEXT as nombre,
    COALESCE(p.apellido, 'Nombre')::TEXT as apellido,
    COALESCE(p.rol, 'regente')::TEXT as rol,
    (p.id IS NOT NULL)::BOOLEAN as tiene_perfil
  FROM auth.users u
  LEFT JOIN public.perfiles p ON u.id = p.id
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.listar_usuarios_completos() TO authenticated;

-- Sincronizar perfil para usuario que no lo tiene
DROP FUNCTION IF EXISTS public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.sincronizar_perfil(
    p_id UUID,
    p_email TEXT,
    p_nombre TEXT DEFAULT 'Sin',
    p_apellido TEXT DEFAULT 'Nombre',
    p_rol TEXT DEFAULT 'regente'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol)
    VALUES (p_id, p_email, p_nombre, p_apellido, p_rol)
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        apellido = EXCLUDED.apellido,
        email = EXCLUDED.email,
        rol = EXCLUDED.rol;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Eliminar usuario completamente (auth.users + perfiles via CASCADE)
DROP FUNCTION IF EXISTS public.eliminar_usuario_completo(UUID);
CREATE OR REPLACE FUNCTION public.eliminar_usuario_completo(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- No permitir eliminar el propio usuario
    IF user_id = auth.uid() THEN
        RAISE EXCEPTION 'No podés eliminar tu propio usuario';
    END IF;

    -- Eliminar de auth.users (perfiles se elimina por ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_usuario_completo(UUID) TO authenticated;

-- Cambiar contraseña de cualquier usuario (solo regente)
DROP FUNCTION IF EXISTS public.actualizar_password_usuario(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.actualizar_password_usuario(user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- No permitir cambiar la propia contraseña por este medio (usar Auth de Supabase)
    IF user_id = auth.uid() THEN
        RAISE EXCEPTION 'Usá tu perfil para cambiar tu propia contraseña';
    END IF;

    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')) WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.actualizar_password_usuario(UUID, TEXT) TO authenticated;

-- ============================================================
-- NOTA: Configuración recomendada en Supabase Dashboard
-- ============================================================
-- 1. Authentication → Providers → Email → Desactivar "Confirm email"
--    (para que el regente cree usuarios sin verificación)
-- 2. Authentication → URL Configuration → Site URL: tu dominio
--
-- El primer usuario debe crearse directamente desde Auth → Users
-- o ejecutando signUp desde la consola. Luego ese usuario
-- administra el resto desde la sección "Usuarios" de la app.
