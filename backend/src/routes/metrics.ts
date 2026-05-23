import { Router, Request, Response } from 'express';
import client from 'prom-client';

const router = Router();

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, Memory, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// Define custom metrics
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
});

// Register custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);

// GET /api/metrics endpoint for Prometheus scraping
router.get('/', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  try {
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
});

// Middleware to record metrics for all incoming requests
export const metricsMiddleware = (req: Request, res: Response, next: any) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    
    // Clean route name to avoid high cardinality (e.g. group route paths)
    let route = req.baseUrl + req.path;
    
    // Standardize IDs to :id format to prevent metric clutter
    route = route.replace(/\/\d+/g, '/:id');

    // Exclude /api/metrics from scraping metrics loop if desired, or record it
    if (route !== '/api/metrics') {
      httpRequestsTotal.labels(req.method, route, res.statusCode.toString()).inc();
      httpRequestDurationSeconds.labels(req.method, route, res.statusCode.toString()).observe(durationInSeconds);
    }
  });

  next();
};

export default router;
