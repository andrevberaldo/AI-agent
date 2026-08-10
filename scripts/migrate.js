const { Pool } = require('pg');

// Load .env.local if it exists (for local development)
// In CI/CD, DATABASE_URL is passed via environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // .env.local doesn't exist, which is fine in CI/CD
}

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent state checkpointer table
CREATE TABLE IF NOT EXISTS agent_state (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) UNIQUE NOT NULL,
  checkpoint_id VARCHAR(255),
  state JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent history table
CREATE TABLE IF NOT EXISTS agent_history (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES agent_state(thread_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_agent_state_thread_id ON agent_state(thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_history_thread_id ON agent_history(thread_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting database migration...');
    await client.query(schema);
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
