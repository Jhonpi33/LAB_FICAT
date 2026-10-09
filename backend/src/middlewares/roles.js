function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ ok: false, mensaje: 'No tiene permisos para realizar esta accion' });
    }
    next();
  };
}

module.exports = { requireRole };
