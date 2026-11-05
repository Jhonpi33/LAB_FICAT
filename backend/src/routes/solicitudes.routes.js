import express from 'express';
import * as controller from '../controllers/solicitudes.controller.js';
import { crearRules, editarRules, estadoRules } from '../validators/solicitudes.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);
router.put('/:id', editarRules, validar, controller.editar);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);

export default router;
