-- ============================================================
-- NEXUS - Sistema de usuarios y autenticación
-- Agrega tabla perfiles vinculada a auth.users de Supabase
-- ============================================================

-- Tabla de perfiles de usuario (vinculada 1:1 con auth.users)
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'viewer' CHECK (rol IN ('admin', 'viewer')),
    activo BOOLEAN DEFAULT TRUE,
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

DROP POLICY IF EXISTS "perfiles_update_own" ON public.perfiles;
CREATE POLICY "perfiles_update_own"
    ON public.perfiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin')
    WITH CHECK (id = auth.uid() OR (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin');

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario'),
        COALESCE(new.raw_user_meta_data->>'apellido', 'Nuevo'),
        COALESCE(new.raw_user_meta_data->>'rol', 'viewer'),
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger si no existe
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
-- NOTA: Configuración recomendada en Supabase Dashboard
-- ============================================================
-- 1. Authentication → Providers → Email → Desactivar "Confirm email"
--    (para facilitar registro de usuarios sin verificación)
-- 2. Authentication → URL Configuration → Site URL:
--    http://localhost:5173 (desarrollo) o tu dominio (prod)
--
-- Para crear el primer usuario admin, registrarse vía la app
-- y luego ejecutar:
-- UPDATE public.perfiles SET rol = 'admin' WHERE email = 'tu-email';
