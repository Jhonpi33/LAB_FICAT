const router = require('express').Router();
const controller = require('../controllers/usuarios.controller');
const { crearRules, editarRules, estadoRules } = require('../validators/usuarios.validators');
const validar = require('../middlewares/validar');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

router.use(requireAuth, requireRole('admin'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);
router.put('/:id', editarRules, validar, controller.editar);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);

module.exports = router;
