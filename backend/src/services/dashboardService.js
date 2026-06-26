import { query } from '../db.js';

const TABLAS_CONTAR = [
  'alumnos',
  'personal',
  'cursos',
  'materias',
  'responsables',
  'roles',
  'domicilios',
];

export async function obtenerStats() {
  const queries = TABLAS_CONTAR.map(tabla =>
    query(`SELECT COUNT(*)::int AS total FROM public.${tabla}`).then(r => ({
      tabla,
      total: r.rows[0]?.total || 0,
    }))
  );

  const resultados = await Promise.all(queries);
  const stats = {};
  resultados.forEach(r => { stats[r.tabla] = r.total; });

  // Proyectos conectados: siempre 1 por ahora (GIE)
  stats.proyectos = 1;

  return stats;
}
