import { body } from 'express-validator';

const crearRules = [
  body('muestra_id')
    .isMongoId()
    .withMessage('Debe seleccionar una muestra válida'),
  body('tipo')
    .isIn(['informativa', 'demora', 'requiere_accion_cliente'])
    .withMessage('Tipo de incidencia no válido'),
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio')
    .isLength({ max: 150 })
    .withMessage('El título es demasiado largo'),
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripción es obligatoria')
    .isLength({ max: 500 })
    .withMessage('La descripción es demasiado larga'),
  body('visible_cliente')
    .optional()
    .isBoolean()
    .withMessage('El campo visible al cliente debe ser booleano'),
  body('requiere_respuesta')
    .optional()
    .isBoolean()
    .withMessage('El campo requiere respuesta debe ser booleano'),
  body('nueva_fecha_estimada')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha estimada no es válida')
];

const estadoRules = [
  body('estado')
    .isIn(['abierta', 'en_revision', 'esperando_cliente', 'aprobada', 'cerrada'])
    .withMessage('Estado de incidencia no válido'),
  body('motivo')
    .optional({ values: 'falsy' })
    .isLength({ max: 300 })
    .withMessage('El motivo es demasiado largo')
];

const respuestaClienteRules = [
  body('mensaje')
    .trim()
    .notEmpty()
    .withMessage('La respuesta es obligatoria')
    .isLength({ max: 1000 })
    .withMessage('La respuesta es demasiado larga')
];

export { crearRules, estadoRules, respuestaClienteRules };
