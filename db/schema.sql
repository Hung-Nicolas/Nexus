-- ============================================================
-- NEXUS - Schema para PostgreSQL local con RLS adaptado
--
-- Este schema reemplaza las dependencias de Supabase Auth
-- (auth.users, auth.role(), auth.uid()) por un esquema local
-- minimo que usa variables de sesion de PostgreSQL.
--
-- El backend (Spring Boot) setea antes de cada query:
--   SET LOCAL app.current_role = 'authenticated' | 'service_role';
--   SET LOCAL app.current_user_id = '<uuid>';
--
-- Requisitos: PostgreSQL 14+ con extension pgcrypto.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. ROLES LOGICOS (simulan los roles de Supabase)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END
$$;

-- ============================================================
-- 3. SCHEMA auth LOCAL
-- ============================================================
CREATE SCHEMA IF NOT EXISTS auth;

-- auth.role() devuelve el rol logico seteado por el backend via app.current_role.
-- Si no hay nada seteado, asume service_role (compatibilidad con queries legacy).
CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
    SELECT COALESCE(current_setting('app.current_role', true), 'service_role');
$$;

-- auth.uid() devuelve el UUID del usuario autenticado seteado por el backend.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- ============================================================
-- 4. TABLAS DE NEGOCIO
-- ============================================================

-- CURSOS
CREATE TABLE IF NOT EXISTS public.cursos (
    id_curso SERIAL PRIMARY KEY,
    anio INTEGER NOT NULL CHECK (anio >= 1 AND anio <= 6),
    division TEXT NOT NULL,
    turno TEXT NOT NULL CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),
    especialidad TEXT CHECK (especialidad IS NULL OR especialidad IN ('Computación', 'Automotores')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT cursos_unicidad UNIQUE (anio, division, turno, especialidad)
);

