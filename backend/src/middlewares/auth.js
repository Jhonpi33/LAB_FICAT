import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../config/env.js';
import Usuario from '../models/Usuario.js';

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, mensaje: 'Debes iniciar sesión para acceder.' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), config.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ ok: false, mensaje: 'Sesión inválida o vencida.' });
  }
  if (!mongoose.isValidObjectId(payload.id)) {
    return res.status(401).json({ ok: false, mensaje: 'Sesión inválida.' });
  }

  try {
    const usuario = await Usuario.findOne({ _id: payload.id, activo: true, eliminado: false })
      .select('nombre email rol permiso_editar permiso_eliminar').lean();
    if (!usuario) return res.status(401).json({ ok: false, mensaje: 'La cuenta ya no está activa.' });
    req.usuario = { ...usuario, id: usuario._id.toString() };
    next();
  } catch (error) {
    next(error);
  }
}

export { requireAuth };
