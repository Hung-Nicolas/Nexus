-- ============================================================
-- NEXUS - Base de Datos Escolar Maestra
-- Schema completo para Supabase (PostgreSQL)
-- Ejecutar en SQL Editor de una base NUEVA
-- ============================================================

-- 1. TABLA CURSOS
CREATE TABLE IF NOT EXISTS public.cursos (
    id_curso SERIAL PRIMARY KEY,
    anio INTEGER NOT NULL CHECK (anio > 0),
    division TEXT NOT NULL,
    turno TEXT NOT NULL CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),
    especialidad TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA DOMICILIOS
CREATE TABLE IF NOT EXISTS public.domicilios (
    id_domicilio SERIAL PRIMARY KEY,
    calle VARCHAR(50) NOT NULL,
    numero INTEGER NOT NULL CHECK (numero >= 0 AND numero <= 99999),
    departamento VARCHAR(5),
    localidad VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA ALUMNOS
CREATE TABLE IF NOT EXISTS public.alumnos (
    dni INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT,
    especialidad TEXT,
    division TEXT NOT NULL,
    turno TEXT NOT NULL DEFAULT 'Mañana' CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),
    email_padre TEXT,
    telefono TEXT,
    fecha_nacimiento DATE,
    genero TEXT,
    nacionalidad TEXT,
    id_domicilio INTEGER REFERENCES public.domicilios(id_domicilio) ON DELETE SET NULL ON UPDATE CASCADE,
    id_curso INTEGER REFERENCES public.cursos(id_curso) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id_rol SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA PERSONAL
CREATE TABLE IF NOT EXISTS public.personal (
    dni INTEGER PRIMARY KEY,
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

-- 5b. TABLA RELACION PERSONAL - ROL (N:M)
CREATE TABLE IF NOT EXISTS public.personal_rol (
    dni_personal INTEGER REFERENCES public.personal(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    id_rol INTEGER REFERENCES public.roles(id_rol) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (dni_personal, id_rol)
);

-- 6. TABLA CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA MATERIAS
CREATE TABLE IF NOT EXISTS public.materias (
    id_materia SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA RELACION PERSONAL - MATERIA (N:M)
CREATE TABLE IF NOT EXISTS public.personal_materia (
    dni_personal INTEGER REFERENCES public.personal(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    id_materia INTEGER REFERENCES public.materias(id_materia) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (dni_personal, id_materia)
);

-- 9. TABLA RESPONSABLES (padres/tutores)
CREATE TABLE IF NOT EXISTS public.responsables (
    id_responsable SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
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

-- 13. TABLA SINCRONIZACIONES (mapeo con sistemas externos)
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

-- 15. TABLA PROYECTOS (sistemas externos autorizados vía API Gateway)
CREATE TABLE IF NOT EXISTS public.proyectos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL UNIQUE,
    permisos JSONB NOT NULL DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    descripcion TEXT,
    ip_permitida TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 16. TABLA API_LOGS (auditoría de requests desde Edge Function)
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
-- INDICES
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
CREATE INDEX IF NOT EXISTS idx_personal_rol_dni_personal ON public.personal_rol(dni_personal);
CREATE INDEX IF NOT EXISTS idx_personal_rol_id_rol ON public.personal_rol(id_rol);

-- ============================================================
-- RLS - Enable
-- ============================================================
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domicilios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_materia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sincronizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS - Función centralizada de permisos
-- ============================================================
CREATE OR REPLACE FUNCTION public.tiene_permiso(p_tabla TEXT, p_accion TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- service_role: todo permitido (Edge Functions)
    IF auth.role() = 'service_role' THEN RETURN true; END IF;

    -- authenticated: CRUD completo en tablas de negocio
    IF auth.role() = 'authenticated' THEN
        -- Tablas administrativas solo para regentes
        IF p_tabla IN ('proyectos', 'api_logs') THEN
            RETURN EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'regente');
        END IF;
        -- Resto: todo permitido
        RETURN true;
    END IF;

    -- anon: solo SELECT en tablas de negocio (proyectos externos y lecturas públicas)
    IF auth.role() = 'anon' THEN
        IF p_accion = 'SELECT' THEN
            RETURN p_tabla IN (
                'alumnos', 'personal', 'cursos', 'materias',
                'categorias', 'roles', 'domicilios', 'responsables',
                'sincronizaciones', 'perfiles',
                'personal_rol', 'personal_materia'
            );
        END IF;
        RETURN false;
    END IF;

    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tiene_permiso(TEXT, TEXT) TO authenticated, anon, service_role;

-- ============================================================
-- RLS - Políticas centralizadas por tabla
-- ============================================================

-- CURSOS
DROP POLICY IF EXISTS "cursos_select" ON public.cursos;
CREATE POLICY "cursos_select" ON public.cursos FOR SELECT USING (public.tiene_permiso('cursos', 'SELECT'));
DROP POLICY IF EXISTS "cursos_insert" ON public.cursos;
CREATE POLICY "cursos_insert" ON public.cursos FOR INSERT WITH CHECK (public.tiene_permiso('cursos', 'INSERT'));
DROP POLICY IF EXISTS "cursos_update" ON public.cursos;
CREATE POLICY "cursos_update" ON public.cursos FOR UPDATE USING (public.tiene_permiso('cursos', 'UPDATE'));
DROP POLICY IF EXISTS "cursos_delete" ON public.cursos;
CREATE POLICY "cursos_delete" ON public.cursos FOR DELETE USING (public.tiene_permiso('cursos', 'DELETE'));

-- ALUMNOS
DROP POLICY IF EXISTS "alumnos_select" ON public.alumnos;
CREATE POLICY "alumnos_select" ON public.alumnos FOR SELECT USING (public.tiene_permiso('alumnos', 'SELECT'));
DROP POLICY IF EXISTS "alumnos_insert" ON public.alumnos;
CREATE POLICY "alumnos_insert" ON public.alumnos FOR INSERT WITH CHECK (public.tiene_permiso('alumnos', 'INSERT'));
DROP POLICY IF EXISTS "alumnos_update" ON public.alumnos;
CREATE POLICY "alumnos_update" ON public.alumnos FOR UPDATE USING (public.tiene_permiso('alumnos', 'UPDATE'));
DROP POLICY IF EXISTS "alumnos_delete" ON public.alumnos;
CREATE POLICY "alumnos_delete" ON public.alumnos FOR DELETE USING (public.tiene_permiso('alumnos', 'DELETE'));

-- PERSONAL
DROP POLICY IF EXISTS "personal_select" ON public.personal;
CREATE POLICY "personal_select" ON public.personal FOR SELECT USING (public.tiene_permiso('personal', 'SELECT'));
DROP POLICY IF EXISTS "personal_insert" ON public.personal;
CREATE POLICY "personal_insert" ON public.personal FOR INSERT WITH CHECK (public.tiene_permiso('personal', 'INSERT'));
DROP POLICY IF EXISTS "personal_update" ON public.personal;
CREATE POLICY "personal_update" ON public.personal FOR UPDATE USING (public.tiene_permiso('personal', 'UPDATE'));
DROP POLICY IF EXISTS "personal_delete" ON public.personal;
CREATE POLICY "personal_delete" ON public.personal FOR DELETE USING (public.tiene_permiso('personal', 'DELETE'));

-- DOMICILIOS
DROP POLICY IF EXISTS "domicilios_select" ON public.domicilios;
CREATE POLICY "domicilios_select" ON public.domicilios FOR SELECT USING (public.tiene_permiso('domicilios', 'SELECT'));
DROP POLICY IF EXISTS "domicilios_insert" ON public.domicilios;
CREATE POLICY "domicilios_insert" ON public.domicilios FOR INSERT WITH CHECK (public.tiene_permiso('domicilios', 'INSERT'));
DROP POLICY IF EXISTS "domicilios_update" ON public.domicilios;
CREATE POLICY "domicilios_update" ON public.domicilios FOR UPDATE USING (public.tiene_permiso('domicilios', 'UPDATE'));
DROP POLICY IF EXISTS "domicilios_delete" ON public.domicilios;
CREATE POLICY "domicilios_delete" ON public.domicilios FOR DELETE USING (public.tiene_permiso('domicilios', 'DELETE'));

-- CATEGORIAS
DROP POLICY IF EXISTS "categorias_select" ON public.categorias;
CREATE POLICY "categorias_select" ON public.categorias FOR SELECT USING (public.tiene_permiso('categorias', 'SELECT'));
DROP POLICY IF EXISTS "categorias_insert" ON public.categorias;
CREATE POLICY "categorias_insert" ON public.categorias FOR INSERT WITH CHECK (public.tiene_permiso('categorias', 'INSERT'));
DROP POLICY IF EXISTS "categorias_update" ON public.categorias;
CREATE POLICY "categorias_update" ON public.categorias FOR UPDATE USING (public.tiene_permiso('categorias', 'UPDATE'));
DROP POLICY IF EXISTS "categorias_delete" ON public.categorias;
CREATE POLICY "categorias_delete" ON public.categorias FOR DELETE USING (public.tiene_permiso('categorias', 'DELETE'));

-- MATERIAS
DROP POLICY IF EXISTS "materias_select" ON public.materias;
CREATE POLICY "materias_select" ON public.materias FOR SELECT USING (public.tiene_permiso('materias', 'SELECT'));
DROP POLICY IF EXISTS "materias_insert" ON public.materias;
CREATE POLICY "materias_insert" ON public.materias FOR INSERT WITH CHECK (public.tiene_permiso('materias', 'INSERT'));
DROP POLICY IF EXISTS "materias_update" ON public.materias;
CREATE POLICY "materias_update" ON public.materias FOR UPDATE USING (public.tiene_permiso('materias', 'UPDATE'));
DROP POLICY IF EXISTS "materias_delete" ON public.materias;
CREATE POLICY "materias_delete" ON public.materias FOR DELETE USING (public.tiene_permiso('materias', 'DELETE'));

-- ROLES
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles FOR SELECT USING (public.tiene_permiso('roles', 'SELECT'));
DROP POLICY IF EXISTS "roles_insert" ON public.roles;
CREATE POLICY "roles_insert" ON public.roles FOR INSERT WITH CHECK (public.tiene_permiso('roles', 'INSERT'));
DROP POLICY IF EXISTS "roles_update" ON public.roles;
CREATE POLICY "roles_update" ON public.roles FOR UPDATE USING (public.tiene_permiso('roles', 'UPDATE'));
DROP POLICY IF EXISTS "roles_delete" ON public.roles;
CREATE POLICY "roles_delete" ON public.roles FOR DELETE USING (public.tiene_permiso('roles', 'DELETE'));

-- PERSONAL_ROL
DROP POLICY IF EXISTS "personal_rol_select" ON public.personal_rol;
CREATE POLICY "personal_rol_select" ON public.personal_rol FOR SELECT USING (public.tiene_permiso('personal_rol', 'SELECT'));
DROP POLICY IF EXISTS "personal_rol_insert" ON public.personal_rol;
CREATE POLICY "personal_rol_insert" ON public.personal_rol FOR INSERT WITH CHECK (public.tiene_permiso('personal_rol', 'INSERT'));
DROP POLICY IF EXISTS "personal_rol_update" ON public.personal_rol;
CREATE POLICY "personal_rol_update" ON public.personal_rol FOR UPDATE USING (public.tiene_permiso('personal_rol', 'UPDATE'));
DROP POLICY IF EXISTS "personal_rol_delete" ON public.personal_rol;
CREATE POLICY "personal_rol_delete" ON public.personal_rol FOR DELETE USING (public.tiene_permiso('personal_rol', 'DELETE'));

-- PERSONAL_MATERIA
DROP POLICY IF EXISTS "personal_materia_select" ON public.personal_materia;
CREATE POLICY "personal_materia_select" ON public.personal_materia FOR SELECT USING (public.tiene_permiso('personal_materia', 'SELECT'));
DROP POLICY IF EXISTS "personal_materia_insert" ON public.personal_materia;
CREATE POLICY "personal_materia_insert" ON public.personal_materia FOR INSERT WITH CHECK (public.tiene_permiso('personal_materia', 'INSERT'));
DROP POLICY IF EXISTS "personal_materia_update" ON public.personal_materia;
CREATE POLICY "personal_materia_update" ON public.personal_materia FOR UPDATE USING (public.tiene_permiso('personal_materia', 'UPDATE'));
DROP POLICY IF EXISTS "personal_materia_delete" ON public.personal_materia;
CREATE POLICY "personal_materia_delete" ON public.personal_materia FOR DELETE USING (public.tiene_permiso('personal_materia', 'DELETE'));

-- RESPONSABLES
DROP POLICY IF EXISTS "responsables_select" ON public.responsables;
CREATE POLICY "responsables_select" ON public.responsables FOR SELECT USING (public.tiene_permiso('responsables', 'SELECT'));
DROP POLICY IF EXISTS "responsables_insert" ON public.responsables;
CREATE POLICY "responsables_insert" ON public.responsables FOR INSERT WITH CHECK (public.tiene_permiso('responsables', 'INSERT'));
DROP POLICY IF EXISTS "responsables_update" ON public.responsables;
CREATE POLICY "responsables_update" ON public.responsables FOR UPDATE USING (public.tiene_permiso('responsables', 'UPDATE'));
DROP POLICY IF EXISTS "responsables_delete" ON public.responsables;
CREATE POLICY "responsables_delete" ON public.responsables FOR DELETE USING (public.tiene_permiso('responsables', 'DELETE'));

-- SINCRONIZACIONES
DROP POLICY IF EXISTS "sincronizaciones_select" ON public.sincronizaciones;
CREATE POLICY "sincronizaciones_select" ON public.sincronizaciones FOR SELECT USING (public.tiene_permiso('sincronizaciones', 'SELECT'));
DROP POLICY IF EXISTS "sincronizaciones_insert" ON public.sincronizaciones;
CREATE POLICY "sincronizaciones_insert" ON public.sincronizaciones FOR INSERT WITH CHECK (public.tiene_permiso('sincronizaciones', 'INSERT'));
DROP POLICY IF EXISTS "sincronizaciones_update" ON public.sincronizaciones;
CREATE POLICY "sincronizaciones_update" ON public.sincronizaciones FOR UPDATE USING (public.tiene_permiso('sincronizaciones', 'UPDATE'));
DROP POLICY IF EXISTS "sincronizaciones_delete" ON public.sincronizaciones;
CREATE POLICY "sincronizaciones_delete" ON public.sincronizaciones FOR DELETE USING (public.tiene_permiso('sincronizaciones', 'DELETE'));

-- PROYECTOS (administrativa: solo regentes)
DROP POLICY IF EXISTS "proyectos_select" ON public.proyectos;
CREATE POLICY "proyectos_select" ON public.proyectos FOR SELECT USING (public.tiene_permiso('proyectos', 'SELECT'));
DROP POLICY IF EXISTS "proyectos_insert" ON public.proyectos;
CREATE POLICY "proyectos_insert" ON public.proyectos FOR INSERT WITH CHECK (public.tiene_permiso('proyectos', 'INSERT'));
DROP POLICY IF EXISTS "proyectos_update" ON public.proyectos;
CREATE POLICY "proyectos_update" ON public.proyectos FOR UPDATE USING (public.tiene_permiso('proyectos', 'UPDATE'));
DROP POLICY IF EXISTS "proyectos_delete" ON public.proyectos;
CREATE POLICY "proyectos_delete" ON public.proyectos FOR DELETE USING (public.tiene_permiso('proyectos', 'DELETE'));

-- API_LOGS (administrativa: solo regentes)
DROP POLICY IF EXISTS "api_logs_select" ON public.api_logs;
CREATE POLICY "api_logs_select" ON public.api_logs FOR SELECT USING (public.tiene_permiso('api_logs', 'SELECT'));

-- ============================================================
-- AUTH: TABLA PERFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'regente' CHECK (rol IN ('regente', 'subregente', 'rector', 'vicerector', 'docente', 'preceptor', 'doe', 'pat', 'cooperadora', 'jefe_de_taller')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_all" ON public.perfiles;
CREATE POLICY "perfiles_select_all" ON public.perfiles FOR SELECT TO authenticated, anon USING (TRUE);

DROP POLICY IF EXISTS "perfiles_insert_trigger" ON public.perfiles;
CREATE POLICY "perfiles_insert_trigger" ON public.perfiles FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

DROP POLICY IF EXISTS "perfiles_update_regente" ON public.perfiles;
CREATE POLICY "perfiles_update_regente" ON public.perfiles FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Trigger: crear perfil automaticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Sin'),
        COALESCE(new.raw_user_meta_data->>'apellido', 'Nombre'),
        COALESCE(new.raw_user_meta_data->>'rol', 'regente')
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
-- FUNCIONES RPC: Gestion de usuarios
-- ============================================================
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

DROP FUNCTION IF EXISTS public.eliminar_usuario_completo(UUID);
CREATE OR REPLACE FUNCTION public.eliminar_usuario_completo(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF user_id = auth.uid() THEN
        RAISE EXCEPTION 'No podés eliminar tu propio usuario';
    END IF;
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_usuario_completo(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.actualizar_password_usuario(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.actualizar_password_usuario(user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF user_id = auth.uid() THEN
        RAISE EXCEPTION 'Usá tu perfil para cambiar tu propia contraseña';
    END IF;
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')) WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.actualizar_password_usuario(UUID, TEXT) TO authenticated;

-- ============================================================
-- FUNCIONES RPC: Gestión de proyectos API
-- ============================================================
DROP FUNCTION IF EXISTS public.crear_proyecto_api(TEXT, TEXT, JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.crear_proyecto_api(
    p_nombre TEXT,
    p_slug TEXT,
    p_permisos JSONB DEFAULT '{}',
    p_descripcion TEXT DEFAULT NULL
)
RETURNS TABLE(api_key TEXT, slug TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_api_key TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'regente') THEN
        RAISE EXCEPTION 'Solo los regentes pueden crear proyectos API';
    END IF;

    v_api_key := 'nx_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.proyectos (nombre, slug, api_key, permisos, descripcion)
    VALUES (p_nombre, p_slug, v_api_key, p_permisos, p_descripcion);

    RETURN QUERY SELECT v_api_key, p_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_proyecto_api(TEXT, TEXT, JSONB, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.rotar_api_key(TEXT);
CREATE OR REPLACE FUNCTION public.rotar_api_key(p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nueva_key TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'regente') THEN
        RAISE EXCEPTION 'Solo los regentes pueden rotar API keys';
    END IF;

    v_nueva_key := 'nx_' || replace(gen_random_uuid()::text, '-', '');

    UPDATE public.proyectos
    SET api_key = v_nueva_key, updated_at = NOW()
    WHERE slug = p_slug;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proyecto % no encontrado', p_slug;
    END IF;

    RETURN v_nueva_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotar_api_key(TEXT) TO authenticated;


