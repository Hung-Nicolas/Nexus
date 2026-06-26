import { query } from '../db.js';
import { esTablaPermitidaGateway } from '../lib/configTablas.js';

const LIMITE_DEFAULT = 100;
const LIMITE_MAX = 1000;

function getClientIp(req) {
  return req.headers['x-forwarded-for']
    || req.headers['x-real-ip']
    || req.socket.remoteAddress
    || 'unknown';
}

async function logRequest({ ip, proyectoSlug, tabla, exito, error, duracionMs, requestBody, responseStatus }) {
  try {
    await query(
      `INSERT INTO public.api_logs
       (proyecto_slug, ip, metodo, tabla, operacion, exito, error, duracion_ms, request_body, response_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        proyectoSlug,
        ip,
        'POST',
        tabla,
        'select',
        exito,
        error,
        duracionMs,
        requestBody || {},
        responseStatus,
      ]
    );
  } catch (err) {
    console.error('[Nexus Backend] Error al auditar gateway:', err);
  }
}

async function execSelect(tabla, datos) {
  const campos = typeof datos.campos === 'string' ? datos.campos : '*';
  const filtros = typeof datos.filtros === 'object' && datos.filtros ? datos.filtros : {};
  const orden = datos.orden || {};
  const limite = Math.min(
    typeof datos.limite === 'number' ? datos.limite : LIMITE_DEFAULT,
    LIMITE_MAX
  );
  const offset = typeof datos.offset === 'number' ? datos.offset : 0;

  // Whitelist básica de campos (evitar inyección en el SELECT)
  const camposSanitizados = campos.split(',').map(c => c.trim()).filter(Boolean).join(', ');
  if (!camposSanitizados) {
    throw { status: 400, message: 'Campos inválidos' };
  }

  let sql = `SELECT ${camposSanitizados} FROM public.${tabla}`;
  const params = [];
  let idx = 1;
  const conditions = [];

  for (const [key, value] of Object.entries(filtros)) {
    if (value === undefined || value === null) continue;
    // Solo se permiten claves alfanuméricas con guiones bajos
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      throw { status: 400, message: `Filtro inválido: ${key}` };
    }
    conditions.push(`${key} = $${idx++}`);
    params.push(value);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  if (orden.columna && /^[a-zA-Z0-9_]+$/.test(orden.columna)) {
    const direction = orden.ascendente === false ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${orden.columna} ${direction}`;
  }

  sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limite, offset);

  const { rows, error } = await query(sql, params);
  if (error) {
    throw { status: 400, message: error.message };
  }
  return rows;
}

export async function procesarGateway(req) {
  const startedAt = Date.now();
  const ip = getClientIp(req);
  const apiKey = req.headers['x-api-key'];
  const { tabla, datos = {} } = req.body || {};

  if (!tabla || !esTablaPermitidaGateway(tabla)) {
    await logRequest({
      ip,
      proyectoSlug: null,
      tabla: tabla || null,
      exito: false,
      error: 'Tabla no permitida',
      duracionMs: Date.now() - startedAt,
      requestBody: req.body,
      responseStatus: 400,
    });
    return { status: 400, body: { error: 'Tabla no permitida' } };
  }

  if (!apiKey) {
    await logRequest({
      ip,
      proyectoSlug: null,
      tabla,
      exito: false,
      error: 'Falta header x-api-key',
      duracionMs: Date.now() - startedAt,
      requestBody: req.body,
      responseStatus: 401,
    });
    return { status: 401, body: { error: 'Falta header x-api-key' } };
  }

  const { rows: proyectoRows } = await query(
    `SELECT nombre, slug, permisos, activo, ip_permitida
     FROM public.proyectos
     WHERE api_key = $1`,
    [apiKey]
  );

  const proyecto = proyectoRows[0];

  if (!proyecto || !proyecto.activo) {
    await logRequest({
      ip,
      proyectoSlug: proyecto?.slug || null,
      tabla,
      exito: false,
      error: 'API key inválida o inactiva',
      duracionMs: Date.now() - startedAt,
      requestBody: req.body,
      responseStatus: 401,
    });
    return { status: 401, body: { error: 'API key inválida o inactiva' } };
  }

  if (proyecto.ip_permitida && proyecto.ip_permitida !== ip) {
    await logRequest({
      ip,
      proyectoSlug: proyecto.slug,
      tabla,
      exito: false,
      error: 'IP no permitida',
      duracionMs: Date.now() - startedAt,
      requestBody: req.body,
      responseStatus: 403,
    });
    return { status: 403, body: { error: 'IP no permitida' } };
  }

  const tablasPermitidas = Array.isArray(proyecto.permisos) ? proyecto.permisos : [];
  if (!tablasPermitidas.includes(tabla)) {
    await logRequest({
      ip,
      proyectoSlug: proyecto.slug,
      tabla,
      exito: false,
      error: 'Sin permiso de lectura para esta tabla',
      duracionMs: Date.now() - startedAt,
      requestBody: req.body,
      responseStatus: 403,
    });
    return { status: 403, body: { error: `Proyecto '${proyecto.slug}' no tiene permiso de lectura sobre '${tabla}'` } };
  }

  let data;
  let errorMsg = null;
  let status = 200;

  try {
    data = await execSelect(tabla, datos);
  } catch (err) {
    status = err.status || 500;
    errorMsg = err.message || 'Error interno';
  }

  const duracionMs = Date.now() - startedAt;

  await logRequest({
    ip,
    proyectoSlug: proyecto.slug,
    tabla,
    exito: status < 400 && !errorMsg,
    error: errorMsg,
    duracionMs,
    requestBody: req.body,
    responseStatus: status,
  });

  const body = { meta: { duracionMs } };
  if (errorMsg) {
    body.error = errorMsg;
  } else {
    body.data = data;
  }

  return { status, body, proyectoSlug: proyecto.slug };
}
