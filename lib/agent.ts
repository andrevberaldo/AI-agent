import { query } from './db';
import { ChatOpenAI } from '@langchain/openai';
import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';

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
    return result.rows.map((row: any) => ({
      messageType: row.message_type,
      content: JSON.parse(row.content),
      createdAt: row.created_at,
    }));
  }
}

export const checkpointer = new AgentStateCheckpointer();

// Deep Agent Tools using DynamicTool
const getUsers = new DynamicTool({
  name: 'get_users',
  description: 'Retrieve all users from the database with their details',
  func: async () => {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return JSON.stringify({ success: true, data: result.rows });
  },
});

const createUser = new DynamicTool({
  name: 'create_user',
  description: 'Create a new user with name and email',
  func: async (input: string) => {
    const { name, email } = JSON.parse(input);
    try {
      const result = await query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [name, email]
      );
      return JSON.stringify({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') {
        return JSON.stringify({ success: false, error: 'Email already exists' });
      }
      throw error;
    }
  },
});

const updateUser = new DynamicTool({
  name: 'update_user',
  description: 'Update a user by ID with new name or email',
  func: async (input: string) => {
    const { id, name, email } = JSON.parse(input);
    try {
      const result = await query(
        'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [name || null, email || null, id]
      );
      if (result.rows.length === 0) {
        return JSON.stringify({ success: false, error: 'User not found' });
      }
      return JSON.stringify({ success: true, data: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') {
        return JSON.stringify({ success: false, error: 'Email already exists' });
      }
      throw error;
    }
  },
});

const deleteUser = new DynamicTool({
  name: 'delete_user',
  description: 'Delete a user by ID',
  func: async (input: string) => {
    const { id } = JSON.parse(input);
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return JSON.stringify({ success: false, error: 'User not found' });
    }
    return JSON.stringify({
      success: true,
      message: `User ${id} deleted successfully`,
    });
  },
});

export const tools = [getUsers, createUser, updateUser, deleteUser];

// Initialize OpenAI LLM
export const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4-turbo',
  temperature: 0.7,
});

// Deep Agent Executor with Tool Calling Loop
export async function processAgentRequest(message: string): Promise<string> {
  try {
    let messages: BaseMessage[] = [new HumanMessage(message)];
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      const response = await model.invoke(messages);
      messages.push(response);

      if (!('tool_calls' in response) || !(response.tool_calls as any)?.length) {
        return response.content as string;
      }

      for (const toolCall of (response.tool_calls as any)) {
        const tool = tools.find(t => t.name === toolCall.name);
        if (tool) {
          try {
            const input = typeof toolCall.args === 'string'
              ? toolCall.args
              : JSON.stringify(toolCall.args);

            const result = await tool.invoke(input);
            messages.push(
              new ToolMessage({
                content: result as string,
                tool_call_id: toolCall.id || `call_${Date.now()}`,
                name: toolCall.name,
              })
            );
          } catch (error) {
            messages.push(
              new ToolMessage({
                content: `Error executing tool: ${String(error)}`,
                tool_call_id: toolCall.id || `call_${Date.now()}`,
                name: toolCall.name,
              })
            );
          }
        }
      }
    }

    return 'Request completed with max iterations reached';
  } catch (error) {
    console.error('Deep Agent Error:', error);
    throw error;
  }
}
