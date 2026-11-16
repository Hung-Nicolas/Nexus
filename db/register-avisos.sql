-- ============================================================
-- Registrar Proyecto Avisos Escolares en el API Gateway de Nexus
-- ============================================================

INSERT INTO public.proyectos (nombre, slug, api_key, permisos, activo, descripcion)
VALUES (
    'Sistema de Avisos Escolares',
    'avisos',
    'nx_avisos_9b4e1c2d3a5f6071',
    '["alumnos", "cursos", "responsables", "personal", "personal_rol", "roles"]'::jsonb,
    true,
    'Plataforma de comunicados escolares, lectura estudiantil y notificaciones SMTP a familias'
)
ON CONFLICT (slug) DO UPDATE SET
    api_key = EXCLUDED.api_key,
    permisos = EXCLUDED.permisos,
    activo = true,
    descripcion = EXCLUDED.descripcion;
