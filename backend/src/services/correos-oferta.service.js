import CorreoOferta from '../models/CorreoOferta.js';
import { enviar } from './ofertas.service.js';

let trabajando = false;
export async function procesarCorreosOferta() {
  if (trabajando) return;
  trabajando = true;
  try {
    const ahora = new Date();
    const job = await CorreoOferta.findOneAndUpdate({ estado: { $ne: 'enviado' }, proximoIntento: { $lte: ahora } },
      { $set: { estado: 'procesando', proximoIntento: new Date(Date.now()+120000) }, $inc: { intentos: 1 } },
      { sort: { proximoIntento: 1 }, new: true });
    if (!job) return;
    try {
      await enviar(job.solicitud, job.evento === 'recibo' ? 'recibo' : 'cliente');
      await CorreoOferta.updateOne({ _id: job._id }, { estado: 'enviado', enviado: new Date(), error: '' });
    } catch (e) {
      await CorreoOferta.updateOne({ _id: job._id }, { estado: 'pendiente', error: e.status ? e.message : 'No se pudo enviar el correo.', proximoIntento: new Date(Date.now()+300000) });
    }
  } catch (e) { console.error('No se pudo procesar la cola de ofertas:', e.name); }
  finally { trabajando = false; }
}
