import { createClient } from '@supabase/supabase-js'

const GIE_URL = import.meta.env.VITE_GIE_URL || ''
const GIE_KEY = import.meta.env.VITE_GIE_ANON_KEY || ''

const URL_VALIDA = typeof GIE_URL === 'string' && /^https?:\/\//.test(GIE_URL)
const KEY_VALIDA = typeof GIE_KEY === 'string' && GIE_KEY.length > 20 && GIE_KEY.startsWith('eyJ')

export const GIE_ENABLED = URL_VALIDA && KEY_VALIDA

export let gieClient = null

if (GIE_ENABLED) {
  try {
    gieClient = createClient(GIE_URL, GIE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    window.gieClient = gieClient
    console.log('[GIE] Cliente inicializado')
  } catch (err) {
    console.error('[GIE] Error inicializando cliente:', err)
  }
} else {
  console.warn('[GIE] Cliente NO inicializado. URL válida:', URL_VALIDA, '| Key válida:', KEY_VALIDA)
}

/**
 * Envia un informe de Nexus a GIE.
 * Acepta un objeto completo con todos los campos del informe.
 */
export async function enviarInformeAGIE(informe) {
  if (!GIE_ENABLED || !gieClient) {
    console.warn('[GIE] Cliente no configurado. Saltando envío.')
    return { ok: false, error: 'GIE no configurado' }
  }

  try {
    const { data, error } = await gieClient.rpc('recibir_informe_nexus', {
      p_dni_alumno: informe.dni_alumno,
      p_categoria_nombre: informe.categoria_nombre || 'Otros',
      p_tipo_falta: informe.tipo_falta || 'Otra',
      p_titulo: informe.titulo,
      p_instancia: informe.instancia,
      p_resumen: informe.resumen,
      p_estado: informe.estado || 'pendiente',
      p_descargo: informe.descargo || null,
      p_numero: informe.numero || null,
      p_motivo_rechazo: informe.motivo_rechazo || null,
      p_fecha_reunion: informe.fecha_reunion || null,
      p_observaciones: informe.observaciones || null,
      p_fecha_creacion: informe.fecha_creacion || null,
      p_fecha_revision: informe.fecha_revision || null
    })

    if (error) throw error
    console.log('[GIE] Informe enviado correctamente. ID:', data)
    return { ok: true, gieId: data }
  } catch (err) {
    console.error('[GIE] Error enviando informe:', err)
    return { ok: false, error: err.message }
  }
}

/**
 * Lee informes recientes de GIE para sincronización manual.
 */
export async function obtenerInformesDesdeGIE(limite = 50) {
  if (!GIE_ENABLED || !gieClient) {
    return { ok: false, error: 'GIE no configurado', data: [] }
  }

  try {
    const { data, error } = await gieClient
      .from('informes')
      .select(`
        id,
        alumno_id,
        tipo_falta,
        instancia,
        titulo,
        resumen,
        descargo,
        estado,
        creado_por,
        revisado_por,
        fecha_creacion,
        fecha_revision,
        motivo_rechazo,
        fecha_reunion,
        observaciones,
        numero,
        nexus_synced_at,
        categorias(id, nombre),
        alumnos(dni, nombre, apellido)
      `)
      .order('fecha_creacion', { ascending: false })
      .limit(limite)

    if (error) throw error
    return { ok: true, data: data || [] }
  } catch (err) {
    console.error('[GIE] Error leyendo informes:', err)
    return { ok: false, error: err.message, data: [] }
  }
}
