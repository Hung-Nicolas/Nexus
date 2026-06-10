-- ============================================================
-- NEXUS - Seed / Datos sincronizados con GIE
-- Ejecutar después de aplicar schema.sql
-- ============================================================

-- Limpiar datos previos
TRUNCATE public.informes, public.asistencias, public.evaluaciones, public.personal_materia, public.alumnos, public.personal, public.materias, public.cursos RESTART IDENTITY CASCADE;

-- ============================================================
-- CURSOS (24 combinaciones usadas por GIE)
-- ============================================================
INSERT INTO public.cursos (anio, division, turno, especialidad) VALUES
(1, '1', 'Mañana', NULL), (1, '2', 'Mañana', NULL), (1, '3', 'Tarde',  NULL),
(2, '1', 'Tarde',  NULL), (2, '2', 'Tarde',  NULL), (2, '2', 'Noche',  NULL), (2, '3', 'Noche',  NULL),
(3, '1', 'Noche',  NULL), (3, '1', 'Mañana', NULL), (3, '2', 'Mañana', NULL), (3, '3', 'Tarde',  NULL),
(4, '1', 'Tarde',  NULL), (4, '1', 'Noche',  NULL), (4, '2', 'Noche',  NULL), (4, '3', 'Mañana', NULL),
(5, '1', 'Mañana', NULL), (5, '1', 'Noche',  NULL), (5, '2', 'Tarde',  NULL), (5, '3', 'Noche',  NULL),
(6, '1', 'Noche',  NULL), (6, '1', 'Mañana', NULL), (6, '2', 'Mañana', NULL), (6, '2', 'Tarde',  NULL), (6, '3', 'Tarde',  NULL);

