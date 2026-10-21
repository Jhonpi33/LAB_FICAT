const ROLES = ['admin', 'encargado', 'usuario'];

// Catalogos y estados del sistema (version minima viable)
const TIPOS_DOCUMENTO = ['CC', 'NIT', 'CE', 'TI'];
const TIPOS_CLIENTE = ['interno', 'externo'];
const PRIORIDADES = ['baja', 'media', 'alta'];
const ESTADOS_SOLICITUD = ['borrador', 'enviada', 'aprobada'];
const ESTADOS_COTIZACION = ['borrador', 'enviada', 'aceptada', 'rechazada'];
const ESTADOS_MUESTRA = ['pendiente', 'aceptada', 'rechazada', 'en_analisis', 'finalizada'];
const TIPOS_FISICO_MUESTRA = ['solido', 'liquido'];
const UNIDADES_MUESTRA = ['g', 'ml'];

// Impuesto IVA aplicado a cotizaciones (19%)
const IVA = 0.19;

module.exports = {
  ROLES,
  TIPOS_DOCUMENTO,
  TIPOS_CLIENTE,
  PRIORIDADES,
  ESTADOS_SOLICITUD,
  ESTADOS_COTIZACION,
  ESTADOS_MUESTRA,
  TIPOS_FISICO_MUESTRA,
  UNIDADES_MUESTRA,
  IVA
};
