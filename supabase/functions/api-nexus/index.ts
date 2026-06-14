// ============================================================
// NEXUS API Gateway — Edge Function (solo lectura)
//
// Único punto de entrada para proyectos externos.
// Valida API key, chequea permisos de lectura, ejecuta SELECT y audita.
//
// Deploy:
//   supabase functions deploy api-nexus
//
// Uso:
//   POST https://<project>.supabase.co/functions/v1/api-nexus
//   Headers: { "x-api-key": "nx_...", "Content-Type": "application/json" }
//   Body:    { "tabla": "alumnos", "datos": { ... } }
//
// La BD de Nexus es de solo lectura para proyectos externos.
// No se exponen operaciones de escritura.
// ============================================================

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

// ---- Configuración ----
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Tablas permitidas (whitelist para evitar acceso a tablas del sistema).
// Solo tablas reales del modelo escolar actual.
const TABLAS_PERMITIDAS = new Set([
  'alumnos', 'responsables', 'personal', 'cursos', 'materias',
  'personal_materia'
])

// Rate limit simple en memoria (por instancia de Edge Function)
// Nota: las instancias son efímeras, esto no es perfecto pero frena abuso básico.
interface RateEntry { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateEntry>()
const RATE_LIMIT_MAX = 100        // requests
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minuto

// ---- Helpers ----

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

function cleanRateLimitMap() {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}

// Limpiar entradas viejas cada 5 minutos
setInterval(cleanRateLimitMap, 300000)

interface ApiResponse {
  data?: unknown
  error?: string
  meta?: { duracionMs: number }
}

// ---- Handler principal ----

Deno.serve(async (req: Request) => {
  const startedAt = Date.now()
  const ip = getClientIp(req)

  // 1. Solo POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 2. Rate limiting
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 3. Validar API key
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Falta header x-api-key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 4. Parsear body
  let body: { tabla?: string; datos?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { tabla, datos = {} } = body

  if (!tabla || !TABLAS_PERMITIDAS.has(tabla)) {
    return new Response(JSON.stringify({ error: 'Tabla no permitida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 5. Conectar a Supabase con Service Role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // 6. Validar API key contra tabla proyectos
  const { data: proyecto, error: errProyecto } = await supabase
    .from('proyectos')
    .select('nombre, slug, permisos, activo, ip_permitida')
    .eq('api_key', apiKey)
    .eq('activo', true)
    .single()

  if (errProyecto || !proyecto) {
    await logRequest(supabase, { ip, proyectoSlug: null, tabla: tabla || null, exito: false, error: 'API key inválida o inactiva', duracionMs: Date.now() - startedAt, responseStatus: 401 })
    return new Response(JSON.stringify({ error: 'API key inválida o inactiva' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 7. Validar IP si está restringida
  if (proyecto.ip_permitida && proyecto.ip_permitida !== ip) {
    await logRequest(supabase, { ip, proyectoSlug: proyecto.slug, tabla: tabla || null, exito: false, error: 'IP no permitida', duracionMs: Date.now() - startedAt, responseStatus: 403 })
    return new Response(JSON.stringify({ error: 'IP no permitida' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 8. Validar permisos de lectura
  const tablasPermitidas = proyecto.permisos as string[] | undefined
  if (!Array.isArray(tablasPermitidas) || !tablasPermitidas.includes(tabla)) {
    await logRequest(supabase, { ip, proyectoSlug: proyecto.slug, tabla: tabla || null, exito: false, error: 'Sin permiso de lectura para esta tabla', duracionMs: Date.now() - startedAt, responseStatus: 403 })
    return new Response(JSON.stringify({ error: `Proyecto '${proyecto.slug}' no tiene permiso de lectura sobre '${tabla}'` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 9. Ejecutar SELECT
  let result: ApiResponse = {}
  let status = 200

  try {
    result = await execSelect(supabase, tabla, datos)
    if (result.error) {
      status = 400
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    result = { error: msg }
    status = 500
  }

  const duracionMs = Date.now() - startedAt

  // 10. Auditar
  await logRequest(supabase, {
    ip,
    proyectoSlug: proyecto.slug,
    tabla: tabla || null,
    exito: status < 400 && !result.error,
    error: result.error || null,
    duracionMs,
    requestBody: body as Record<string, unknown>,
    responseStatus: status
  })

  // 11. Responder
  const responseBody: ApiResponse = {
    ...result,
    meta: { duracionMs }
  }

  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Nexus-Proyecto': proyecto.slug
    }
  })
})

// ---- Ejecutor de lectura ----

async function execSelect(
  supabase: SupabaseClient,
  tabla: string,
  datos: Record<string, unknown>
): Promise<ApiResponse> {
  const campos = (datos.campos as string) || '*'
  const filtros = (datos.filtros as Record<string, unknown>) || {}
  const orden = datos.orden as { columna?: string; ascendente?: boolean } | undefined
  const limite = typeof datos.limite === 'number' ? datos.limite : 100
  const offset = typeof datos.offset === 'number' ? datos.offset : 0

  let query = supabase.from(tabla).select(campos)

  // Aplicar filtros simples (eq)
  for (const [key, value] of Object.entries(filtros)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value)
    }
  }

  if (orden?.columna) {
    query = query.order(orden.columna, { ascending: orden.ascendente ?? true })
  }

  query = query.range(offset, offset + limite - 1)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { data }
}

// ---- Auditoría ----

interface LogPayload {
  ip: string
  proyectoSlug: string | null
  tabla: string | null
  exito: boolean
  error: string | null
  duracionMs: number
  requestBody?: Record<string, unknown>
  responseStatus: number
}

async function logRequest(supabase: SupabaseClient, payload: LogPayload) {
  try {
    await supabase.from('api_logs').insert({
      proyecto_slug: payload.proyectoSlug,
      ip: payload.ip,
      metodo: 'POST',
      tabla: payload.tabla,
      operacion: 'select',
      exito: payload.exito,
      error: payload.error,
      duracion_ms: payload.duracionMs,
      request_body: payload.requestBody || {},
      response_status: payload.responseStatus
    })
  } catch {
    // Silenciar errores de logging para no romper el request
  }
}
