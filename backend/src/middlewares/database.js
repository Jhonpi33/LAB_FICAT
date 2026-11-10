import mongoose from 'mongoose';

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();

  return res.status(503).json({
    ok: false,
    mensaje: 'La base de datos no está disponible. Inténtalo de nuevo en unos minutos.'
  });
}

export { requireDatabase };
