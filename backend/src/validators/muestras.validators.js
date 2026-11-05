import { body } from 'express-validator';

const solicitudIdRule = body('solicitud_id')
  .isMongoId()
  .withMessage('Debe seleccionar una solicitud válida');

const nombreRule = body('nombre_muestra')
  .trim()
  .notEmpty()
  .withMessage('El nombre de la muestra es obligatorio')
  .isLength({ max: 150 })
  .withMessage('El nombre de la muestra es demasiado largo');

const descripcionRule = body('descripcion')
  .trim()
  .notEmpty()
  .withMessage('La descripción del alimento es obligatoria')
  .isLength({ max: 500 })
  .withMessage('La descripción es demasiado larga');

const tipoFisicoRule = body('tipo_fisico')
  .isIn(['solido', 'liquido'])
  .withMessage('El tipo físico solo puede ser sólido o líquido');

const cantidadRule = body('cantidad')
  .isFloat({ min: 0 })
  .withMessage('La cantidad debe ser un número mayor o igual a 0');

const unidadRule = body('unidad')
  .isIn(['g', 'ml'])
  .withMessage('La unidad solo puede ser g o ml');

const parametrosRule = [
  body('parametros_ids')
    .optional({ values: 'falsy' })
    .isArray()
    .withMessage('Los parámetros deben ser una lista'),
  body('parametros_ids.*')
    .optional()
    .isMongoId()
    .withMessage('Parámetro no válido')
];

const verificacionRule = body('verificacion_fisica')
  .optional()
  .isBoolean()
  .withMessage('La verificación física debe ser booleana');

const crearRules = [solicitudIdRule, nombreRule, descripcionRule, tipoFisicoRule, cantidadRule, unidadRule, ...parametrosRule, verificacionRule];

const recepcionRules = [
  body('aceptar')
    .isBoolean()
    .withMessage('El campo aceptar debe ser booleano'),
  body('motivo_rechazo')
    .if((value, { req }) => req.body.aceptar === false)
    .trim()
    .notEmpty()
    .withMessage('El motivo de rechazo es obligatorio')
];

const etapaRules = [
  body('etapa')
    .isIn(['en_proceso', 'en_analisis', 'resultados_validados'])
    .withMessage('Etapa no válida')
];

export { crearRules, recepcionRules, etapaRules };
