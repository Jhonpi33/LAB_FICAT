function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status === 500) {
    console.error('Error del servidor:', err);
  } else {
    console.warn('Error controlado:', err.message);
  }

  res.status(status).json({
    ok: false,
    mensaje: status === 500 ? 'Ocurrio un error en el servidor' : err.message
  });
}

module.exports = errorHandler;
