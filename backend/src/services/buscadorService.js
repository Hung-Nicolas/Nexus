import { query } from '../db.js';
import { configTablas, construirSelectConRelaciones } from '../lib/configTablas.js';

const LIMITE_DEFAULT = 50;
const LIMITE_MAX = 200;

function escapeIlike(termino) {
  return termino.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function construirSelectRelaciones(tabla) {
  const config = configTablas[tabla];
  const selectBase = config.campos;
  const joins = [];
  const selectsRel = [];

  for (const [fk, rel] of Object.entries(config.relaciones || {})) {
    joins.push(`LEFT JOIN public.${rel.tabla} ${rel.tabla} ON ${rel.tabla}.${rel.pk} = ${tabla}.${fk}`);
    const camposObj = rel.campos.split(',').map(c => c.trim()).map(c => `'${c}', ${rel.tabla}.${c}`).join(', ');
    selectsRel.push(`jsonb_build_object(${camposObj}) AS ${rel.tabla}`);
  }

  const selectRel = selectsRel.length > 0 ? `, ${selectsRel.join(', ')}` : '';
  return {
    select: `${selectBase}${selectRel}`,
    joins,
  };
}

function construirWhere(tabla, termino, filtros) {
  const config = configTablas[tabla];
  const params = [];
  let idx = 1;
  const conditions = [];

  if (termino) {
    const orConditions = [];
    const esNumero = /^\d+$/.test(termino);

    if (esNumero) {
      const num = parseInt(termino, 10);
      if (tabla === 'alumnos' || tabla === 'personal') {
        orConditions.push(`${tabla}.dni = $${idx++}`);
        params.push(num);
      } else if (tabla === 'cursos') {
        orConditions.push(`${tabla}.anio = $${idx++}`);
        params.push(num);
      } else if (tabla === 'domicilios') {
        orConditions.push(`${tabla}.numero = $${idx++}`);
        params.push(num);
      }
    }

    const pattern = `%${escapeIlike(termino)}%`;
    config.buscarEn.forEach(campo => {
      orConditions.push(`${tabla}.${campo} ILIKE $${idx++}`);
      params.push(pattern);
    });

    if (orConditions.length > 0) {
      conditions.push(`(${orConditions.join(' OR ')})`);
    }
  }

  for (const [key, value] of Object.entries(filtros)) {
    if (value === undefined || value === null || value === '') continue;
    conditions.push(`${tabla}.${key} = $${idx++}`);
    params.push(value);
  }

  return { conditions, params, idx };
}

export async function buscar(tabla, { termino = '', filtros = {}, limite = LIMITE_DEFAULT } = {}) {
  const config = configTablas[tabla];
  const limiteSeguro = Math.min(parseInt(limite, 10) || LIMITE_DEFAULT, LIMITE_MAX);

  const { select, joins } = construirSelectRelaciones(tabla);
  const { conditions, params, idx } = construirWhere(tabla, termino, filtros);

  let sql = `SELECT ${select} FROM public.${tabla}`;
  if (joins.length > 0) {
    sql += ` ${joins.join(' ')}`;
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ` ORDER BY ${tabla}.${config.orden.column} ${config.orden.ascending ? 'ASC' : 'DESC'}`;
  sql += ` LIMIT $${idx}`;
  params.push(limiteSeguro);

  const { rows } = await query(sql, params);
  return rows;
}

export async function detalle(tabla, campo, id) {
  const { select, joins } = construirSelectRelaciones(tabla);

  let sql = `SELECT ${select} FROM public.${tabla}`;
  if (joins.length > 0) {
    sql += ` ${joins.join(' ')}`;
  }
  sql += ` WHERE ${tabla}.${campo} = $1 LIMIT 1`;

  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

export async function opcionesFiltros(tabla) {
  const opciones = {};

  if (tabla === 'cursos') {
    const [esp, anios] = await Promise.all([
      query(`SELECT DISTINCT especialidad FROM public.cursos WHERE especialidad IS NOT NULL ORDER BY especialidad`),
      query(`SELECT DISTINCT anio FROM public.cursos WHERE anio IS NOT NULL ORDER BY anio`),
    ]);
    opciones['cursos.especialidad'] = esp.rows.map(r => r.especialidad);
    opciones['cursos.anio'] = anios.rows.map(r => String(r.anio));
  }

  if (tabla === 'domicilios') {
    const { rows } = await query(`SELECT DISTINCT localidad FROM public.domicilios ORDER BY localidad`);
    opciones['domicilios.localidad'] = rows.map(r => r.localidad);
  }

  return opciones;
}
