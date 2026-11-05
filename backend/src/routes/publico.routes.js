import express from 'express';
import * as controller from '../controllers/publico.controller.js';
import { codigoRule, respuestaRules, encuestaRules } from '../validators/publico.validators.js';
import validar from '../middlewares/validar.js';

// Rutas PÚBLICAS (sin token): consulta de muestra, respuesta a incidencia y
// encuesta de satisfacción (RF-075 a RF-084, RF-098, RNF-004).
const router = express.Router();

router.get('/muestras/:codigo', codigoRule, validar, controller.consultarMuestra);
router.post('/incidencias/:id/respuesta', respuestaRules, validar, controller.responderIncidencia);
router.post('/encuestas', encuestaRules, validar, controller.registrarEncuesta);

export default router;
