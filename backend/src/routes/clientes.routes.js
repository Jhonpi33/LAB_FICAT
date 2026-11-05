import express from 'express';
import * as controller from '../controllers/clientes.controller.js';
import { crearRules, editarRules } from '../validators/clientes.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);
router.put('/:id', editarRules, validar, controller.editar);

export default router;
