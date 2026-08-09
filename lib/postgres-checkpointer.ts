import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { RunnableConfig } from '@langchain/core/runnables';
import { query } from './db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Import types from LangGraph checkpoint module
 */
type CheckpointTuple = any;
type Checkpoint = any;
type CheckpointMetadata = any;
type ChannelVersions = Record<string, any>;
type PendingWrite = [string, unknown];
type CheckpointListOptions = {
  limit?: number;
  before?: RunnableConfig;
  filter?: Record<string, any>;
};

/**
 * PostgreSQL-based Checkpoint Saver for LangGraph
 *
 * Persists agent state and writes to PostgreSQL database.
 * Compatible with LangGraph's Deep Agent checkpointing system.
 */
export class PostgresCheckpointSaver extends BaseCheckpointSaver {
  /**
   * Retrieve a checkpoint tuple by config
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    try {
      const threadId = config?.configurable?.thread_id;
      if (!threadId) return undefined;

      const result = await query(
        `SELECT * FROM agent_state WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [threadId]
      );

      if (result.rows.length === 0) return undefined;

      const row = result.rows[0];
      const checkpoint = JSON.parse(row.state) as Checkpoint;
      const metadata = JSON.parse(row.metadata || '{}') as CheckpointMetadata;

      return {
        config: { configurable: { thread_id: threadId } },
        checkpoint,
        metadata,
        parentConfig: metadata.parents
          ? { configurable: { thread_id: threadId } }
          : undefined,
      };
    } catch (error) {
      console.error('Error getting checkpoint:', error);
      return undefined;
    }
  }

  /**
   * List checkpoints for a given config
   */
  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    try {
      const threadId = config?.configurable?.thread_id;
      if (!threadId) return;

      const limit = options?.limit || 10;
      const result = await query(
        `SELECT * FROM agent_state
         WHERE thread_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [threadId, limit]
      );

      for (const row of result.rows) {
        const checkpoint = JSON.parse(row.state) as Checkpoint;
        const metadata = JSON.parse(row.metadata || '{}') as CheckpointMetadata;

        yield {
          config: { configurable: { thread_id: threadId } },
          checkpoint,
          metadata,
        };
      }
    } catch (error) {
      console.error('Error listing checkpoints:', error);
    }
  }

  /**
   * Save a checkpoint with metadata
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions
  ): Promise<RunnableConfig> {
    try {
      const threadId = config?.configurable?.thread_id || uuidv4();
      const checkpointId = checkpoint.id || uuidv4();

      await query(
        `INSERT INTO agent_state (thread_id, checkpoint_id, state, metadata)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (thread_id) DO UPDATE SET
         checkpoint_id = $2, state = $3, metadata = $4, updated_at = CURRENT_TIMESTAMP`,
        [
          threadId,
          checkpointId,
          JSON.stringify(checkpoint),
          JSON.stringify(metadata),
        ]
      );

      return { configurable: { thread_id: threadId } };
    } catch (error) {
      console.error('Error saving checkpoint:', error);
      throw error;
    }
  }

  /**
   * Store intermediate writes for a checkpoint
   */
  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void> {
    try {
      const threadId = config?.configurable?.thread_id;
      if (!threadId) return;

      for (const [channel, value] of writes) {
        await query(
          `INSERT INTO agent_history (thread_id, message_type, content)
           VALUES ($1, $2, $3)`,
          [
            threadId,
            'checkpoint_write',
            JSON.stringify({
              taskId,
              channel,
              value,
              timestamp: new Date().toISOString(),
            }),
          ]
        );
      }
    } catch (error) {
      console.error('Error saving writes:', error);
    }
  }

  /**
   * Delete all checkpoints for a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    try {
      // Delete checkpoints
      await query(
        'DELETE FROM agent_state WHERE thread_id = $1',
        [threadId]
      );

      // Delete history
      await query(
        'DELETE FROM agent_history WHERE thread_id = $1',
        [threadId]
      );
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  }
}

/**
 * Create and export a singleton instance
 */
export const postgresCheckpointer = new PostgresCheckpointSaver();
