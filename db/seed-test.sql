-- ============================================================
-- NEXUS - Seed de datos de PRUEBA (solo desarrollo)
--
-- Genera datos de ejemplo para probar el buscador, el dashboard
-- y el detalle de registros: cursos, domicilios, alumnos,
-- personal, materias, relaciones y responsables.
--
-- Caracteristicas:
--   * Idempotente: se puede correr varias veces sin duplicar.
--   * No destructivo con datos reales: solo borra/regenera los
--     registros de prueba (DNI en rangos de test y domicilios
--     fijos listados abajo). NUNCA toca otros registros.
--   * NO incluir en docker-entrypoint-initdb.d (no va en produccion).
--
-- Como correrlo:
--   docker exec -i nexus-postgres psql -U nexus -d nexus < db/seed-test.sql
-- o, con psql local:
--   psql -U nexus -d nexus -f db/seed-test.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Limpieza de datos de prueba anteriores (solo rangos de test)
-- ------------------------------------------------------------

-- Responsables de alumnos de test (se recrean abajo)
DELETE FROM public.responsables
WHERE id_alumno IN (SELECT id FROM public.alumnos
                    WHERE dni BETWEEN 45000000 AND 45999999);

-- Alumnos de test (los responsables asociados ya se borraron)
DELETE FROM public.alumnos
WHERE dni BETWEEN 45000000 AND 45999999;

-- Personal de test (personal_rol y personal_materia se borran en cascada)
DELETE FROM public.personal
WHERE dni BETWEEN 28000000 AND 28999999;

-- Domicilios de test solo si nadie los referencia (por las dudas)
DELETE FROM public.domicilios d
WHERE (d.calle, d.numero, d.localidad) IN (
    ('Av. Siempre Viva', 742,  'Springfield'),
    ('Calle Falsa',      123,  'Springfield'),
    ('Av. Rivadavia',    4500, 'Ciudad Test'),
    ('Belgrano',         890,  'Ciudad Test'),
    ('San Martín',       321,  'Villa Test'),
    ('Mitre',            55,   'Villa Test'),
    ('Pueyrredón',       1670, 'Ciudad Test'),
    ('Sarmiento',        940,  'Springfield')
)
AND NOT EXISTS (SELECT 1 FROM public.alumnos     a WHERE a.id_domicilio = d.id_domicilio)
AND NOT EXISTS (SELECT 1 FROM public.personal    p WHERE p.id_domicilio = d.id_domicilio)
AND NOT EXISTS (SELECT 1 FROM public.responsables r WHERE r.id_domicilio = d.id_domicilio);

-- ------------------------------------------------------------
-- Domicilios
-- ------------------------------------------------------------

INSERT INTO public.domicilios (calle, numero, departamento, localidad) VALUES
    ('Av. Siempre Viva', 742,  NULL, 'Springfield'),
    ('Calle Falsa',      123,  NULL, 'Springfield'),
    ('Av. Rivadavia',    4500, '3A', 'Ciudad Test'),
    ('Belgrano',         890,  NULL, 'Ciudad Test'),
    ('San Martín',       321,  NULL, 'Villa Test'),
    ('Mitre',            55,   NULL, 'Villa Test'),
    ('Pueyrredón',       1670, 'B',  'Ciudad Test'),
    ('Sarmiento',        940,  NULL, 'Springfield');

-- ------------------------------------------------------------
-- Cursos (WHERE NOT EXISTS porque el UNIQUE trata NULLs como distintos)
-- ------------------------------------------------------------

INSERT INTO public.cursos (anio, division, turno, especialidad)
SELECT 1, 'A', 'Mañana', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.cursos
                  WHERE anio = 1 AND division = 'A' AND turno = 'Mañana' AND especialidad IS NULL);

INSERT INTO public.cursos (anio, division, turno, especialidad)
SELECT 2, 'B', 'Tarde', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.cursos
                  WHERE anio = 2 AND division = 'B' AND turno = 'Tarde' AND especialidad IS NULL);

INSERT INTO public.cursos (anio, division, turno, especialidad)
SELECT 3, 'A', 'Mañana', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.cursos
                  WHERE anio = 3 AND division = 'A' AND turno = 'Mañana' AND especialidad IS NULL);

INSERT INTO public.cursos (anio, division, turno, especialidad)
SELECT 4, 'A', 'Mañana', 'Computación'
WHERE NOT EXISTS (SELECT 1 FROM public.cursos
                  WHERE anio = 4 AND division = 'A' AND turno = 'Mañana' AND especialidad = 'Computación');

INSERT INTO public.cursos (anio, division, turno, especialidad)
SELECT 5, 'B', 'Tarde', 'Computación'
WHERE NOT EXISTS (SELECT 1 FROM public.cursos
                  WHERE anio = 5 AND division = 'B' AND turno = 'Tarde' AND especialidad = 'Computación');

