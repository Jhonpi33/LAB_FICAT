const { validationResult } = require('express-validator');

function validar(req, res, next) {
  const resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Datos invalidos',
      errores: resultado.array().map((e) => ({ campo: e.path, msg: e.msg }))
    });
  }

  next();
}

module.exports = validar;
