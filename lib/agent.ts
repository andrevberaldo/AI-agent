import { query } from './db';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';

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

// Deep Agent Tools
const getUsers = tool(
  async () => {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return JSON.stringify({ success: true, data: result.rows });
  },
  {
    name: 'get_users',
    description: 'Retrieve all users from the database with their details',
    schema: z.object({}),
  }
);

const createUser = tool(
  async (input: { name: string; email: string }) => {
    const { name, email } = input;
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
  {
    name: 'create_user',
    description: 'Create a new user with name and email',
    schema: z.object({
      name: z.string().describe('The user name'),
      email: z.string().email().describe('The user email address'),
    }),
  }
);

const updateUser = tool(
  async (input: { id: number; name?: string; email?: string }) => {
    const { id, name, email } = input;
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
  {
    name: 'update_user',
    description: 'Update a user by ID with new name or email',
    schema: z.object({
      id: z.number().describe('The user ID'),
      name: z.string().optional().describe('The new user name'),
      email: z.string().email().optional().describe('The new user email address'),
    }),
  }
);

const deleteUser = tool(
  async (input: { id: number }) => {
    const { id } = input;
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return JSON.stringify({ success: false, error: 'User not found' });
    }
    return JSON.stringify({
      success: true,
      message: `User ${id} deleted successfully`,
    });
  },
  {
    name: 'delete_user',
    description: 'Delete a user by ID',
    schema: z.object({
      id: z.number().describe('The user ID'),
    }),
  }
);

export const tools = [getUsers, createUser, updateUser, deleteUser];

// Initialize OpenAI LLM
export const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4-turbo',
  temperature: 0.7,
});

// Deep Agent Executor - Implements Deep Agent pattern with tool calling loop
export async function processAgentRequest(message: string): Promise<string> {
  try {
    // Create tool map for lookups
    const toolMap = new Map(tools.map(t => [t.name, t]));

    // Initialize message history
    let messages: BaseMessage[] = [new HumanMessage(message)];
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      // Call the LLM
      const response = await (model.invoke as any)(messages as any);
      messages.push(response as any);

      // Check if LLM wants to use tools
      const toolCalls = response.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No tools to call, return the response
        return typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      }

      // Process each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        const tool = toolMap.get(toolName);

        if (!tool) {
          messages.push(
            new ToolMessage({
              content: `Tool not found: ${toolName}`,
              tool_call_id: toolCall.id || `call_${Date.now()}`,
              name: toolName,
            })
          );
          continue;
        }

        try {
          // Parse tool arguments
          let toolInput: any;
          if (typeof toolCall.args === 'string') {
            toolInput = JSON.parse(toolCall.args);
          } else {
            toolInput = toolCall.args || {};
          }

          // Invoke the tool
          const toolResult = await (tool as any).invoke(toolInput);

          // Add tool result to messages
          messages.push(
            new ToolMessage({
              content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              tool_call_id: toolCall.id || `call_${Date.now()}`,
              name: toolName,
            })
          );
        } catch (toolError: any) {
          // Add error message if tool execution fails
          messages.push(
            new ToolMessage({
              content: `Tool execution error: ${toolError?.message || String(toolError)}`,
              tool_call_id: toolCall.id || `call_${Date.now()}`,
              name: toolName,
            })
          );
        }
      }
    }

    return `Reached maximum iterations (${maxIterations}) without completion`;
  } catch (error) {
    console.error('Deep Agent Error:', error);
    throw error;
  }
}
