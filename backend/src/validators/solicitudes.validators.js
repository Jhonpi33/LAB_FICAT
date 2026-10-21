const { body } = require('express-validator');
const { TIPOS_CLIENTE, PRIORIDADES, ESTADOS_SOLICITUD } = require('../config/constants');

const clienteRule = body('cliente')
  .isMongoId()
  .withMessage('El cliente no es valido');

const tipoClienteRule = body('tipo_cliente')
  .optional({ nullable: true })
  .isIn(TIPOS_CLIENTE)
  .withMessage('El tipo de cliente solo puede ser interno o externo');

const descripcionRule = body('descripcion')
  .trim()
  .notEmpty()
  .withMessage('La descripcion es obligatoria')
  .isLength({ max: 2000 })
  .withMessage('La descripcion no puede superar 2000 caracteres');

const prioridadRule = body('prioridad')
  .optional({ nullable: true })
  .isIn(PRIORIDADES)
  .withMessage('La prioridad solo puede ser baja, media o alta');

const atencionInmediataRule = body('atencion_inmediata')
  .optional({ nullable: true })
  .isBoolean()
  .withMessage('El campo atencion_inmediata debe ser booleano')
  .custom((valor, { req }) => {
    const motivo = String(req.body.motivo_atencion_inmediata || '').trim();
    if (valor === true && !motivo) {
      throw new Error('El motivo de atencion inmediata es obligatorio');
    }
    return true;
  });

const motivoAtencionRule = body('motivo_atencion_inmediata')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 300 })
  .withMessage('El motivo de atencion inmediata no puede superar 300 caracteres');

const crearRules = [
  clienteRule,
  tipoClienteRule,
  descripcionRule,
  prioridadRule,
  atencionInmediataRule,
  motivoAtencionRule
];

const editarRules = crearRules;

const estadoRules = [
  body('estado')
    .isIn(ESTADOS_SOLICITUD)
    .withMessage('Estado de solicitud no valido')
];

module.exports = { crearRules, editarRules, estadoRules };
