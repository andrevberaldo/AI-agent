import { query } from './db';

export interface AgentState {
  threadId: string;
  checkpointId: string;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Agent State Checkpointer
 * Persists agent conversation state and history to PostgreSQL
 */
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
    return result.rows.map((row: any) => ({
      messageType: row.message_type,
      content: JSON.parse(row.content),
      createdAt: row.created_at,
    }));
  }
}

export const checkpointer = new AgentStateCheckpointer();
