import express from 'express';
import * as controller from '../controllers/usuarios.controller.js';
import { crearRules, editarRules, estadoRules } from '../validators/usuarios.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);
router.put('/:id', editarRules, validar, controller.editar);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);

export default router;
