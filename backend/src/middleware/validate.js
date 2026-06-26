import { esTablaPermitidaBuscar, esTablaPermitidaGateway } from '../lib/configTablas.js';

export function validateBuscarTabla(req, res, next) {
  const { tabla } = req.params;
  if (!esTablaPermitidaBuscar(tabla)) {
    return res.status(400).json({ error: 'Tabla no permitida' });
  }
  next();
}

export function validateGatewayTabla(req, res, next) {
  const { tabla } = req.body;
  if (!tabla || !esTablaPermitidaGateway(tabla)) {
    return res.status(400).json({ error: 'Tabla no permitida' });
  }
  next();
}

export function validateBodyCampos(req, res, next) {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  next();
}
