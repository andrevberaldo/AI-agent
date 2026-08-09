import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { tools } from './tools';

/**
 * Deep Agent Implementation
 *
 * This is a custom implementation of the Deep Agent pattern as described in:
 * https://reference.langchain.com/javascript/deepagents
 *
 * The Deep Agent pattern enables:
 * - Multi-step reasoning through iterative tool usage
 * - Automatic tool selection and invocation
 * - Context preservation across iterations
 * - Structured approach to complex tasks
 */

// Initialize OpenAI LLM with GPT-4 Turbo
export const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4-turbo',
  temperature: 0.7,
});

/**
 * Deep Agent Executor
 *
 * Implements the iterative tool calling loop:
 * 1. Send message to LLM
 * 2. LLM analyzes and decides which tools to call
 * 3. Tools are executed and results returned to LLM
 * 4. Process repeats until LLM provides final response
 *
 * @param message - User message to process
 * @returns Final response from the agent
 */
export async function processAgentRequest(message: string): Promise<string> {
  try {
    // Create tool map for efficient lookup
    const toolMap = new Map(tools.map(t => [t.name, t]));

    // Initialize conversation with user message
    const messages: any[] = [new HumanMessage(message)];
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      // Step 1: Call LLM with current message history
      const response = await (model.invoke as any)(messages);
      messages.push(response);

      // Step 2: Check if LLM wants to use any tools
      const toolCalls = response.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No tools to call - return the final response
        return typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      }

      // Step 3: Execute each tool call
      for (const toolCall of toolCalls) {
        const tool = toolMap.get(toolCall.name);

        if (!tool) {
          messages.push(
            new ToolMessage({
              content: `Tool not found: ${toolCall.name}`,
              tool_call_id: toolCall.id || `call_${Date.now()}`,
              name: toolCall.name,
            })
          );
          continue;
        }

        try {
          // Parse arguments (can be object or JSON string)
          const args = typeof toolCall.args === 'string'
            ? JSON.parse(toolCall.args)
            : (toolCall.args || {});

          // Execute the tool
          const result = await (tool as any).invoke(args);

          // Step 4: Return tool result to LLM
          messages.push(
            new ToolMessage({
              content: typeof result === 'string' ? result : JSON.stringify(result),
              tool_call_id: toolCall.id || `call_${Date.now()}`,
              name: toolCall.name,
            })
          );
        } catch (error: any) {
          // Handle tool errors gracefully
          messages.push(
            new ToolMessage({
              content: `Error: ${error?.message || String(error)}`,
              tool_call_id: toolCall.id || `call_${Date.now()}`,
              name: toolCall.name,
            })
          );
        }
      }
    }

    return `Agent completed after reaching ${maxIterations} iterations`;
  } catch (error) {
    console.error('Deep Agent Error:', error);
    throw error;
  }
}
