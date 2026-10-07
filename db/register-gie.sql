-- ============================================================
-- Registrar Proyecto GIE en el API Gateway de Nexus
-- ============================================================

INSERT INTO public.proyectos (nombre, slug, api_key, permisos, activo)
VALUES (
    'Gestor de Informes Escolares',
    'gie',
    'nx_gie_f8a92b3c4d5e6f7a',
    '["alumnos", "cursos", "materias"]'::jsonb,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    permisos = EXCLUDED.permisos,
    activo = true;
