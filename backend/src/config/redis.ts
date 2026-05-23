import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

console.log(`[Redis] Initializing client pointing to: ${redisUrl}`);

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('[Redis] Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('[Redis] Client connecting...');
});

redisClient.on('ready', () => {
  console.log('[Redis] Client connected and ready to use.');
});

export const connectRedis = async (retries = 5, delay = 3000): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await redisClient.connect();
      return;
    } catch (err) {
      console.error(`[Redis] Connection attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        console.log(`[Redis] Retrying in ${delay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  console.warn('[Redis] Continuing execution without cache functionality (cache will be bypassed).');
};

// Helper methods for caching
export const cacheSet = async (key: string, value: string, ttlSeconds = 300): Promise<void> => {
  if (!redisClient.isOpen) return;
  try {
    await redisClient.set(key, value, {
      EX: ttlSeconds,
    });
  } catch (err) {
    console.error(`[Redis] Failed to set key ${key}:`, err);
  }
};

export const cacheGet = async (key: string): Promise<string | null> => {
  if (!redisClient.isOpen) return null;
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`[Redis] Failed to get key ${key}:`, err);
    return null;
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  if (!redisClient.isOpen) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`[Redis] Failed to delete key ${key}:`, err);
  }
};
