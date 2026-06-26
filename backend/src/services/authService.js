import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { config } from '../config.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiresAtFromDuration(duration) {
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) throw new Error(`Duración JWT inválida: ${duration}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const ms = unit === 'd' ? value * 24 * 60 * 60 * 1000
           : unit === 'h' ? value * 60 * 60 * 1000
           : value * 60 * 1000;
  return new Date(Date.now() + ms);
}

export async function login({ email, password }) {
  const { rows } = await query(
    `SELECT id, email, password_hash, nombre, apellido, rol, activo
     FROM public.usuarios
     WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const usuario = rows[0];
  if (!usuario || !usuario.activo) {
    throw { status: 401, message: 'Email o contraseña incorrectos' };
  }

  const valid = await bcrypt.compare(password, usuario.password_hash);
  if (!valid) {
    throw { status: 401, message: 'Email o contraseña incorrectos' };
  }

  const payload = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    rol: usuario.rol,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: usuario.id, type: 'refresh' });
  const refreshHash = hashToken(refreshToken);

  await query(
    `INSERT INTO public.refresh_tokens (id_usuario, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [usuario.id, refreshHash, expiresAtFromDuration(config.jwtRefreshExpiresIn)]
  );

  return {
    accessToken,
    refreshToken,
    usuario: payload,
  };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  const refreshHash = hashToken(refreshToken);
  await query(
    `DELETE FROM public.refresh_tokens WHERE token_hash = $1`,
    [refreshHash]
  );
}

export async function refresh(refreshToken) {
  if (!refreshToken) {
    throw { status: 401, message: 'Refresh token requerido' };
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch (err) {
    throw { status: 401, message: 'Refresh token inválido' };
  }

  if (decoded.type !== 'refresh' || !decoded.id) {
    throw { status: 401, message: 'Refresh token inválido' };
  }

  const refreshHash = hashToken(refreshToken);
  const { rows } = await query(
    `SELECT rt.id_usuario, u.email, u.nombre, u.apellido, u.rol, u.activo
     FROM public.refresh_tokens rt
     JOIN public.usuarios u ON u.id = rt.id_usuario
     WHERE rt.token_hash = $1
       AND rt.expires_at > NOW()
       AND rt.used_at IS NULL
       AND u.activo = true`,
    [refreshHash]
  );

  const row = rows[0];
  if (!row) {
    throw { status: 401, message: 'Refresh token inválido o expirado' };
  }

  // Rotación: marcar el usado y crear uno nuevo
  await query(
    `UPDATE public.refresh_tokens SET used_at = NOW() WHERE token_hash = $1`,
    [refreshHash]
  );

  const payload = {
    id: row.id_usuario,
    email: row.email,
    nombre: row.nombre,
    apellido: row.apellido,
    rol: row.rol,
  };

  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken({ id: row.id_usuario, type: 'refresh' });
  const newRefreshHash = hashToken(newRefreshToken);

  await query(
    `INSERT INTO public.refresh_tokens (id_usuario, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [row.id_usuario, newRefreshHash, expiresAtFromDuration(config.jwtRefreshExpiresIn)]
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    usuario: payload,
  };
}

export async function getMe(userId) {
  const { rows } = await query(
    `SELECT id, email, nombre, apellido, rol
     FROM public.usuarios
     WHERE id = $1 AND activo = true`,
    [userId]
  );
  return rows[0] || null;
}
