import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    console.log(`Query execution time: ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function getClient() {
  return pool.connect();
}

export default pool;
