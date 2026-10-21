const router = require('express').Router();
const controller = require('../controllers/cotizaciones.controller');
const { crearRules, editarRules, estadoRules } = require('../validators/cotizaciones.validators');
const validar = require('../middlewares/validar');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', crearRules, validar, controller.crear);
router.put('/:id', editarRules, validar, controller.editar);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);
router.delete('/:id', controller.eliminar);

module.exports = router;