INSERT INTO public.cursos (anio, division, turno, especialidad)
SELECT 6, 'A', 'Mañana', 'Automotores'
WHERE NOT EXISTS (SELECT 1 FROM public.cursos
                  WHERE anio = 6 AND division = 'A' AND turno = 'Mañana' AND especialidad = 'Automotores');

-- ------------------------------------------------------------
-- Materias (ON CONFLICT por nombre unico)
-- ------------------------------------------------------------

INSERT INTO public.materias (nombre, descripcion) VALUES
    ('Matemática',        'Análisis matemático, álgebra y geometría'),
    ('Lengua',            'Literatura y lengua castellana'),
    ('Historia',          'Historia argentina y universal'),
    ('Geografía',         'Geografía física, política y económica'),
    ('Física',            'Mecánica, termodinámica y electricidad'),
    ('Química',           'Química general, orgánica e inorgánica'),
    ('Programación',      'Algoritmos, estructuras de datos y POO'),
    ('Base de Datos',     'Modelado, SQL y administración de bases'),
    ('Sistemas Operativos','Instalación, configuración y redes'),
    ('Educación Física',  'Deportes, expresión corporal y salud'),
    ('Inglés',            'Lengua inglesa técnica y general'),
    ('Taller',            'Práctica profesionalizante por especialidad')
ON CONFLICT (nombre) DO NOTHING;

-- ------------------------------------------------------------
-- Alumnos (DNI de test 45000000-45999999, ON CONFLICT por dni unico)
-- ------------------------------------------------------------

INSERT INTO public.alumnos
    (dni, nombre, apellido, email, email_padre, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio, id_curso)
