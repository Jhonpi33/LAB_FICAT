function ok(res, datos = null, mensaje = 'Operacion exitosa') {
  const cuerpo = { ok: true, mensaje };
  if (datos !== null && datos !== undefined) cuerpo.datos = datos;
  return res.json(cuerpo);
}

function fail(res, status = 400, mensaje = 'Operacion no permitida', errores = null) {
  const cuerpo = { ok: false, mensaje };
  if (errores) cuerpo.errores = errores;
  return res.status(status).json(cuerpo);
}

function httpError(status, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

module.exports = { ok, fail, httpError };
