import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/orders (User's order history, or ALL orders if Admin)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) return res.sendStatus(401);

  try {
    let query = '';
    let params: any[] = [];

    if (req.user.role === 'admin') {
      // Admin sees everything with email of buyer
      query = `
        SELECT o.id, o.status, o.total_amount, o.created_at, u.email as user_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `;
    } else {
      // Regular user sees only their orders
      query = `
        SELECT id, status, total_amount, created_at
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      params = [req.user.id];
    }

    const ordersResult = await pool.query(query, params);
    const orders = ordersResult.rows;

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const itemsResult = await pool.query(
          `
          SELECT oi.id, oi.quantity, oi.price, p.name as product_name, p.image_url
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
        `,
          [order.id]
        );
        return {
          ...order,
          items: itemsResult.rows,
        };
      })
    );

    res.json({ data: ordersWithItems });
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// POST /api/orders (Create/Checkout Order)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) return res.sendStatus(401);
  const { items } = req.body; // Array of { productId: number, quantity: number }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  const client = await pool.connect();

  try {
    // Start Transaction
    await client.query('BEGIN');

    let totalAmount = 0;
    const itemsWithDetails = [];

    // Verify stock and fetch prices from database to prevent manipulation
    for (const item of items) {
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE', // Lock row to prevent race conditions in concurrent orders
        [item.productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      const product = productResult.rows[0];

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product "${product.name}". Available: ${product.stock}`);
      }

      const itemTotal = Number(product.price) * item.quantity;
      totalAmount += itemTotal;

      itemsWithDetails.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: item.quantity,
        newStock: product.stock - item.quantity,
      });
    }

    // Insert Order record
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id, status, total_amount, created_at',
      [req.user.id, totalAmount, 'processing']
    );
    const orderId = orderResult.rows[0].id;

    // Insert Order Items and Update Inventory Stock
    for (const item of itemsWithDetails) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.productId, item.quantity, item.price]
      );

      await client.query('UPDATE products SET stock = $1 WHERE id = $2', [
        item.newStock,
        item.productId,
      ]);
    }

    // Commit Transaction
    await client.query('COMMIT');
    console.log(`[Orders] Transaction committed. Order #${orderId} created successfully.`);

    res.status(201).json({
      message: 'Order placed successfully',
      data: {
        id: orderId,
        status: orderResult.rows[0].status,
        total_amount: orderResult.rows[0].total_amount,
        created_at: orderResult.rows[0].created_at,
        items: itemsWithDetails,
      },
    });
  } catch (err: any) {
    // Rollback Transaction on error
    await client.query('ROLLBACK');
    console.error('[Orders] Transaction rolled back due to error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to place order.' });
  } finally {
    client.release();
  }
});

export default router;
