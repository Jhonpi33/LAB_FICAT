import express from 'express';
import * as controller from '../controllers/notificaciones.controller.js';
import { crearRules, estadoRules } from '../validators/notificaciones.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crearManual);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);
router.post('/:id/reenviar', controller.reenviar);

export default router;
