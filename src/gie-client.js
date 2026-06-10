import { createClient } from '@supabase/supabase-js';

const GIE_URL = import.meta.env.VITE_GIE_URL || '';
const GIE_KEY = import.meta.env.VITE_GIE_ANON_KEY || '';

const URL_VALIDA = typeof GIE_URL === 'string' && /^https?:\/\//.test(GIE_URL);
const KEY_VALIDA = typeof GIE_KEY === 'string' && GIE_KEY.length > 20;

export const GIE_ENABLED = URL_VALIDA && KEY_VALIDA;
export let gieClient = null;

if (GIE_ENABLED) {
  try {
    gieClient = createClient(GIE_URL, GIE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    window.gieClient = gieClient;
  } catch (err) {
    console.error('[GIE] Error inicializando cliente:', err);
  }
}

export async function enviarInformeAGIE(dniAlumno, categoriaNombre, tipoFalta, titulo, instancia, resumen, estado = 'pendiente') {
  if (!GIE_ENABLED || !gieClient) {
    console.warn('[GIE] Cliente no configurado. Saltando envío.');
    return { ok: false, error: 'GIE no configurado' };
  }

  try {
    const { data, error } = await gieClient.rpc('recibir_informe_nexus', {
      p_dni_alumno: dniAlumno,
      p_categoria_nombre: categoriaNombre,
      p_tipo_falta: tipoFalta,
      p_titulo: titulo,
      p_instancia: instancia,
      p_resumen: resumen,
      p_estado: estado
    });

    if (error) throw error;
    console.log('[GIE] Informe enviado correctamente. ID:', data);
    return { ok: true, gieId: data };
  } catch (err) {
    console.error('[GIE] Error enviando informe:', err);
    return { ok: false, error: err.message };
  }
}
