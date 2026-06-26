import { config } from '../config.js';

export function errorHandler(err, req, res, next) {
  console.error('[Nexus Backend] Error:', err);

  if (err.status && err.message) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'El recurso ya existe' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Violación de restricción referencial' });
  }

  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Tipo de dato inválido' });
  }

  return res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Error interno del servidor' : err.message,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}
