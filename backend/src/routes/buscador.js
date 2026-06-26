import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { validateBuscarTabla } from '../middleware/validate.js';
import * as buscadorService from '../services/buscadorService.js';

const router = Router();

router.get('/buscar/:tabla', apiRateLimit, requireAuth, validateBuscarTabla, async (req, res, next) => {
  try {
    const { tabla } = req.params;
    const termino = req.query.term || '';
    const limite = req.query.limite;

    // Los filtros son todos los query params excepto term y limite
    const filtros = { ...req.query };
    delete filtros.term;
    delete filtros.limite;

    const data = await buscadorService.buscar(tabla, { termino, filtros, limite });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/registros/:tabla/:campo/:id', apiRateLimit, requireAuth, validateBuscarTabla, async (req, res, next) => {
  try {
    const { tabla, campo, id } = req.params;
    const data = await buscadorService.detalle(tabla, campo, id);
    if (!data) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/tablas/:tabla/opciones-filtros', apiRateLimit, requireAuth, validateBuscarTabla, async (req, res, next) => {
  try {
    const { tabla } = req.params;
    const opciones = await buscadorService.opcionesFiltros(tabla);
    res.json({ opciones });
  } catch (err) {
    next(err);
  }
});

export default router;
