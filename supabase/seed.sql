-- ============================================================
-- NEXUS - Seed / Datos de demostración (sincronizados con GIE)
-- Ejecutar después de aplicar schema.sql
-- ============================================================

-- Limpiar datos previos
TRUNCATE public.informes, public.asistencias, public.evaluaciones, public.personal_materia, public.alumnos, public.personal, public.materias, public.cursos RESTART IDENTITY CASCADE;

-- ============================================================
-- CURSOS (combinaciones usadas por GIE)
-- ============================================================
INSERT INTO public.cursos (anio, division, turno, especialidad) VALUES
(1, '1', 'Mañana', NULL),
(1, '2', 'Mañana', NULL),
(1, '3', 'Tarde',  NULL),
(2, '1', 'Tarde',  NULL),
(2, '2', 'Noche',  NULL),
(2, '3', 'Noche',  NULL),
(3, '1', 'Noche',  NULL),
(3, '2', 'Mañana', NULL),
(3, '3', 'Tarde',  NULL),
(4, '1', 'Tarde',  NULL),
(4, '2', 'Noche',  NULL),
(4, '3', 'Mañana', NULL),
(5, '1', 'Mañana', NULL),
(5, '2', 'Tarde',  NULL),
(5, '3', 'Noche',  NULL),
(6, '1', 'Noche',  NULL),
(6, '2', 'Mañana', NULL),
(6, '3', 'Tarde',  NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ALUMNOS (40 estudiantes sincronizados con GIE)
-- GIE usa UUID; Nexus usa DNI como PK. DNIs asignados: 40000000–40000039
-- ============================================================
INSERT INTO public.alumnos (dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, id_curso) VALUES
(40000000, 'Lucas',       'Alvarez',     NULL, NULL, '1', 'Mañana', NULL, NULL, 1),
(40000001, 'Sofía',       'Benítez',     NULL, NULL, '1', 'Mañana', NULL, NULL, 1),
(40000002, 'Mateo',       'Castro',      NULL, NULL, '2', 'Mañana', NULL, NULL, 2),
(40000003, 'Valentina',   'Díaz',        NULL, NULL, '2', 'Mañana', NULL, NULL, 2),
(40000004, 'Thiago',      'Espósito',    NULL, NULL, '3', 'Tarde',  NULL, NULL, 3),
(40000005, 'Camila',      'Fernández',   NULL, NULL, '3', 'Tarde',  NULL, NULL, 3),
(40000006, 'Benjamín',    'García',      NULL, NULL, '1', 'Tarde',  NULL, NULL, 4),
(40000007, 'Isabella',    'Hernández',   NULL, NULL, '1', 'Tarde',  NULL, NULL, 4),
(40000008, 'Santiago',    'Ibáñez',      NULL, NULL, '2', 'Tarde',  NULL, NULL, 5),
(40000009, 'Martina',     'Jiménez',     NULL, NULL, '2', 'Noche',  NULL, NULL, 6),
(40000010, 'Emiliano',    'Klein',       NULL, NULL, '3', 'Noche',  NULL, NULL, 7),
(40000011, 'Julieta',     'Luna',        NULL, NULL, '3', 'Noche',  NULL, NULL, 7),
(40000012, 'Máximo',      'Moreno',      NULL, NULL, '1', 'Noche',  NULL, NULL, 8),
(40000013, 'Victoria',    'Navarro',     NULL, NULL, '1', 'Mañana', NULL, NULL, 9),
(40000014, 'Bruno',       'Ortiz',       NULL, NULL, '2', 'Mañana', NULL, NULL, 10),
(40000015, 'Catalina',    'Pérez',       NULL, NULL, '2', 'Mañana', NULL, NULL, 10),
(40000016, 'Tomás',       'Quinteros',   NULL, NULL, '3', 'Tarde',  NULL, NULL, 11),
(40000017, 'Emma',        'Ramírez',     NULL, NULL, '3', 'Tarde',  NULL, NULL, 11),
(40000018, 'Facundo',     'Silva',       NULL, NULL, '1', 'Tarde',  NULL, NULL, 12),
(40000019, 'Agustina',    'Torres',      NULL, NULL, '1', 'Noche',  NULL, NULL, 13),
(40000020, 'Joaquín',     'Vargas',      NULL, NULL, '2', 'Noche',  NULL, NULL, 14),
(40000021, 'Morena',      'Wainstein',   NULL, NULL, '2', 'Noche',  NULL, NULL, 14),
(40000022, 'Bautista',    'Yáñez',       NULL, NULL, '3', 'Mañana', NULL, NULL, 15),
(40000023, 'Milagros',    'Zabala',      NULL, NULL, '3', 'Mañana', NULL, NULL, 15),
(40000024, 'Dante',       'Acosta',      NULL, NULL, '1', 'Mañana', NULL, NULL, 16),
(40000025, 'Renata',      'Bravo',       NULL, NULL, '1', 'Mañana', NULL, NULL, 16),
(40000026, 'León',        'Cabrera',     NULL, NULL, '2', 'Tarde',  NULL, NULL, 17),
(40000027, 'Antonella',   'Domínguez',   NULL, NULL, '2', 'Tarde',  NULL, NULL, 17),
(40000028, 'Francisco',   'Escobar',     NULL, NULL, '3', 'Noche',  NULL, NULL, 18),
(40000029, 'Guadalupe',   'Flores',      NULL, NULL, '3', 'Noche',  NULL, NULL, 18),
(40000030, 'Ignacio',     'Guzmán',      NULL, NULL, '1', 'Noche',  NULL, NULL, 19),
(40000031, 'Aitana',      'Herrera',     NULL, NULL, '1', 'Noche',  NULL, NULL, 19),
(40000032, 'Valentino',   'Ibarra',      NULL, NULL, '2', 'Mañana', NULL, NULL, 20),
(40000033, 'Cecilia',     'Juárez',      NULL, NULL, '2', 'Mañana', NULL, NULL, 20),
(40000034, 'Sebastián',   'Kovacs',      NULL, NULL, '3', 'Tarde',  NULL, NULL, 21),
(40000035, 'Florencia',   'Lagos',       NULL, NULL, '3', 'Tarde',  NULL, NULL, 21),
(40000036, 'Matías',      'Molina',      NULL, NULL, '1', 'Mañana', NULL, NULL, 22),
(40000037, 'Rocío',       'Nuñez',       NULL, NULL, '2', 'Tarde',  NULL, NULL, 23),
(40000038, 'Nicolás',     'Ortega',      NULL, NULL, '1', 'Noche',  NULL, NULL, 24),
(40000039, 'Paula',       'Peralta',     NULL, NULL, '1', 'Mañana', NULL, NULL, 25)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PERSONAL
-- ============================================================
INSERT INTO public.personal (dni, nombre, apellido, email, rol) VALUES
(20111001, 'Roberto', 'García',    'r.garcia@escuela.edu',  'directivo'),
(20111002, 'María',   'López',     'm.lopez@escuela.edu',   'docente'),
(20111003, 'Carlos',  'Fernández', 'c.fernandez@escuela.edu', 'preceptor'),
(20111004, 'Ana',     'Martínez',  'a.martinez@escuela.edu',  'docente')
ON CONFLICT DO NOTHING;

-- ============================================================
-- MATERIAS
-- ============================================================
INSERT INTO public.materias (nombre, descripcion) VALUES
('Matemáticas',         'Álgebra, geometría y análisis'),
('Lengua y Literatura', 'Gramática, literatura y expresión oral'),
('Física',              'Mecánica, termodinámica y electromagnetismo'),
('Programación',        'Algoritmos y estructuras de datos'),
('Historia',            'Historia argentina y mundial')
ON CONFLICT DO NOTHING;

-- ============================================================
-- RELACIÓN PERSONAL-MATERIA
-- ============================================================
INSERT INTO public.personal_materia (dni_personal, id_materia) VALUES
(20111002, 1),
(20111002, 2),
(20111004, 3),
(20111004, 4)
ON CONFLICT DO NOTHING;
