import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import solicitudesRoutes from './routes/solicitudes.routes.js';
import muestrasRoutes from './routes/muestras.routes.js';
import parametrosRoutes from './routes/parametros.routes.js';
import cotizacionesRoutes from './routes/cotizaciones.routes.js';
import pagosRoutes from './routes/pagos.routes.js';
import analisisRoutes from './routes/analisis.routes.js';
import incidenciasRoutes from './routes/incidencias.routes.js';
import publicoRoutes from './routes/publico.routes.js';
import informesRoutes from './routes/informes.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import facturasRoutes from './routes/facturas.routes.js';
import disposicionesRoutes from './routes/disposiciones.routes.js';
import eventosRoutes from './routes/eventos.routes.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'API funcionando' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/muestras', muestrasRoutes);
app.use('/api/parametros', parametrosRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/analisis', analisisRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/publico', publicoRoutes);
app.use('/api/informes', informesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/disposiciones', disposicionesRoutes);
app.use('/api/eventos', eventosRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.use(errorHandler);

export default app;