-- ============================================================
-- ALUMNOS (40 estudiantes sincronizados con GIE)
-- Se busca id_curso por subconsulta para evitar errores de FK
-- ============================================================
INSERT INTO public.alumnos (dni, nombre, apellido, division, turno, id_curso)
SELECT 40000000, 'Lucas',       'Alvarez',     '1', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 1 AND c.division = '1' AND c.turno = 'Mañana'
UNION ALL SELECT 40000001, 'Sofía',       'Benítez',     '1', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 1 AND c.division = '1' AND c.turno = 'Mañana'
UNION ALL SELECT 40000002, 'Mateo',       'Castro',      '2', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 1 AND c.division = '2' AND c.turno = 'Mañana'
UNION ALL SELECT 40000003, 'Valentina',   'Díaz',        '2', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 1 AND c.division = '2' AND c.turno = 'Mañana'
UNION ALL SELECT 40000004, 'Thiago',      'Espósito',    '3', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 1 AND c.division = '3' AND c.turno = 'Tarde'
UNION ALL SELECT 40000005, 'Camila',      'Fernández',   '3', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 1 AND c.division = '3' AND c.turno = 'Tarde'
UNION ALL SELECT 40000006, 'Benjamín',    'García',      '1', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 2 AND c.division = '1' AND c.turno = 'Tarde'
UNION ALL SELECT 40000007, 'Isabella',    'Hernández',   '1', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 2 AND c.division = '1' AND c.turno = 'Tarde'
UNION ALL SELECT 40000008, 'Santiago',    'Ibáñez',      '2', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 2 AND c.division = '2' AND c.turno = 'Tarde'
UNION ALL SELECT 40000009, 'Martina',     'Jiménez',     '2', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 2 AND c.division = '2' AND c.turno = 'Noche'
UNION ALL SELECT 40000010, 'Emiliano',    'Klein',       '3', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 2 AND c.division = '3' AND c.turno = 'Noche'
UNION ALL SELECT 40000011, 'Julieta',     'Luna',        '3', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 2 AND c.division = '3' AND c.turno = 'Noche'
UNION ALL SELECT 40000012, 'Máximo',      'Moreno',      '1', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 3 AND c.division = '1' AND c.turno = 'Noche'
UNION ALL SELECT 40000013, 'Victoria',    'Navarro',     '1', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 3 AND c.division = '1' AND c.turno = 'Mañana'
UNION ALL SELECT 40000014, 'Bruno',       'Ortiz',       '2', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 3 AND c.division = '2' AND c.turno = 'Mañana'
UNION ALL SELECT 40000015, 'Catalina',    'Pérez',       '2', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 3 AND c.division = '2' AND c.turno = 'Mañana'
UNION ALL SELECT 40000016, 'Tomás',       'Quinteros',   '3', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 3 AND c.division = '3' AND c.turno = 'Tarde'
UNION ALL SELECT 40000017, 'Emma',        'Ramírez',     '3', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 3 AND c.division = '3' AND c.turno = 'Tarde'
UNION ALL SELECT 40000018, 'Facundo',     'Silva',       '1', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 4 AND c.division = '1' AND c.turno = 'Tarde'
UNION ALL SELECT 40000019, 'Agustina',    'Torres',      '1', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 4 AND c.division = '1' AND c.turno = 'Noche'
UNION ALL SELECT 40000020, 'Joaquín',     'Vargas',      '2', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 4 AND c.division = '2' AND c.turno = 'Noche'
UNION ALL SELECT 40000021, 'Morena',      'Wainstein',   '2', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 4 AND c.division = '2' AND c.turno = 'Noche'
UNION ALL SELECT 40000022, 'Bautista',    'Yáñez',       '3', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 4 AND c.division = '3' AND c.turno = 'Mañana'
UNION ALL SELECT 40000023, 'Milagros',    'Zabala',      '3', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 4 AND c.division = '3' AND c.turno = 'Mañana'
UNION ALL SELECT 40000024, 'Dante',       'Acosta',      '1', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 5 AND c.division = '1' AND c.turno = 'Mañana'
UNION ALL SELECT 40000025, 'Renata',      'Bravo',       '1', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 5 AND c.division = '1' AND c.turno = 'Mañana'
UNION ALL SELECT 40000026, 'León',        'Cabrera',     '2', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 5 AND c.division = '2' AND c.turno = 'Tarde'
UNION ALL SELECT 40000027, 'Antonella',   'Domínguez',   '2', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 5 AND c.division = '2' AND c.turno = 'Tarde'
UNION ALL SELECT 40000028, 'Francisco',   'Escobar',     '3', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 5 AND c.division = '3' AND c.turno = 'Noche'
UNION ALL SELECT 40000029, 'Guadalupe',   'Flores',      '3', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 5 AND c.division = '3' AND c.turno = 'Noche'
UNION ALL SELECT 40000030, 'Ignacio',     'Guzmán',      '1', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '1' AND c.turno = 'Noche'
UNION ALL SELECT 40000031, 'Aitana',      'Herrera',     '1', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '1' AND c.turno = 'Noche'
UNION ALL SELECT 40000032, 'Valentino',   'Ibarra',      '2', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '2' AND c.turno = 'Mañana'
UNION ALL SELECT 40000033, 'Cecilia',     'Juárez',      '2', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '2' AND c.turno = 'Mañana'
UNION ALL SELECT 40000034, 'Sebastián',   'Kovacs',      '3', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '3' AND c.turno = 'Tarde'
UNION ALL SELECT 40000035, 'Florencia',   'Lagos',       '3', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '3' AND c.turno = 'Tarde'
UNION ALL SELECT 40000036, 'Matías',      'Molina',      '1', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '1' AND c.turno = 'Mañana'
UNION ALL SELECT 40000037, 'Rocío',       'Nuñez',       '2', 'Tarde',  c.id_curso FROM public.cursos c WHERE c.anio = 6 AND c.division = '2' AND c.turno = 'Tarde'
UNION ALL SELECT 40000038, 'Nicolás',     'Ortega',      '1', 'Noche',  c.id_curso FROM public.cursos c WHERE c.anio = 5 AND c.division = '1' AND c.turno = 'Noche'
UNION ALL SELECT 40000039, 'Paula',       'Peralta',     '1', 'Mañana', c.id_curso FROM public.cursos c WHERE c.anio = 4 AND c.division = '1' AND c.turno = 'Mañana';

-- ============================================================
-- PERSONAL
-- ============================================================
INSERT INTO public.personal (dni, nombre, apellido, email, rol) VALUES
(20111001, 'Roberto', 'García',    'r.garcia@escuela.edu',  'directivo'),
(20111002, 'María',   'López',     'm.lopez@escuela.edu',   'docente'),
(20111003, 'Carlos',  'Fernández', 'c.fernandez@escuela.edu', 'preceptor'),
(20111004, 'Ana',     'Martínez',  'a.martinez@escuela.edu',  'docente');

-- ============================================================
-- CATEGORIAS (informes escolares — sincronizadas con GIE)
-- ============================================================
INSERT INTO public.categorias (nombre, color) VALUES
('Conducta',    '#ef4444'),
('Disciplina',  '#f97316'),
('Asistencia',  '#3b82f6'),
('Académica',   '#10b981'),
('Otros',       '#94a3b8');

