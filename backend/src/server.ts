import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectWithRetry } from './config/db';
import { connectRedis } from './config/redis';

// Routes imports
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import metricsRoutes, { metricsMiddleware } from './routes/metrics';

// Load environmental parameters
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply Global Middlewares
app.use(cors({
  origin: '*', // Allow Nginx to handle CORS or allow all in container network
  credentials: true
}));
app.use(express.json());

// Apply Prometheus Metrics Interceptor
app.use(metricsMiddleware);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/metrics', metricsRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error Handler]:', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// Bootstap Function
const bootstrap = async () => {
  console.log('[Server] Starting E-Commerce microservice bootstrap sequence...');
  
  try {
    // 1. Establish Database Connection Pool with Retry
    await connectWithRetry();

    // 2. Establish Redis Cache Client Connection
    await connectRedis();

    // 3. Bind port and start listening
    app.listen(PORT, () => {
      console.log(`[Server] Core API Service operational at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Critical Bootstrap Failure:', err);
    process.exit(1);
  }
};

bootstrap();