-- DOMICILIOS
CREATE TABLE IF NOT EXISTS public.domicilios (
    id_domicilio SERIAL PRIMARY KEY,
    calle VARCHAR(50) NOT NULL,
    numero INTEGER NOT NULL CHECK (numero > 0 AND numero <= 99999),
    departamento VARCHAR(5),
    localidad VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ALUMNOS
CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni INTEGER NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT,
    email_padre TEXT,
    telefono TEXT,
    fecha_nacimiento DATE,
    genero TEXT,
    nacionalidad TEXT,
    id_domicilio INTEGER REFERENCES public.domicilios(id_domicilio) ON DELETE SET NULL ON UPDATE CASCADE,
    id_curso INTEGER REFERENCES public.cursos(id_curso) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id_rol SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- PERSONAL
CREATE TABLE IF NOT EXISTS public.personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni INTEGER NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT,
    fecha_nacimiento DATE,
    genero TEXT,
    nacionalidad TEXT,
    id_domicilio INTEGER REFERENCES public.domicilios(id_domicilio) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- PERSONAL_ROL
CREATE TABLE IF NOT EXISTS public.personal_rol (
    id_personal UUID REFERENCES public.personal(id) ON DELETE CASCADE ON UPDATE CASCADE,
    id_rol INTEGER REFERENCES public.roles(id_rol) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (id_personal, id_rol)
);

-- MATERIAS
CREATE TABLE IF NOT EXISTS public.materias (
    id_materia SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- PERSONAL_MATERIA
CREATE TABLE IF NOT EXISTS public.personal_materia (
    id_personal UUID REFERENCES public.personal(id) ON DELETE CASCADE ON UPDATE CASCADE,
    id_materia INTEGER REFERENCES public.materias(id_materia) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (id_personal, id_materia)
);

-- RESPONSABLES
CREATE TABLE IF NOT EXISTS public.responsables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_alumno UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    fecha_nacimiento DATE,
    genero TEXT,
    nacionalidad TEXT,
    vinculo TEXT NOT NULL CHECK (vinculo IN ('padre', 'madre', 'tutor', 'otro')),
    id_domicilio INTEGER REFERENCES public.domicilios(id_domicilio) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- SINCRONIZACIONES
CREATE TABLE IF NOT EXISTS public.sincronizaciones (
    id SERIAL PRIMARY KEY,
    tabla_origen TEXT NOT NULL,
    id_local INTEGER NOT NULL,
    sistema_externo TEXT NOT NULL,
    id_remoto TEXT NOT NULL,
    metadatos JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ,
    UNIQUE (tabla_origen, sistema_externo, id_remoto),
    UNIQUE (tabla_origen, id_local, sistema_externo)
);

-- ============================================================
-- 5. TABLAS DE AUTH PROPIA (reemplaza Supabase Auth para la app)
-- ============================================================
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

-- ============================================================
-- 6. TABLAS DE API GATEWAY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proyectos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL UNIQUE,
    permisos JSONB NOT NULL DEFAULT '[]',
    activo BOOLEAN DEFAULT true,
    descripcion TEXT,
    ip_permitida TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.api_logs (
    id BIGSERIAL PRIMARY KEY,
    proyecto_slug TEXT,
    ip TEXT,
    metodo TEXT,
    tabla TEXT,
    operacion TEXT,
    exito BOOLEAN DEFAULT false,
    error TEXT,
    duracion_ms INTEGER,
    request_body JSONB,
    response_status INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 7. INDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alumnos_id_curso ON public.alumnos(id_curso);
CREATE INDEX IF NOT EXISTS idx_alumnos_id_domicilio ON public.alumnos(id_domicilio);
CREATE INDEX IF NOT EXISTS idx_personal_id_domicilio ON public.personal(id_domicilio);
CREATE INDEX IF NOT EXISTS idx_responsables_id_domicilio ON public.responsables(id_domicilio);
CREATE INDEX IF NOT EXISTS idx_sincronizaciones_lookup ON public.sincronizaciones(tabla_origen, sistema_externo, id_remoto);
CREATE INDEX IF NOT EXISTS idx_proyectos_api_key ON public.proyectos(api_key);
CREATE INDEX IF NOT EXISTS idx_proyectos_slug ON public.proyectos(slug);
CREATE INDEX IF NOT EXISTS idx_api_logs_proyecto ON public.api_logs(proyecto_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_rol_id_personal ON public.personal_rol(id_personal);
CREATE INDEX IF NOT EXISTS idx_personal_rol_id_rol ON public.personal_rol(id_rol);

-- ============================================================
-- 8. RLS - Enable
-- ============================================================
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domicilios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_materia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sincronizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS - Politicas
-- ============================================================

-- Helper: el rol logico es service_role
CREATE OR REPLACE FUNCTION public.es_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role() = 'service_role';
$$;

GRANT EXECUTE ON FUNCTION public.es_service_role() TO anon, authenticated, service_role;

-- Helper: el rol logico es authenticated o service_role (lectura permitida)
CREATE OR REPLACE FUNCTION public.puede_leer_negocio()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role() IN ('authenticated', 'service_role');
$$;

GRANT EXECUTE ON FUNCTION public.puede_leer_negocio() TO anon, authenticated, service_role;

-- CURSOS
DROP POLICY IF EXISTS "cursos_select" ON public.cursos;
CREATE POLICY "cursos_select" ON public.cursos FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "cursos_write" ON public.cursos;
CREATE POLICY "cursos_write" ON public.cursos FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- ALUMNOS
DROP POLICY IF EXISTS "alumnos_select" ON public.alumnos;
CREATE POLICY "alumnos_select" ON public.alumnos FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "alumnos_write" ON public.alumnos;
CREATE POLICY "alumnos_write" ON public.alumnos FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- PERSONAL
DROP POLICY IF EXISTS "personal_select" ON public.personal;
CREATE POLICY "personal_select" ON public.personal FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "personal_write" ON public.personal;
CREATE POLICY "personal_write" ON public.personal FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- DOMICILIOS
DROP POLICY IF EXISTS "domicilios_select" ON public.domicilios;
CREATE POLICY "domicilios_select" ON public.domicilios FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "domicilios_write" ON public.domicilios;
CREATE POLICY "domicilios_write" ON public.domicilios FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- MATERIAS
DROP POLICY IF EXISTS "materias_select" ON public.materias;
CREATE POLICY "materias_select" ON public.materias FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "materias_write" ON public.materias;
CREATE POLICY "materias_write" ON public.materias FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- ROLES
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "roles_write" ON public.roles;
CREATE POLICY "roles_write" ON public.roles FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- PERSONAL_ROL
DROP POLICY IF EXISTS "personal_rol_select" ON public.personal_rol;
CREATE POLICY "personal_rol_select" ON public.personal_rol FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "personal_rol_write" ON public.personal_rol;
CREATE POLICY "personal_rol_write" ON public.personal_rol FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- PERSONAL_MATERIA
DROP POLICY IF EXISTS "personal_materia_select" ON public.personal_materia;
CREATE POLICY "personal_materia_select" ON public.personal_materia FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "personal_materia_write" ON public.personal_materia;
CREATE POLICY "personal_materia_write" ON public.personal_materia FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- RESPONSABLES
DROP POLICY IF EXISTS "responsables_select" ON public.responsables;
CREATE POLICY "responsables_select" ON public.responsables FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "responsables_write" ON public.responsables;
CREATE POLICY "responsables_write" ON public.responsables FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- SINCRONIZACIONES
DROP POLICY IF EXISTS "sincronizaciones_select" ON public.sincronizaciones;
CREATE POLICY "sincronizaciones_select" ON public.sincronizaciones FOR SELECT USING (public.puede_leer_negocio());
DROP POLICY IF EXISTS "sincronizaciones_write" ON public.sincronizaciones;
CREATE POLICY "sincronizaciones_write" ON public.sincronizaciones FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- PROYECTOS: solo service_role (el backend ya valida API keys y regentes)
DROP POLICY IF EXISTS "proyectos_all" ON public.proyectos;
CREATE POLICY "proyectos_all" ON public.proyectos FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- API_LOGS: solo service_role
DROP POLICY IF EXISTS "api_logs_all" ON public.api_logs;
CREATE POLICY "api_logs_all" ON public.api_logs FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- USUARIOS: solo service_role
DROP POLICY IF EXISTS "usuarios_all" ON public.usuarios;
CREATE POLICY "usuarios_all" ON public.usuarios FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- REFRESH_TOKENS: solo service_role
DROP POLICY IF EXISTS "refresh_tokens_all" ON public.refresh_tokens;
CREATE POLICY "refresh_tokens_all" ON public.refresh_tokens FOR ALL TO service_role USING (public.es_service_role()) WITH CHECK (public.es_service_role());

-- ============================================================
-- 10. PERMISOS DE TABLA Y SECUENCIAS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Lectura de tablas de negocio para authenticated y service_role
GRANT SELECT ON public.cursos TO authenticated, service_role;
GRANT SELECT ON public.alumnos TO authenticated, service_role;
GRANT SELECT ON public.personal TO authenticated, service_role;
GRANT SELECT ON public.domicilios TO authenticated, service_role;
GRANT SELECT ON public.materias TO authenticated, service_role;
GRANT SELECT ON public.roles TO authenticated, service_role;
GRANT SELECT ON public.personal_rol TO authenticated, service_role;
GRANT SELECT ON public.personal_materia TO authenticated, service_role;
GRANT SELECT ON public.responsables TO authenticated, service_role;
GRANT SELECT ON public.sincronizaciones TO authenticated, service_role;

-- Todo a service_role
GRANT ALL ON public.cursos TO service_role;
GRANT ALL ON public.alumnos TO service_role;
GRANT ALL ON public.personal TO service_role;
GRANT ALL ON public.domicilios TO service_role;
GRANT ALL ON public.materias TO service_role;
GRANT ALL ON public.roles TO service_role;
GRANT ALL ON public.personal_rol TO service_role;
GRANT ALL ON public.personal_materia TO service_role;
GRANT ALL ON public.responsables TO service_role;
GRANT ALL ON public.sincronizaciones TO service_role;
GRANT ALL ON public.proyectos TO service_role;
GRANT ALL ON public.api_logs TO service_role;
GRANT ALL ON public.usuarios TO service_role;
GRANT ALL ON public.refresh_tokens TO service_role;

-- Secuencias para service_role
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- El usuario de conexion de la aplicacion debe ser miembro de service_role
-- para heredar los permisos de tabla. Ajustar 'nexus' si se usa otro usuario.
GRANT service_role TO nexus;

-- anon: sin permisos (las politicas RLS lo bloquean de todos modos)

-- ============================================================
-- 11. SEED INICIAL
-- ============================================================
INSERT INTO public.roles (nombre, descripcion) VALUES
    ('regente', 'Regente del colegio'),
    ('subregente', 'Subregente del colegio'),
    ('rector', 'Rector'),
    ('vicerector', 'Vicerrector'),
    ('docente', 'Docente'),
    ('preceptor', 'Preceptor'),
    ('doe', 'DOE'),
    ('pat', 'PAT'),
    ('cooperadora', 'Cooperadora'),
    ('jefe_de_taller', 'Jefe de Taller')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.usuarios (email, password_hash, nombre, apellido, rol)
VALUES (
    'regente@nexus.local',
    crypt('Regente123!', gen_salt('bf', 12)),
    'Regente',
    'Nexus',
    'regente'
)
ON CONFLICT (email) DO NOTHING;
