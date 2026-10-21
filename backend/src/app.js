const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const clientesRoutes = require('./routes/clientes.routes');
const parametrosRoutes = require('./routes/parametros.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const cotizacionesRoutes = require('./routes/cotizaciones.routes');
const muestrasRoutes = require('./routes/muestras.routes');
const errorHandler = require('./middlewares/errorHandler');

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
app.use('/api/parametros', parametrosRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/muestras', muestrasRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.use(errorHandler);

module.exports = app;
