import { query } from './db';
import { AgentAction, AgentFinish } from 'langchain/schema';

export interface AgentState {
  threadId: string;
  checkpointId: string;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AgentStateCheckpointer {
  async saveCheckpoint(
    threadId: string,
    checkpointId: string,
    state: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await query(
      `INSERT INTO agent_state (thread_id, checkpoint_id, state, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (thread_id) DO UPDATE SET
       checkpoint_id = $2, state = $3, metadata = $4, updated_at = CURRENT_TIMESTAMP`,
      [threadId, checkpointId, JSON.stringify(state), JSON.stringify(metadata || {})]
    );
  }

  async getCheckpoint(threadId: string): Promise<AgentState | null> {
    const result = await query(
      'SELECT * FROM agent_state WHERE thread_id = $1',
      [threadId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      threadId: row.thread_id,
      checkpointId: row.checkpoint_id,
      state: JSON.parse(row.state),
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  async saveHistory(
    threadId: string,
    messageType: 'user' | 'assistant' | 'action',
    content: Record<string, any>
  ): Promise<void> {
    await query(
      `INSERT INTO agent_history (thread_id, message_type, content)
       VALUES ($1, $2, $3)`,
      [threadId, messageType, JSON.stringify(content)]
    );
  }

  async getHistory(threadId: string): Promise<any[]> {
    const result = await query(
      'SELECT * FROM agent_history WHERE thread_id = $1 ORDER BY created_at ASC',
      [threadId]
    );
    return result.rows.map(row => ({
      messageType: row.message_type,
      content: JSON.parse(row.content),
      createdAt: row.created_at,
    }));
  }
}

export const checkpointer = new AgentStateCheckpointer();

export const tools = [
  {
    name: 'get_users',
    description: 'Get all users from the database',
    func: async () => {
      const result = await query('SELECT * FROM users');
      return result.rows;
    },
  },
  {
    name: 'create_user',
    description: 'Create a new user',
    func: async (input: { name: string; email: string }) => {
      const result = await query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [input.name, input.email]
      );
      return result.rows[0];
    },
  },
];
