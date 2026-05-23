import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const PRODUCTS_CACHE_KEY = 'products:all';

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  try {
    // 1. Attempt to fetch from Redis Cache
    const cachedProducts = await cacheGet(PRODUCTS_CACHE_KEY);
    if (cachedProducts) {
      console.log('[Products] [Redis Cache] CACHE HIT - Returning products list');
      return res.json({ source: 'cache', data: JSON.parse(cachedProducts) });
    }

    // 2. Cache Miss - Query Postgres DB
    console.log('[Products] [Database] CACHE MISS - Querying database...');
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    const products = result.rows;

    // 3. Store in Redis Cache (expires in 5 minutes / 300 seconds)
    await cacheSet(PRODUCTS_CACHE_KEY, JSON.stringify(products), 300);
    console.log('[Products] [Redis Cache] Cached products database output');

    res.json({ source: 'database', data: products });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products (Admin Only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { name, description, price, image_url, stock, category } = req.body;

  if (!name || !description || price === undefined || !image_url || stock === undefined || !category) {
    return res.status(400).json({ error: 'All product fields are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, image_url, stock, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, image_url, stock, category]
    );

    const newProduct = result.rows[0];

    // Invalidate cached product listing
    await cacheDel(PRODUCTS_CACHE_KEY);
    console.log('[Products] [Redis Cache] CACHE INVALIDATED - New product created');

    res.status(201).json({
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;
