import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { tools } from './tools';

// Initialize OpenAI LLM with GPT-4 Turbo
export const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4-turbo',
  temperature: 0.7,
});

/**
 * Deep Agent Executor - Implements iterative tool calling loop
 *
 * Process:
 * 1. Send user message to LLM
 * 2. LLM decides which tools to call with parameters
 * 3. Execute tools and collect results
 * 4. Feed results back to LLM for next iteration
 * 5. Repeat until LLM returns final response or max iterations reached
 */
export async function processAgentRequest(message: string): Promise<string> {
  try {
    // Create tool map for O(1) lookups by name
    const toolMap = new Map(tools.map(t => [t.name, t]));

    // Initialize message history with user message
    let messages: BaseMessage[] = [new HumanMessage(message)];
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      // Call the LLM with current message history
      const response = await (model.invoke as any)(messages as any);
      messages.push(response as any);

      // Check if LLM wants to use tools
      const toolCalls = response.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No tools to call, return the final response from LLM
        return typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      }

      // Execute each tool call in the response
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        const tool = toolMap.get(toolName);

        if (!tool) {
          // Tool not found, return error message to LLM
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
          // Parse tool arguments (can be object or JSON string)
          let toolInput: any;
          if (typeof toolCall.args === 'string') {
            toolInput = JSON.parse(toolCall.args);
          } else {
            toolInput = toolCall.args || {};
          }

          // Invoke the tool with parsed arguments
          const toolResult = await (tool as any).invoke(toolInput);

          // Add tool result to message history
          messages.push(
            new ToolMessage({
              content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
              tool_call_id: toolCall.id || `call_${Date.now()}`,
              name: toolName,
            })
          );
        } catch (toolError: any) {
          // Capture tool execution errors and return to LLM
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
