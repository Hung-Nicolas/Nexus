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

// Railway (y otros proxies) envían X-Forwarded-For; Express debe confiar en el proxy más cercano
app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  ...(config.corsOrigin ? config.corsOrigin.split(',').map(o => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (config.corsOriginPattern) {
      try {
        const regex = new RegExp(config.corsOriginPattern);
        if (regex.test(origin)) return callback(null, true);
      } catch (e) {
        console.error('[Nexus Backend] CORS_ORIGIN_PATTERN inválido:', e.message);
      }
    }
    callback(new Error('Origen no permitido por CORS'));
  },
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
