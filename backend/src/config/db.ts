import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const pool = new Pool({
  connectionString,
});

export const connectWithRetry = async (retries = 5, delay = 5000): Promise<Pool> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Database] Attempting connection to PostgreSQL... (Attempt ${i + 1}/${retries})`);
      const client = await pool.connect();
      console.log('[Database] Connected to PostgreSQL successfully.');
      client.release();
      return pool;
    } catch (err) {
      console.error(`[Database] Connection attempt failed:`, err);
      if (i < retries - 1) {
        console.log(`[Database] Retrying in ${delay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw new Error('[Database] Failed to connect to PostgreSQL after multiple attempts.');
};
