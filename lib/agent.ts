import { query } from './db';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

export interface AgentState {
  threadId: string;
  checkpointId: string;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  schema: z.ZodSchema;
  execute: (input: any) => Promise<string>;
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

// Define agent tools with Zod schemas
const getUsersSchema = z.object({});

const createUserSchema = z.object({
  name: z.string().describe('The full name of the user'),
  email: z.string().email().describe('The email address of the user'),
});

const updateUserSchema = z.object({
  id: z.number().describe('The user ID'),
  name: z.string().optional().describe('The new name for the user'),
  email: z.string().email().optional().describe('The new email for the user'),
});

const deleteUserSchema = z.object({
  id: z.number().describe('The user ID to delete'),
});

export const tools: Tool[] = [
  {
    name: 'get_users',
    description: 'Retrieve all users from the database with their details',
    schema: getUsersSchema,
    execute: async () => {
      const result = await query('SELECT * FROM users ORDER BY created_at DESC');
      return JSON.stringify(result.rows);
    },
  },
  {
    name: 'create_user',
    description: 'Create a new user with name and email',
    schema: createUserSchema,
    execute: async (input: z.infer<typeof createUserSchema>) => {
      try {
        const result = await query(
          'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
          [input.name, input.email]
        );
        return JSON.stringify({ success: true, data: result.rows[0] });
      } catch (error: any) {
        if (error.code === '23505') {
          return JSON.stringify({ success: false, error: 'Email already exists' });
        }
        throw error;
      }
    },
  },
  {
    name: 'update_user',
    description: 'Update a user by ID with new name or email',
    schema: updateUserSchema,
    execute: async (input: z.infer<typeof updateUserSchema>) => {
      try {
        const result = await query(
          'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
          [input.name || null, input.email || null, input.id]
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
  },
  {
    name: 'delete_user',
    description: 'Delete a user by ID',
    schema: deleteUserSchema,
    execute: async (input: z.infer<typeof deleteUserSchema>) => {
      const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [
        input.id,
      ]);
      if (result.rows.length === 0) {
        return JSON.stringify({ success: false, error: 'User not found' });
      }
      return JSON.stringify({
        success: true,
        message: `User ${input.id} deleted successfully`,
      });
    },
  },
];

// Initialize OpenAI LLM
export const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4-turbo',
  temperature: 0.7,
});

// Simple agent executor
export async function processAgentRequest(message: string): Promise<string> {
  // Use the model to understand the user request and call appropriate tools
  const toolDescriptions = tools
    .map(
      t =>
        `- ${t.name}: ${t.description}`
    )
    .join('\n');

  const systemPrompt = `You are a helpful User Management Agent. You can use the following tools:
${toolDescriptions}

When the user asks you to perform an action, respond with a JSON object:
{
  "toolName": "tool_name",
  "toolInput": { /* tool input object */ },
  "thinking": "Your reasoning"
}

If no tool is needed, respond with:
{
  "response": "Your response to the user"
}`;

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ]);

    const content = response.content as string;

    try {
      const parsed = JSON.parse(content);

      if (parsed.toolName) {
        const tool = tools.find(t => t.name === parsed.toolName);
        if (tool) {
          const result = await tool.execute(parsed.toolInput);
          return result;
        }
      }

      return parsed.response || content;
    } catch {
      return content;
    }
  } catch (error) {
    throw error;
  }
}
