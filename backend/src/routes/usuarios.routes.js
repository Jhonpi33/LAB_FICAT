import Usuario from '../models/Usuario.js';
import express from 'express';
import * as controller from '../controllers/usuarios.controller.js';
import { crearRules, editarRules, estadoRules } from '../validators/usuarios.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.patch('/:id/aprendiz', async (req, res, next) => {
  try {
    if (!['validado', 'rechazado'].includes(req.body.estado)) return res.sendStatus(400);
    const usuario = await Usuario.findOneAndUpdate({ _id: req.params.id, aprendiz: 'pendiente', eliminado: false },
      { aprendiz: req.body.estado });
    if (!usuario) return res.status(409).json({ mensaje: 'La ficha ya no está pendiente.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);
router.put('/:id', editarRules, validar, controller.editar);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);

export default router;
