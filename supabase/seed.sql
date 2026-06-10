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
