import { NextRequest, NextResponse } from 'next/server';
import { processAgentRequest } from '@/lib/deepagent';

/**
 * CopilotKit UI Adapter Endpoint
 *
 * This is a thin adapter that converts CopilotKit message format
 * to the primary Deep Agent endpoint. It enables the CopilotKit chat widget
 * to use the Deep Agent backend without duplication.
 *
 * Primary logic lives in /api/agent - any changes to agent behavior
 * should be made there first.
 */

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

    const lastMessage = messages[messages.length - 1];
    const response = await processAgentRequest(lastMessage.content);

    return NextResponse.json({
      messages: [
        {
          role: 'assistant',
          content: response || 'I processed your request.',
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
      { status: 200 }
    );
  }
}
