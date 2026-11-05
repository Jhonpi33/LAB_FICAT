import jwt from 'jsonwebtoken';
import config from '../config/env.js';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: 'Debe iniciar sesion para acceder' });
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: 'Sesion invalida o expirada' });
  }
}

export { requireAuth };