VALUES
    (45000001, 'Lucía',     'González',   'lucia.gonzalez@test.local',   'familia.gonzalez@test.local',   '11 5555-0001', '2011-03-15', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Av. Siempre Viva' AND numero = 742),  (SELECT id_curso FROM public.cursos WHERE anio = 3 AND division = 'A' AND turno = 'Mañana' AND especialidad IS NULL)),
    (45000002, 'Mateo',     'Fernández',  'mateo.fernandez@test.local',  'familia.fernandez@test.local',  '11 5555-0002', '2011-07-22', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Calle Falsa'      AND numero = 123),  (SELECT id_curso FROM public.cursos WHERE anio = 3 AND division = 'A' AND turno = 'Mañana' AND especialidad IS NULL)),
    (45000003, 'Sofía',     'Martínez',   'sofia.martinez@test.local',   'familia.martinez@test.local',   '11 5555-0003', '2010-01-30', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Av. Rivadavia'    AND numero = 4500), (SELECT id_curso FROM public.cursos WHERE anio = 4 AND division = 'A' AND turno = 'Mañana' AND especialidad = 'Computación')),
    (45000004, 'Benjamín',  'López',      'benjamin.lopez@test.local',   'familia.lopez@test.local',      '11 5555-0004', '2010-11-05', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Belgrano'         AND numero = 890),  (SELECT id_curso FROM public.cursos WHERE anio = 4 AND division = 'A' AND turno = 'Mañana' AND especialidad = 'Computación')),
    (45000005, 'Valentina', 'Pérez',      'valentina.perez@test.local',  'familia.perez@test.local',      '11 5555-0005', '2009-05-18', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'San Martín'       AND numero = 321),  (SELECT id_curso FROM public.cursos WHERE anio = 5 AND division = 'B' AND turno = 'Tarde'   AND especialidad = 'Computación')),
    (45000006, 'Thiago',    'Ramírez',    'thiago.ramirez@test.local',   'familia.ramirez@test.local',    '11 5555-0006', '2009-09-09', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Mitre'            AND numero = 55),   (SELECT id_curso FROM public.cursos WHERE anio = 5 AND division = 'B' AND turno = 'Tarde'   AND especialidad = 'Computación')),
    (45000007, 'Emma',      'Torres',     'emma.torres@test.local',      'familia.torres@test.local',     '11 5555-0007', '2009-02-27', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Pueyrredón'       AND numero = 1670), (SELECT id_curso FROM public.cursos WHERE anio = 5 AND division = 'B' AND turno = 'Tarde'   AND especialidad = 'Computación')),
    (45000008, 'Bautista',  'Sosa',       'bautista.sosa@test.local',    'familia.sosa@test.local',       '11 5555-0008', '2008-08-14', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Sarmiento'        AND numero = 940),  (SELECT id_curso FROM public.cursos WHERE anio = 6 AND division = 'A' AND turno = 'Mañana' AND especialidad = 'Automotores')),
    (45000009, 'Isabella',  'Acosta',     'isabella.acosta@test.local',  'familia.acosta@test.local',     '11 5555-0009', '2008-12-01', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Av. Siempre Viva' AND numero = 742),  (SELECT id_curso FROM public.cursos WHERE anio = 6 AND division = 'A' AND turno = 'Mañana' AND especialidad = 'Automotores')),
    (45000010, 'Gaspar',    'Benítez',    'gaspar.benitez@test.local',   'familia.benitez@test.local',    '11 5555-0010', '2012-04-10', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Calle Falsa'      AND numero = 123),  (SELECT id_curso FROM public.cursos WHERE anio = 2 AND division = 'B' AND turno = 'Tarde'   AND especialidad IS NULL)),
    (45000011, 'Catalina',  'Medina',     'catalina.medina@test.local',  'familia.medina@test.local',     '11 5555-0011', '2012-10-25', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Belgrano'         AND numero = 890),  (SELECT id_curso FROM public.cursos WHERE anio = 2 AND division = 'B' AND turno = 'Tarde'   AND especialidad IS NULL)),
    (45000012, 'Lorenzo',   'Vega',       'lorenzo.vega@test.local',     'familia.vega@test.local',       '11 5555-0012', '2013-06-08', 'Masculino', 'Uruguay',   (SELECT id_domicilio FROM public.domicilios WHERE calle = 'San Martín'       AND numero = 321),  (SELECT id_curso FROM public.cursos WHERE anio = 1 AND division = 'A' AND turno = 'Mañana' AND especialidad IS NULL))
ON CONFLICT (dni) DO NOTHING;

-- ------------------------------------------------------------
-- Personal (DNI de test 28000000-28999999)
-- ------------------------------------------------------------

INSERT INTO public.personal
    (dni, nombre, apellido, email, telefono, fecha_nacimiento, genero, nacionalidad, id_domicilio)
VALUES
    (28000001, 'Ana',        'Ríos',        'ana.rios@test.local',          '11 4444-0001', '1975-04-12', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Av. Rivadavia' AND numero = 4500)),
    (28000002, 'Jorge',      'Castillo',    'jorge.castillo@test.local',    '11 4444-0002', '1980-09-03', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Mitre'         AND numero = 55)),
    (28000003, 'María',      'Delgado',     'maria.delgado@test.local',     '11 4444-0003', '1985-01-20', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Belgrano'      AND numero = 890)),
    (28000004, 'Pablo',      'Herrera',     'pablo.herrera@test.local',     '11 4444-0004', '1978-06-17', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Sarmiento'     AND numero = 940)),
    (28000005, 'Carolina',   'Molina',      'carolina.molina@test.local',   '11 4444-0005', '1990-02-28', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Pueyrredón'    AND numero = 1670)),
    (28000006, 'Diego',      'Ortiz',       'diego.ortiz@test.local',       '11 4444-0006', '1983-12-11', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Calle Falsa'   AND numero = 123)),
    (28000007, 'Ricardo',    'Aguirre',     'ricardo.aguirre@test.local',   '11 4444-0007', '1968-07-30', 'Masculino', 'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'Av. Siempre Viva' AND numero = 742)),
    (28000008, 'Florencia',  'Campos',      'florencia.campos@test.local',  '11 4444-0008', '1992-03-05', 'Femenino',  'Argentina', (SELECT id_domicilio FROM public.domicilios WHERE calle = 'San Martín'    AND numero = 321))
ON CONFLICT (dni) DO NOTHING;

-- ------------------------------------------------------------
-- Relaciones: personal_rol (los roles ya existen por schema.sql)
-- ------------------------------------------------------------

INSERT INTO public.personal_rol (id_personal, id_rol)
SELECT p.id, r.id_rol
FROM public.personal p
CROSS JOIN public.roles r
WHERE p.dni = 28000001 AND r.nombre = 'docente'
   OR p.dni = 28000002 AND r.nombre = 'docente'
   OR p.dni = 28000003 AND r.nombre = 'preceptor'
   OR p.dni = 28000004 AND r.nombre = 'docente'
   OR p.dni = 28000005 AND r.nombre = 'docente'
   OR p.dni = 28000006 AND r.nombre = 'docente'
   OR p.dni = 28000007 AND r.nombre = 'rector'
   OR p.dni = 28000008 AND r.nombre = 'jefe_de_taller'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Relaciones: personal_materia
-- ------------------------------------------------------------

INSERT INTO public.personal_materia (id_personal, id_materia)
SELECT p.id, m.id_materia
FROM public.personal p
CROSS JOIN public.materias m
WHERE (p.dni = 28000001 AND m.nombre IN ('Matemática', 'Física'))
   OR (p.dni = 28000002 AND m.nombre IN ('Programación', 'Base de Datos'))
   OR (p.dni = 28000004 AND m.nombre IN ('Lengua', 'Inglés'))
   OR (p.dni = 28000005 AND m.nombre IN ('Historia', 'Geografía'))
   OR (p.dni = 28000006 AND m.nombre IN ('Sistemas Operativos', 'Taller'))
   OR (p.dni = 28000008 AND m.nombre IN ('Química', 'Taller'))
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Responsables (al menos uno por alumno, vinculos variados)
-- ------------------------------------------------------------

INSERT INTO public.responsables
    (id_alumno, nombre, apellido, telefono, email, fecha_nacimiento, genero, nacionalidad, vinculo, id_domicilio)
SELECT a.id, v.nombre, v.apellido, v.telefono, v.email, v.fecha_nacimiento::date, v.genero, 'Argentina', v.vinculo,
       (SELECT id_domicilio FROM public.domicilios WHERE calle = v.calle AND numero = v.numero)
FROM public.alumnos a
JOIN (VALUES
    (45000001, 'Martín',   'González',  '11 6666-0001', 'martin.gonzalez@test.local',  '1978-05-10', 'Masculino', 'padre', 'Av. Siempre Viva', 742),
    (45000001, 'Paula',    'González',  '11 6666-0002', 'paula.gonzalez@test.local',   '1980-09-14', 'Femenino',  'madre', 'Av. Siempre Viva', 742),
    (45000002, 'Silvia',   'Fernández', '11 6666-0003', 'silvia.fernandez@test.local', '1982-02-21', 'Femenino',  'madre', 'Calle Falsa',      123),
    (45000003, 'Andrés',   'Martínez',  '11 6666-0004', 'andres.martinez@test.local',  '1975-11-02', 'Masculino', 'padre', 'Av. Rivadavia',    4500),
    (45000004, 'Verónica', 'López',     '11 6666-0005', 'veronica.lopez@test.local',   '1983-07-19', 'Femenino',  'madre', 'Belgrano',         890),
    (45000005, 'Gustavo',  'Pérez',     '11 6666-0006', 'gustavo.perez@test.local',    '1970-01-25', 'Masculino', 'padre', 'San Martín',       321),
    (45000006, 'Nadia',    'Ramírez',   '11 6666-0007', 'nadia.ramirez@test.local',    '1986-04-08', 'Femenino',  'madre', 'Mitre',            55),
    (45000007, 'Oscar',    'Torres',    '11 6666-0008', 'oscar.torres@test.local',     '1977-10-30', 'Masculino', 'padre', 'Pueyrredón',       1670),
    (45000008, 'Marcela',  'Sosa',      '11 6666-0009', 'marcela.sosa@test.local',     '1981-06-12', 'Femenino',  'madre', 'Sarmiento',        940),
    (45000009, 'Federico', 'Acosta',    '11 6666-0010', 'federico.acosta@test.local',  '1974-08-23', 'Masculino', 'padre', 'Av. Siempre Viva', 742),
    (45000010, 'Gabriela', 'Benítez',   '11 6666-0011', 'gabriela.benitez@test.local', '1987-12-05', 'Femenino',  'tutor', 'Calle Falsa',      123),
    (45000011, 'Hernán',   'Medina',    '11 6666-0012', 'hernan.medina@test.local',    '1979-03-17', 'Masculino', 'padre', 'Belgrano',         890),
    (45000012, 'Julia',    'Vega',      '11 6666-0013', 'julia.vega@test.local',       '1984-09-29', 'Femenino',  'madre', 'San Martín',       321)
) AS v(dni_alumno, nombre, apellido, telefono, email, fecha_nacimiento, genero, vinculo, calle, numero)
  ON a.dni = v.dni_alumno;

COMMIT;

-- ------------------------------------------------------------
-- Resumen de lo creado
-- ------------------------------------------------------------
SELECT 'cursos'       AS tabla, COUNT(*) AS registros FROM public.cursos
UNION ALL SELECT 'domicilios',   COUNT(*) FROM public.domicilios
UNION ALL SELECT 'alumnos',      COUNT(*) FROM public.alumnos
UNION ALL SELECT 'personal',     COUNT(*) FROM public.personal
UNION ALL SELECT 'materias',     COUNT(*) FROM public.materias
UNION ALL SELECT 'roles',        COUNT(*) FROM public.roles
UNION ALL SELECT 'personal_rol', COUNT(*) FROM public.personal_rol
UNION ALL SELECT 'personal_materia', COUNT(*) FROM public.personal_materia
UNION ALL SELECT 'responsables', COUNT(*) FROM public.responsables
ORDER BY tabla;
