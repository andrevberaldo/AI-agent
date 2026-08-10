import { query } from '../db';

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  async getAll(): Promise<User[]> {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
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
