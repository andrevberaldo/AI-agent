import { NextRequest, NextResponse } from 'next/server';
import { createAgent } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    const agent = await createAgent();

    // Format messages for the agent
    const lastMessage = messages[messages.length - 1];

    // Execute agent with the message
    const response = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: lastMessage.content,
        },
      ],
    });

    // Extract the assistant's response
    const assistantMessage = response.messages?.[response.messages.length - 1];

    return NextResponse.json({
      messages: [
        {
          role: 'assistant',
          content: assistantMessage?.content || 'I processed your request.',
        },
      ],
    });
  } catch (error) {
    console.error('Copilot Kit error:', error);
    return NextResponse.json(
      {
        messages: [
          {
            role: 'assistant',
            content:
              'An error occurred while processing your request. Please try again.',
          },
        ],
      },
      { status: 200 } // Return 200 to avoid breaking the UI
    );
  }
}
