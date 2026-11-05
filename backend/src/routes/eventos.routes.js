import express from 'express';
import * as controller from '../controllers/eventos.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/actividad', controller.actividad);

export default router;
