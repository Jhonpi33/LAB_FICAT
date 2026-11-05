import mongoose from 'mongoose';

/**
 * Cuenta registros por día en una colección (agregación Mongo).
 * Devuelve [{ _id: 'YYYY-MM-DD', cantidad: n }] desde la fecha indicada.
 * El agrupado es por día UTC para que coincida con el calendario del frontend.
 */
async function conteoPorDia(coleccion, campoFecha, desde) {
  return mongoose.connection.db.collection(coleccion).aggregate([
    { $match: { [campoFecha]: { $gte: desde } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${campoFecha}` } },
        cantidad: { $sum: 1 }
      }
    }
  ]).toArray();
}

/**
 * Actividad diaria del laboratorio (heatmap tipo GitHub).
 * Suma los eventos de trazabilidad y las creaciones de solicitudes, muestras,
 * pagos, facturas e incidencias, para reflejar todo lo que "se movió" cada día.
 *
 * @param {number} dias - ventana en días (por defecto 371 ≈ 53 semanas)
 * @returns {Promise<Array<{fecha: string, cantidad: number}>>}
 */
export async function actividadDiaria(dias = 371) {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const [eventos, solicitudes, muestras, pagos, facturas, incidencias] = await Promise.all([
    conteoPorDia('eventos_trazabilidad', 'fecha', desde),
    conteoPorDia('solicitudes', 'fecha_creacion', desde),
    conteoPorDia('muestras', 'fecha_creacion', desde),
    conteoPorDia('pagos', 'fecha_creacion', desde),
    conteoPorDia('facturas', 'fecha_creacion', desde),
    conteoPorDia('incidencias', 'fecha_creacion', desde),
  ]);

  const mapa = new Map();

  for (const grupo of [...eventos, ...solicitudes, ...muestras, ...pagos, ...facturas, ...incidencias]) {
    if (!grupo || !grupo._id) continue;
    mapa.set(grupo._id, (mapa.get(grupo._id) || 0) + grupo.cantidad);
  }

  return [...mapa.entries()]
    .map(([fecha, cantidad]) => ({ fecha, cantidad }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
