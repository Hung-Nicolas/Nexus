import { Router } from 'express';
import { gatewayRateLimit } from '../middleware/rateLimit.js';
import { validateGatewayTabla } from '../middleware/validate.js';
import * as gatewayService from '../services/gatewayService.js';

const router = Router();

router.post('/gateway', gatewayRateLimit, validateGatewayTabla, async (req, res, next) => {
  try {
    const { status, body, proyectoSlug } = await gatewayService.procesarGateway(req);
    res.setHeader('X-Nexus-Proyecto', proyectoSlug || '');
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
