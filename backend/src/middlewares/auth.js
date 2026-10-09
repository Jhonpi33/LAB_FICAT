const jwt = require('jsonwebtoken');
const config = require('../config/env');

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

module.exports = { requireAuth };
