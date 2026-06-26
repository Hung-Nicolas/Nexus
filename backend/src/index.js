import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import buscadorRoutes from './routes/buscador.js';
import dashboardRoutes from './routes/dashboard.js';
import gatewayRoutes from './routes/gateway.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, env: config.nodeEnv });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', buscadorRoutes);
app.use('/api/v1', dashboardRoutes);
app.use('/api/v1', gatewayRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[Nexus Backend] Servidor corriendo en http://localhost:${config.port}`);
});
