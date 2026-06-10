-- ============================================================
-- MIGRACION: Enriquecer tabla informes con campos de GIE
-- Ejecutar en Supabase SQL Editor sobre base EXISTENTE
-- ============================================================

-- 1. TABLA CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias_select_all" ON public.categorias;
CREATE POLICY "categorias_select_all" ON public.categorias FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categorias_insert_authenticated" ON public.categorias;
CREATE POLICY "categorias_insert_authenticated" ON public.categorias FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "categorias_update_authenticated" ON public.categorias;
CREATE POLICY "categorias_update_authenticated" ON public.categorias FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "categorias_delete_authenticated" ON public.categorias;
CREATE POLICY "categorias_delete_authenticated" ON public.categorias FOR DELETE TO authenticated USING (true);

-- 2. COLUMNAS NUEVAS EN INFORMES (solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'id_categoria') THEN
        ALTER TABLE public.informes ADD COLUMN id_categoria INTEGER REFERENCES public.categorias(id_categoria) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'tipo_falta') THEN
        ALTER TABLE public.informes ADD COLUMN tipo_falta TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'titulo') THEN
        ALTER TABLE public.informes ADD COLUMN titulo TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'instancia') THEN
        ALTER TABLE public.informes ADD COLUMN instancia TEXT CHECK (instancia IN ('leve', 'grave', 'muy_grave', 'consejo_aula', 'consejo', 'otro'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'resumen') THEN
        ALTER TABLE public.informes ADD COLUMN resumen TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'descargo') THEN
        ALTER TABLE public.informes ADD COLUMN descargo TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'estado') THEN
        ALTER TABLE public.informes ADD COLUMN estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'revisado', 'anulado', 'archivado', 'derivado'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'dni_creador') THEN
        ALTER TABLE public.informes ADD COLUMN dni_creador INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'dni_revisor') THEN
        ALTER TABLE public.informes ADD COLUMN dni_revisor INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'fecha_creacion') THEN
        ALTER TABLE public.informes ADD COLUMN fecha_creacion TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'fecha_revision') THEN
        ALTER TABLE public.informes ADD COLUMN fecha_revision TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'motivo_rechazo') THEN
        ALTER TABLE public.informes ADD COLUMN motivo_rechazo TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'fecha_reunion') THEN
        ALTER TABLE public.informes ADD COLUMN fecha_reunion DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'dni_derivado') THEN
        ALTER TABLE public.informes ADD COLUMN dni_derivado INTEGER REFERENCES public.personal(dni) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'numero') THEN
        ALTER TABLE public.informes ADD COLUMN numero INTEGER UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'informes' AND column_name = 'observaciones') THEN
        ALTER TABLE public.informes ADD COLUMN observaciones TEXT;
    END IF;
END $$;

-- 3. INDICES NUEVOS
CREATE INDEX IF NOT EXISTS idx_informes_estado ON public.informes(estado);
CREATE INDEX IF NOT EXISTS idx_informes_categoria ON public.informes(id_categoria);
CREATE INDEX IF NOT EXISTS idx_informes_numero ON public.informes(numero);

-- 4. CATEGORIAS
INSERT INTO public.categorias (nombre, color) VALUES
('Conducta',    '#ef4444'),
('Disciplina',  '#f97316'),
('Asistencia',  '#3b82f6'),
('Académica',   '#10b981'),
('Otros',       '#94a3b8')
ON CONFLICT DO NOTHING;

-- 5. INFORMES DE EJEMPLO (schema completo)
INSERT INTO public.informes (dni_alumno, id_categoria, tipo_falta, titulo, instancia, resumen, estado, dni_creador, dni_revisor, fecha, fecha_creacion, fecha_revision, fecha_reunion, numero, observaciones) VALUES
(40000014, 1, 'Conducta', 'Discusión verbal con compañero', 'grave', 'Discusión verbal elevada con un compañero que interrumpió las clases aledañas.', 'archivado', 20111002, 20111003, '2026-03-20', '2026-03-20 09:15:00+00', '2026-03-21 10:00:00+00', NULL, 202600001, 'Ambos alumnos fueron llamados a coordinación.'),
(40000014, 2, 'Disciplina', 'Encendido de fuego en patio', 'muy_grave', 'El alumno encendió una hoja de papel en el patio durante el recreo, poniendo en riesgo la seguridad.', 'archivado', 20111003, 20111001, '2026-04-14', '2026-04-14 12:30:00+00', '2026-04-15 10:00:00+00', NULL, 202600002, 'Se aplicó sanción de suspensión de 2 días.'),
(40000015, 2, 'Disciplina', 'Fuga del aula sin permiso', 'grave', 'El alumno abandonó el aula durante la clase sin solicitar permiso al docente.', 'archivado', 20111002, 20111001, '2026-04-05', '2026-04-05 15:00:00+00', '2026-04-06 08:30:00+00', '2026-04-28', 202600003, 'Volvió a los 15 minutos.'),
(40000015, 3, 'Asistencia', 'Ausencia injustificada de 2 días', 'leve', 'Faltó dos días consecutivos sin presentar justificación.', 'derivado', 20111002, NULL, '2026-04-18', '2026-04-18 09:00:00+00', NULL, NULL, 202600004, NULL),
(40000007, 3, 'Asistencia', 'Llegadas tarde consecutivas', 'leve', 'El alumno acumula 5 llegadas tarde en el mes sin justificación.', 'revisado', 20111003, 20111001, '2026-04-12', '2026-04-12 08:15:00+00', '2026-04-16 10:00:00+00', NULL, 202600005, 'Padres notificados por mail.'),
(40000003, 5, 'Otra', 'Olvido de materiales reiterado', 'leve', 'La alumna olvidó los materiales necesarios para la clase de educación física por tercera vez.', 'revisado', 20111003, 20111001, '2026-04-14', '2026-04-14 07:50:00+00', '2026-04-14 12:00:00+00', NULL, 202600006, 'Se le prestó material del depósito.'),
(40000003, 1, 'Conducta', 'Empujón a compañero en fila', 'leve', 'Empujó a un compañero mientras esperaban en la fila del comedor.', 'pendiente', 20111002, NULL, '2026-04-22', '2026-04-22 12:30:00+00', NULL, NULL, 202600007, NULL),
(40000004, 1, 'Conducta', 'Falta de respeto hacia un compañero', 'grave', 'Durante el recreo, utilizó un lenguaje inapropiado hacia un compañero generando un incidente.', 'revisado', 20111002, 20111001, '2026-04-15', '2026-04-15 11:00:00+00', '2026-04-15 14:00:00+00', NULL, 202600008, 'Se medió conversación entre ambas partes.'),
(40000004, 2, 'Disciplina', 'Uso de celular durante clase', 'leve', 'Fue sorprendida utilizando el celular durante la clase de historia.', 'pendiente', 20111003, NULL, '2026-04-20', '2026-04-20 10:00:00+00', NULL, NULL, 202600009, NULL)
ON CONFLICT DO NOTHING;
