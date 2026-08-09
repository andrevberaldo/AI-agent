import { ChatOpenAI } from '@langchain/openai';
import { createDeepAgent } from 'deepagents';
import { tools } from './tools';

/**
 * Deep Agent Implementation
 *
 * Uses the official LangChain DeepAgent from the deepagents package.
 * Reference: https://reference.langchain.com/javascript/deepagents
 *
 * The Deep Agent pattern enables:
 * - Multi-step reasoning through iterative tool usage
 * - Automatic tool selection and invocation
 * - Context preservation across iterations
 * - Structured approach to complex tasks
 */

// Initialize OpenAI LLM with GPT-4 Turbo
export const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo',
  temperature: 0.7,
});

// Initialize Deep Agent instance
let deepAgent: any = null;

/**
 * Initialize the Deep Agent
 * Lazy initialization to avoid unnecessary agent creation
 */
async function initializeDeepAgent() {
  if (!deepAgent) {
    deepAgent = await createDeepAgent({
      model: model as any,
      tools,
    });
  }
  return deepAgent;
}

/**
 * Process Agent Request
 *
 * Invokes the Deep Agent to process a user message with tool calling capability.
 * The agent automatically:
 * 1. Analyzes the user message
 * 2. Decides which tools to call
 * 3. Executes selected tools
 * 4. Integrates results and iterates if needed
 * 5. Returns final response
 *
 * @param message - User message to process
 * @returns Final response from the agent
 */
export async function processAgentRequest(message: string): Promise<string> {
  try {
    const agent = await initializeDeepAgent();

    // Invoke the Deep Agent with the user message
    const result = await agent.invoke({
      input: message,
    });

    // Extract and return the response
    if (result?.output) {
      return typeof result.output === 'string'
        ? result.output
        : JSON.stringify(result.output);
    }

    if (result?.messages) {
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage?.content) {
        return typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);
      }
    }

    return 'Agent completed processing';
  } catch (error) {
    console.error('Deep Agent Error:', error);
    throw error;
  }
}
