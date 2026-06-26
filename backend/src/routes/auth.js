import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { validateBodyCampos } from '../middleware/validate.js';
import * as authService from '../services/authService.js';

const router = Router();

router.post('/login', authRateLimit, validateBodyCampos, async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const usuario = await authService.getMe(req.user.id);
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    res.json({ usuario });
  } catch (err) {
    next(err);
  }
});

export default router;
