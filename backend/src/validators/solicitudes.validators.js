import { body } from 'express-validator';

const clienteIdRule = body('cliente_id')
  .isMongoId()
  .withMessage('Debe seleccionar un cliente válido');

const descripcionRule = body('descripcion')
  .trim()
  .notEmpty()
  .withMessage('La descripción es obligatoria')
  .isLength({ max: 500 })
  .withMessage('La descripción no puede superar los 500 caracteres');

const prioridadRule = body('prioridad')
  .optional({ values: 'falsy' })
  .isIn(['baja', 'media', 'alta'])
  .withMessage('La prioridad solo puede ser baja, media o alta');

const atencionInmediataRule = body('atencion_inmediata')
  .optional()
  .isBoolean()
  .withMessage('El campo atención inmediata debe ser booleano');

const motivoRule = body('motivo_atencion_inmediata')
  .optional({ values: 'falsy' })
  .isLength({ max: 300 })
  .withMessage('El motivo es demasiado largo');

const crearRules = [clienteIdRule, descripcionRule, prioridadRule, atencionInmediataRule, motivoRule];
const editarRules = [descripcionRule, prioridadRule, atencionInmediataRule, motivoRule];

const estadoRules = [
  body('estado')
    .isIn(['pendiente', 'cotizada', 'aceptada', 'pagada', 'rechazada'])
    .withMessage('Estado de solicitud no válido')
];

export { crearRules, editarRules, estadoRules };
