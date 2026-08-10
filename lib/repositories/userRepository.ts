import { query } from '../db';
import { User } from '../types';

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export class UserRepository {
  async getAll(options?: PaginationOptions): Promise<User[] | PaginatedResult<User>> {
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    if (!options) {
      const result = await query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    }

    const dataResult = await query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: dataResult.rows,
      total,
      limit,
      offset,
    };
  }

  async getById(id: number): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async create(name: string, email: string): Promise<User> {
    const result = await query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return result.rows[0];
  }

  async update(
    id: number,
    name?: string,
    email?: string
  ): Promise<User | null> {
    const result = await query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name || null, email || null, id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [
      id,
    ]);
    return result.rows.length > 0;
  }
}

export const userRepository = new UserRepository();
