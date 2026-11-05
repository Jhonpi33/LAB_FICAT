import * as service from '../services/auth.service.js';
import { ok } from '../utils/responses.js';

async function registro(req, res, next) {
  try {
    const datos = await service.registro(req.body);
    return ok(res, datos, 'Usuario registrado correctamente');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const datos = await service.login(req.body.email, req.body.password);
    return ok(res, datos, 'Inicio de sesion exitoso');
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const datos = await service.me(req.usuario.id);
    return ok(res, datos, 'Sesion activa');
  } catch (err) {
    next(err);
  }
}

async function actualizarPerfil(req, res, next) {
  try {
    const datos = await service.actualizarPerfil(req.usuario.id, req.body);
    return ok(res, datos, 'Perfil actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

export { registro, login, me, actualizarPerfil };
