-- Funciones temporales de diagnostico y queries de test
-- Ejecutar en SQL Editor de Supabase

CREATE OR REPLACE FUNCTION public.whoami()
RETURNS TABLE(uid UUID, role TEXT, jwt_sub TEXT, jwt_role TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT
    auth.uid(),
    auth.role(),
    current_setting('request.jwt.claim.sub', true),
    current_setting('request.jwt.claim.role', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.whoami() TO authenticated, anon;


CREATE OR REPLACE FUNCTION public.debug_permiso()
RETURNS TABLE(
  auth_uid UUID,
  auth_role TEXT,
  es_regente BOOLEAN,
  puede_proyectos BOOLEAN,
  rol_perfil TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT
    auth.uid(),
    auth.role(),
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND trim(rol) = 'regente'),
    public.tiene_permiso('proyectos', 'SELECT'),
    (SELECT rol FROM public.perfiles WHERE id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_permiso() TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- TESTS EN SQL EDITOR (simular sesion del usuario admin)
-- Reemplazar el UUID por el user.id del log si es diferente.
-- ============================================================

-- Test 1: simular auth.uid() y auth.role() del usuario logueado
WITH cfg AS (
  SELECT
    set_config('request.jwt.claim.sub', 'fc6eb652-f439-4ce0-8f12-4199dbd8f47e', true) AS sub,
    set_config('request.jwt.claim.role', 'authenticated', true) AS role
)
SELECT
  auth.uid() AS uid,
  auth.role() AS role,
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND trim(rol) = 'regente') AS es_regente,
  public.tiene_permiso('proyectos', 'SELECT') AS puede_proyectos;

-- Test 2: ver perfil del usuario
SELECT id, email, rol, length(rol) AS largo_rol, ascii(rol) AS primer_char
FROM public.perfiles
WHERE id = 'fc6eb652-f439-4ce0-8f12-4199dbd8f47e';

-- Test 3: ver definicion actual de tiene_permiso
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'tiene_permiso';

-- Test 4: politicas de proyectos
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'proyectos';
