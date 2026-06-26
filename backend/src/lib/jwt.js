import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtAccessExpiresIn });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtRefreshExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function decodeToken(token) {
  return jwt.decode(token);
}
