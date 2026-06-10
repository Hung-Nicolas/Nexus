-- ============================================================
-- NEXUS - Base de Datos Escolar Maestra
-- Schema para Supabase (PostgreSQL)
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
    rol TEXT NOT NULL CHECK (rol IN ('directivo', 'docente', 'preceptor', 'administrativo', 'otro')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA MATERIAS
CREATE TABLE IF NOT EXISTS public.materias (
    id_materia SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA RELACIÓN PERSONAL - MATERIA (N:M)
CREATE TABLE IF NOT EXISTS public.personal_materia (
    dni_personal INTEGER REFERENCES public.personal(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    id_materia INTEGER REFERENCES public.materias(id_materia) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (dni_personal, id_materia)
);

-- 6. TABLA EVALUACIONES
CREATE TABLE IF NOT EXISTS public.evaluaciones (
    id_evaluacion SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    id_materia INTEGER REFERENCES public.materias(id_materia) ON DELETE CASCADE ON UPDATE CASCADE,
    nota DECIMAL(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 10),
    tipo TEXT NOT NULL CHECK (tipo IN ('parcial', 'final', 'recuperatorio', 'trabajo_practico', 'exposicion', 'otro')),
    fecha DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA ASISTENCIAS
CREATE TABLE IF NOT EXISTS public.asistencias (
    id_asistencia SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    fecha DATE NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('presente', 'ausente', 'tarde', 'justificado', 'no_corresponde')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE (dni_alumno, fecha)
);

-- 8. TABLA INFORMES
CREATE TABLE IF NOT EXISTS public.informes (
    id_informe SERIAL PRIMARY KEY,
    dni_alumno INTEGER REFERENCES public.alumnos(dni) ON DELETE CASCADE ON UPDATE CASCADE,
    dni_personal INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL ON UPDATE CASCADE,
    fecha DATE NOT NULL,
    observacion TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_alumnos_id_curso ON public.alumnos(id_curso);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_dni_alumno ON public.evaluaciones(dni_alumno);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_id_materia ON public.evaluaciones(id_materia);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha ON public.evaluaciones(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_dni_alumno ON public.asistencias(dni_alumno);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON public.asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_informes_dni_alumno ON public.informes(dni_alumno);
CREATE INDEX IF NOT EXISTS idx_informes_dni_personal ON public.informes(dni_personal);
CREATE INDEX IF NOT EXISTS idx_informes_fecha ON public.informes(fecha);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_materia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;

-- Política base: lectura pública
DROP POLICY IF EXISTS "cursos_select_all" ON public.cursos;
CREATE POLICY "cursos_select_all"
    ON public.cursos FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "alumnos_select_all" ON public.alumnos;
CREATE POLICY "alumnos_select_all"
    ON public.alumnos FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "personal_select_all" ON public.personal;
CREATE POLICY "personal_select_all"
    ON public.personal FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "materias_select_all" ON public.materias;
CREATE POLICY "materias_select_all"
    ON public.materias FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "personal_materia_select_all" ON public.personal_materia;
CREATE POLICY "personal_materia_select_all"
    ON public.personal_materia FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "evaluaciones_select_all" ON public.evaluaciones;
CREATE POLICY "evaluaciones_select_all"
    ON public.evaluaciones FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "asistencias_select_all" ON public.asistencias;
CREATE POLICY "asistencias_select_all"
    ON public.asistencias FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "informes_select_all" ON public.informes;
CREATE POLICY "informes_select_all"
    ON public.informes FOR SELECT
    TO anon, authenticated
    USING (true);

-- Políticas de inserción/actualización/eliminación: solo authenticated
DROP POLICY IF EXISTS "cursos_insert_authenticated" ON public.cursos;
CREATE POLICY "cursos_insert_authenticated"
    ON public.cursos FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "cursos_update_authenticated" ON public.cursos;
CREATE POLICY "cursos_update_authenticated"
    ON public.cursos FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "cursos_delete_authenticated" ON public.cursos;
CREATE POLICY "cursos_delete_authenticated"
    ON public.cursos FOR DELETE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "alumnos_insert_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_insert_authenticated"
    ON public.alumnos FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "alumnos_update_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_update_authenticated"
    ON public.alumnos FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "alumnos_delete_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_delete_authenticated"
    ON public.alumnos FOR DELETE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "personal_insert_authenticated" ON public.personal;
CREATE POLICY "personal_insert_authenticated"
    ON public.personal FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "personal_update_authenticated" ON public.personal;
CREATE POLICY "personal_update_authenticated"
    ON public.personal FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "personal_delete_authenticated" ON public.personal;
CREATE POLICY "personal_delete_authenticated"
    ON public.personal FOR DELETE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "materias_insert_authenticated" ON public.materias;
CREATE POLICY "materias_insert_authenticated"
    ON public.materias FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "materias_update_authenticated" ON public.materias;
CREATE POLICY "materias_update_authenticated"
    ON public.materias FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "materias_delete_authenticated" ON public.materias;
CREATE POLICY "materias_delete_authenticated"
    ON public.materias FOR DELETE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "evaluaciones_insert_authenticated" ON public.evaluaciones;
CREATE POLICY "evaluaciones_insert_authenticated"
    ON public.evaluaciones FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "evaluaciones_update_authenticated" ON public.evaluaciones;
CREATE POLICY "evaluaciones_update_authenticated"
    ON public.evaluaciones FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "evaluaciones_delete_authenticated" ON public.evaluaciones;
CREATE POLICY "evaluaciones_delete_authenticated"
    ON public.evaluaciones FOR DELETE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "asistencias_insert_authenticated" ON public.asistencias;
CREATE POLICY "asistencias_insert_authenticated"
    ON public.asistencias FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "asistencias_update_authenticated" ON public.asistencias;
CREATE POLICY "asistencias_update_authenticated"
    ON public.asistencias FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "asistencias_delete_authenticated" ON public.asistencias;
CREATE POLICY "asistencias_delete_authenticated"
    ON public.asistencias FOR DELETE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "informes_insert_authenticated" ON public.informes;
CREATE POLICY "informes_insert_authenticated"
    ON public.informes FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "informes_update_authenticated" ON public.informes;
CREATE POLICY "informes_update_authenticated"
    ON public.informes FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "informes_delete_authenticated" ON public.informes;
CREATE POLICY "informes_delete_authenticated"
    ON public.informes FOR DELETE
    TO authenticated
    USING (true);
