import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import * as dashboardService from '../services/dashboardService.js';

const router = Router();

router.get('/stats', apiRateLimit, requireAuth, async (req, res, next) => {
  try {
    const stats = await dashboardService.obtenerStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

export default router;