-- ============================================================
-- MATERIAS
-- ============================================================
INSERT INTO public.materias (nombre, descripcion) VALUES
('Matemáticas',         'Álgebra, geometría y análisis'),
('Lengua y Literatura', 'Gramática, literatura y expresión oral'),
('Física',              'Mecánica, termodinámica y electromagnetismo'),
('Programación',        'Algoritmos y estructuras de datos'),
('Historia',            'Historia argentina y mundial');

-- ============================================================
-- RELACIÓN PERSONAL-MATERIA
-- ============================================================
INSERT INTO public.personal_materia (dni_personal, id_materia) VALUES
(20111002, 1), (20111002, 2), (20111004, 3), (20111004, 4);

-- ============================================================
-- INFORMES (ejemplos con schema completo de GIE)
-- ============================================================
INSERT INTO public.informes (dni_alumno, id_categoria, tipo_falta, titulo, instancia, resumen, estado, dni_creador, dni_revisor, fecha, fecha_creacion, fecha_revision, fecha_reunion, numero, observaciones) VALUES
(40000014, 5, 'Otra', 'Interrupción reiterada de clase', 'leve', 'El alumno interrumpió la clase en múltiples ocasiones pese a las advertencias del docente.', 'archivado', 20111002, 20111001, '2026-04-12', '2026-04-12 09:00:00+00', '2026-04-13 11:00:00+00', '2026-04-30', 202600001, 'Se contactó a los padres por teléfono.'),
(40000014, 1, 'Conducta', 'Discusión verbal con compañero', 'grave', 'Discusión verbal elevada con un compañero que interrumpió las clases aledañas.', 'archivado', 20111002, 20111003, '2026-03-20', '2026-03-20 09:15:00+00', '2026-03-21 10:00:00+00', NULL, 202600002, 'Ambos alumnos fueron llamados a coordinación.'),
(40000014, 2, 'Disciplina', 'Encendido de fuego en patio', 'muy_grave', 'El alumno encendió una hoja de papel en el patio durante el recreo, poniendo en riesgo la seguridad.', 'archivado', 20111003, 20111001, '2026-04-14', '2026-04-14 12:30:00+00', '2026-04-15 10:00:00+00', NULL, 202600003, 'Se aplicó sanción de suspensión de 2 días.'),
(40000015, 2, 'Disciplina', 'Fuga del aula sin permiso', 'grave', 'El alumno abandonó el aula durante la clase sin solicitar permiso al docente.', 'archivado', 20111002, 20111001, '2026-04-05', '2026-04-05 15:00:00+00', '2026-04-06 08:30:00+00', '2026-04-28', 202600004, 'Volvió a los 15 minutos.'),
(40000015, 3, 'Asistencia', 'Ausencia injustificada de 2 días', 'leve', 'Faltó dos días consecutivos sin presentar justificación.', 'derivado', 20111002, NULL, '2026-04-18', '2026-04-18 09:00:00+00', NULL, NULL, 202600005, NULL),
(40000007, 3, 'Asistencia', 'Llegadas tarde consecutivas', 'leve', 'El alumno acumula 5 llegadas tarde en el mes sin justificación.', 'revisado', 20111003, 20111001, '2026-04-12', '2026-04-12 08:15:00+00', '2026-04-16 10:00:00+00', NULL, 202600006, 'Padres notificados por mail.'),
(40000003, 5, 'Otra', 'Olvido de materiales reiterado', 'leve', 'La alumna olvidó los materiales necesarios para la clase de educación física por tercera vez.', 'revisado', 20111003, 20111001, '2026-04-14', '2026-04-14 07:50:00+00', '2026-04-14 12:00:00+00', NULL, 202600007, 'Se le prestó material del depósito.'),
(40000003, 1, 'Conducta', 'Empujón a compañero en fila', 'leve', 'Empujó a un compañero mientras esperaban en la fila del comedor.', 'pendiente', 20111002, NULL, '2026-04-22', '2026-04-22 12:30:00+00', NULL, NULL, 202600008, NULL),
(40000004, 1, 'Conducta', 'Falta de respeto hacia un compañero', 'grave', 'Durante el recreo, utilizó un lenguaje inapropiado hacia un compañero generando un incidente.', 'revisado', 20111002, 20111001, '2026-04-15', '2026-04-15 11:00:00+00', '2026-04-15 14:00:00+00', NULL, 202600009, 'Se medió conversación entre ambas partes.'),
(40000004, 2, 'Disciplina', 'Uso de celular durante clase', 'leve', 'Fue sorprendida utilizando el celular durante la clase de historia.', 'pendiente', 20111003, NULL, '2026-04-20', '2026-04-20 10:00:00+00', NULL, NULL, 202600010, NULL);
