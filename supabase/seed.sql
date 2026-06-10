-- ============================================================
-- NEXUS - Seed / Datos de demostración
-- Ejecutar después de aplicar schema.sql
-- ============================================================

INSERT INTO public.cursos (anio, division, turno, especialidad) VALUES
(1, '1°', 'Mañana', 'Informática'),
(1, '2°', 'Mañana', 'Informática'),
(2, '1°', 'Mañana', 'Electrónica'),
(2, '2°', 'Mañana', 'Electrónica'),
(3, '1°', 'Tarde', 'Mecánica')
ON CONFLICT DO NOTHING;

INSERT INTO public.alumnos (dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, id_curso) VALUES
(40123001, 'Lucas', 'Alvarez', 'lucas.alvarez@escuela.edu', 'Informática', '1°', 'Mañana', 'padre.alvarez@email.com', '1155667788', 1),
(40123002, 'Sofía', 'Benítez', 'sofia.benitez@escuela.edu', 'Informática', '1°', 'Mañana', 'padre.benitez@email.com', '1155667799', 1),
(40123003, 'Mateo', 'Castro', 'mateo.castro@escuela.edu', 'Informática', '2°', 'Mañana', 'padre.castro@email.com', '1155667800', 2),
(40123004, 'Valentina', 'Díaz', 'valentina.diaz@escuela.edu', 'Electrónica', '1°', 'Mañana', 'padre.diaz@email.com', '1155667811', 3),
(40123005, 'Thiago', 'Espósito', 'thiago.esposito@escuela.edu', 'Electrónica', '2°', 'Mañana', 'padre.esposito@email.com', '1155667822', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.personal (dni, nombre, apellido, email, rol) VALUES
(20111001, 'Roberto', 'García', 'r.garcia@escuela.edu', 'directivo'),
(20111002, 'María', 'López', 'm.lopez@escuela.edu', 'docente'),
(20111003, 'Carlos', 'Fernández', 'c.fernandez@escuela.edu', 'preceptor'),
(20111004, 'Ana', 'Martínez', 'a.martinez@escuela.edu', 'docente')
ON CONFLICT DO NOTHING;

INSERT INTO public.materias (nombre, descripcion) VALUES
('Matemáticas', 'Álgebra, geometría y análisis'),
('Lengua y Literatura', 'Gramática, literatura y expresión oral'),
('Física', 'Mecánica, termodinámica y electromagnetismo'),
('Programación', 'Algoritmos y estructuras de datos'),
('Historia', 'Historia argentina y mundial')
ON CONFLICT DO NOTHING;

INSERT INTO public.personal_materia (dni_personal, id_materia) VALUES
(20111002, 1),
(20111002, 2),
(20111004, 3),
(20111004, 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.evaluaciones (dni_alumno, id_materia, nota, tipo, fecha) VALUES
(40123001, 1, 8.50, 'parcial', '2026-05-10'),
(40123001, 2, 9.00, 'trabajo_practico', '2026-05-15'),
(40123002, 1, 7.00, 'parcial', '2026-05-10'),
(40123003, 4, 10.00, 'exposicion', '2026-05-20')
ON CONFLICT DO NOTHING;

INSERT INTO public.asistencias (dni_alumno, fecha, estado) VALUES
(40123001, '2026-06-09', 'presente'),
(40123002, '2026-06-09', 'presente'),
(40123003, '2026-06-09', 'ausente'),
(40123004, '2026-06-09', 'tarde')
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (dni_alumno, dni_personal, fecha, observacion) VALUES
(40123003, 20111003, '2026-06-01', 'El alumno presenta dificultades de puntualidad recurrentes. Se acordó plan de seguimiento con los padres.'),
(40123001, 20111002, '2026-06-05', 'Excelente desempeño en el último proyecto grupal. Destaca por liderazgo y organización.')
ON CONFLICT DO NOTHING;
