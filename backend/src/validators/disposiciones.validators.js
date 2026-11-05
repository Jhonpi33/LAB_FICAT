import { body } from 'express-validator';

const crearRules = [
  body('muestra_id')
    .isMongoId()
    .withMessage('Debe seleccionar una muestra válida'),
  body('tipo')
    .isIn(['devolucion', 'desecho'])
    .withMessage('El tipo solo puede ser devolución o desecho'),
  body('motivo')
    .trim()
    .notEmpty()
    .withMessage('El motivo es obligatorio')
    .isLength({ max: 300 })
    .withMessage('El motivo es demasiado largo'),
  body('observacion')
    .optional({ values: 'falsy' })
    .isLength({ max: 500 })
    .withMessage('La observación es demasiado larga'),
  body('notificacion_cliente')
    .optional()
    .isBoolean()
    .withMessage('El campo notificación debe ser booleano')
];

export { crearRules };
