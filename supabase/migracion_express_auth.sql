-- ============================================================
-- NEXUS - Migración a backend Express (auth propia)
-- Supabase se usa únicamente como base de datos PostgreSQL.
--
-- Notas:
-- - Esta migración crea las tablas que reemplazan a auth.users
--   para el acceso de la aplicación Nexus.
-- - La contraseña del usuario regente inicial se hashea con pgcrypto.
-- - En producción se recomienda cambiar la contraseña por defecto
--   y crear usuarios adicionales desde el backend.
-- ============================================================

-- 1. Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'docente' CHECK (rol IN (
        'regente', 'subregente', 'rector', 'vicerector',
        'docente', 'preceptor', 'doe', 'pat', 'cooperadora', 'jefe_de_taller'
    )),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de refresh tokens (revocación y rotación)
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON public.refresh_tokens(id_usuario);

-- 3. Usuario regente inicial (cambiar contraseña en producción)
INSERT INTO public.usuarios (email, password_hash, nombre, apellido, rol)
VALUES (
    'regente@nexus.local',
    crypt('Regente123!', gen_salt('bf', 12)),
    'Regente',
    'Nexus',
    'regente'
)
ON CONFLICT (email) DO NOTHING;
