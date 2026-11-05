import express from 'express';
import * as controller from '../controllers/facturas.controller.js';
import { generarRules, estadoRules } from '../validators/facturas.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.post('/', generarRules, validar, controller.generar);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);

export default router;
