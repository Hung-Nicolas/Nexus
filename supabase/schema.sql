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

-- 2. TABLA ALUMNOS
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
    id_curso INTEGER REFERENCES public.cursos(id_curso) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA PERSONAL
CREATE TABLE IF NOT EXISTS public.personal (
    dni INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL CHECK (rol IN ('rector', 'vicerector', 'docente', 'preceptor', 'administrativo', 'jefe_de_taller', 'cooperadora', 'otro')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA CATEGORIAS (informes escolares)
CREATE TABLE IF NOT EXISTS public.categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA MATERIAS
CREATE TABLE IF NOT EXISTS public.materias (
    id_materia SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA RELACION PERSONAL - MATERIA (N:M)
CREATE TABLE IF NOT EXISTS public.personal_materia (
    dni_personal INTEGER REFERENCES public.personal(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    id_materia INTEGER REFERENCES public.materias(id_materia) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (dni_personal, id_materia)
);

-- 7. TABLA EVALUACIONES
CREATE TABLE IF NOT EXISTS public.evaluaciones (
    id_evaluacion SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    id_materia INTEGER REFERENCES public.materias(id_materia) ON DELETE CASCADE ON UPDATE CASCADE,
    nota DECIMAL(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 10),
    tipo TEXT NOT NULL CHECK (tipo IN ('parcial', 'final', 'recuperatorio', 'trabajo_practico', 'exposicion', 'otro')),
    fecha DATE NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA ASISTENCIAS
CREATE TABLE IF NOT EXISTS public.asistencias (
    id_asistencia SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha DATE NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('presente', 'ausente', 'tarde', 'justificado', 'no_corresponde')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE (dni_alumno, fecha)
);

-- 9. TABLA RESPONSABLES (padres/tutores)
CREATE TABLE IF NOT EXISTS public.responsables (
    id_responsable SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    vinculo TEXT NOT NULL CHECK (vinculo IN ('padre', 'madre', 'tutor', 'otro')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 10. TABLA INFORMES (enriquecida con campos de GIE)
CREATE TABLE IF NOT EXISTS public.informes (
    id_informe SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    dni_personal INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL ON UPDATE CASCADE,
    id_categoria INTEGER REFERENCES public.categorias(id_categoria) ON DELETE SET NULL,
    tipo_falta TEXT NOT NULL,
    titulo TEXT NOT NULL,
    instancia TEXT NOT NULL CHECK (instancia IN ('leve', 'grave', 'muy_grave', 'consejo_aula', 'consejo', 'otro')),
    resumen TEXT NOT NULL,
    descargo TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'revisado', 'anulado', 'archivado', 'derivado')),
    dni_creador INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL,
    dni_revisor INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL,
    fecha DATE,
    fecha_creacion TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    fecha_revision TIMESTAMPTZ,
    motivo_rechazo TEXT,
    fecha_reunion DATE,
    dni_derivado INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL,
    numero INTEGER UNIQUE,
    observacion TEXT,
    observaciones TEXT,
    gie_id UUID UNIQUE,
    gie_creado_por UUID,
    gie_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- INDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alumnos_id_curso ON public.alumnos(id_curso);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_dni_alumno ON public.evaluaciones(dni_alumno);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_id_materia ON public.evaluaciones(id_materia);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON public.evaluaciones(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_dni_alumno ON public.asistencias(dni_alumno);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON public.asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_informes_dni_alumno ON public.informes(dni_alumno);
CREATE INDEX IF NOT EXISTS idx_informes_estado ON public.informes(estado);
CREATE INDEX IF NOT EXISTS idx_informes_categoria ON public.informes(id_categoria);
CREATE INDEX IF NOT EXISTS idx_informes_numero ON public.informes(numero);

-- ============================================================
-- RLS - Enable
-- ============================================================
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_materia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS - SELECT (abierto a anon + authenticated)
-- ============================================================
DROP POLICY IF EXISTS "cursos_select_all" ON public.cursos;
CREATE POLICY "cursos_select_all" ON public.cursos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "alumnos_select_all" ON public.alumnos;
CREATE POLICY "alumnos_select_all" ON public.alumnos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "personal_select_all" ON public.personal;
CREATE POLICY "personal_select_all" ON public.personal FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categorias_select_all" ON public.categorias;
CREATE POLICY "categorias_select_all" ON public.categorias FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "materias_select_all" ON public.materias;
CREATE POLICY "materias_select_all" ON public.materias FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "personal_materia_select_all" ON public.personal_materia;
CREATE POLICY "personal_materia_select_all" ON public.personal_materia FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "evaluaciones_select_all" ON public.evaluaciones;
CREATE POLICY "evaluaciones_select_all" ON public.evaluaciones FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "asistencias_select_all" ON public.asistencias;
CREATE POLICY "asistencias_select_all" ON public.asistencias FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "responsables_select_all" ON public.responsables;
CREATE POLICY "responsables_select_all" ON public.responsables FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "informes_select_all" ON public.informes;
CREATE POLICY "informes_select_all" ON public.informes FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- RLS - INSERT/UPDATE/DELETE (solo authenticated)
-- ============================================================
DROP POLICY IF EXISTS "cursos_insert_authenticated" ON public.cursos;
CREATE POLICY "cursos_insert_authenticated" ON public.cursos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cursos_update_authenticated" ON public.cursos;
CREATE POLICY "cursos_update_authenticated" ON public.cursos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "cursos_delete_authenticated" ON public.cursos;
CREATE POLICY "cursos_delete_authenticated" ON public.cursos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "alumnos_insert_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_insert_authenticated" ON public.alumnos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "alumnos_update_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_update_authenticated" ON public.alumnos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "alumnos_delete_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_delete_authenticated" ON public.alumnos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "personal_insert_authenticated" ON public.personal;
CREATE POLICY "personal_insert_authenticated" ON public.personal FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "personal_update_authenticated" ON public.personal;
CREATE POLICY "personal_update_authenticated" ON public.personal FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "personal_delete_authenticated" ON public.personal;
CREATE POLICY "personal_delete_authenticated" ON public.personal FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "categorias_insert_authenticated" ON public.categorias;
CREATE POLICY "categorias_insert_authenticated" ON public.categorias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "categorias_update_authenticated" ON public.categorias;
CREATE POLICY "categorias_update_authenticated" ON public.categorias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "categorias_delete_authenticated" ON public.categorias;
CREATE POLICY "categorias_delete_authenticated" ON public.categorias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "materias_insert_authenticated" ON public.materias;
CREATE POLICY "materias_insert_authenticated" ON public.materias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "materias_update_authenticated" ON public.materias;
CREATE POLICY "materias_update_authenticated" ON public.materias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "materias_delete_authenticated" ON public.materias;
CREATE POLICY "materias_delete_authenticated" ON public.materias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "personal_materia_insert_authenticated" ON public.personal_materia;
CREATE POLICY "personal_materia_insert_authenticated" ON public.personal_materia FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "personal_materia_update_authenticated" ON public.personal_materia;
CREATE POLICY "personal_materia_update_authenticated" ON public.personal_materia FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "personal_materia_delete_authenticated" ON public.personal_materia;
CREATE POLICY "personal_materia_delete_authenticated" ON public.personal_materia FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "evaluaciones_insert_authenticated" ON public.evaluaciones;
CREATE POLICY "evaluaciones_insert_authenticated" ON public.evaluaciones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "evaluaciones_update_authenticated" ON public.evaluaciones;
CREATE POLICY "evaluaciones_update_authenticated" ON public.evaluaciones FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "evaluaciones_delete_authenticated" ON public.evaluaciones;
CREATE POLICY "evaluaciones_delete_authenticated" ON public.evaluaciones FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "asistencias_insert_authenticated" ON public.asistencias;
CREATE POLICY "asistencias_insert_authenticated" ON public.asistencias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "asistencias_update_authenticated" ON public.asistencias;
CREATE POLICY "asistencias_update_authenticated" ON public.asistencias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "asistencias_delete_authenticated" ON public.asistencias;
CREATE POLICY "asistencias_delete_authenticated" ON public.asistencias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "responsables_insert_authenticated" ON public.responsables;
CREATE POLICY "responsables_insert_authenticated" ON public.responsables FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "responsables_update_authenticated" ON public.responsables;
CREATE POLICY "responsables_update_authenticated" ON public.responsables FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "responsables_delete_authenticated" ON public.responsables;
CREATE POLICY "responsables_delete_authenticated" ON public.responsables FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "informes_insert_authenticated" ON public.informes;
CREATE POLICY "informes_insert_authenticated" ON public.informes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "informes_update_authenticated" ON public.informes;
CREATE POLICY "informes_update_authenticated" ON public.informes FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "informes_delete_authenticated" ON public.informes;
CREATE POLICY "informes_delete_authenticated" ON public.informes FOR DELETE TO authenticated USING (true);

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
CREATE POLICY "perfiles_select_all" ON public.perfiles FOR SELECT TO authenticated USING (TRUE);

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
-- FUNCION RPC: Sincronizar informe desde GIE
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_informe_gie(
    p_gie_id UUID,
    p_dni_alumno INTEGER,
    p_categoria_nombre TEXT,
    p_tipo_falta TEXT,
    p_titulo TEXT,
    p_instancia TEXT,
    p_resumen TEXT,
    p_descargo TEXT,
    p_estado TEXT,
    p_motivo_rechazo TEXT,
    p_fecha_reunion DATE,
    p_observaciones TEXT,
    p_fecha_creacion TIMESTAMPTZ,
    p_fecha_revision TIMESTAMPTZ,
    p_numero INTEGER,
    p_gie_creado_por UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_categoria INTEGER;
BEGIN
    SELECT id_categoria INTO v_id_categoria
    FROM public.categorias
    WHERE nombre = p_categoria_nombre
    LIMIT 1;

    INSERT INTO public.informes (
        gie_id, dni_alumno, id_categoria, tipo_falta, titulo, instancia,
        resumen, descargo, estado, motivo_rechazo, fecha_reunion,
        observaciones, fecha_creacion, fecha_revision, numero,
        gie_creado_por, gie_synced_at
    ) VALUES (
        p_gie_id, p_dni_alumno, v_id_categoria, p_tipo_falta, p_titulo, p_instancia,
        p_resumen, p_descargo, p_estado, p_motivo_rechazo, p_fecha_reunion,
        p_observaciones, p_fecha_creacion, p_fecha_revision, p_numero,
        p_gie_creado_por, NOW()
    )
    ON CONFLICT (gie_id) DO UPDATE SET
        dni_alumno = EXCLUDED.dni_alumno,
        id_categoria = EXCLUDED.id_categoria,
        tipo_falta = EXCLUDED.tipo_falta,
        titulo = EXCLUDED.titulo,
        instancia = EXCLUDED.instancia,
        resumen = EXCLUDED.resumen,
        descargo = EXCLUDED.descargo,
        estado = EXCLUDED.estado,
        motivo_rechazo = EXCLUDED.motivo_rechazo,
        fecha_reunion = EXCLUDED.fecha_reunion,
        observaciones = EXCLUDED.observaciones,
        fecha_creacion = EXCLUDED.fecha_creacion,
        fecha_revision = EXCLUDED.fecha_revision,
        numero = EXCLUDED.numero,
        gie_creado_por = EXCLUDED.gie_creado_por,
        gie_synced_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_informe_gie(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.sync_informe_gie(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, UUID) TO authenticated;
