import { NextRequest, NextResponse } from 'next/server';
import { checkpointer, processAgentRequest } from '@/lib/agent';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, threadId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const finalThreadId = threadId || uuidv4();

    // Save user message to history
    await checkpointer.saveHistory(finalThreadId, 'user', {
      text: message,
      timestamp: new Date().toISOString(),
    });

    // Process message with agent
    const assistantMessage = await processAgentRequest(message);

    // Save assistant response to history
    await checkpointer.saveHistory(finalThreadId, 'assistant', {
      text: assistantMessage,
      timestamp: new Date().toISOString(),
    });

    // Save agent state checkpoint
    const checkpointId = uuidv4();
    await checkpointer.saveCheckpoint(
      finalThreadId,
      checkpointId,
      {
        lastMessage: message,
        responseGenerated: true,
      },
      {
        processedAt: new Date().toISOString(),
      }
    );

    // Get updated history
    const history = await checkpointer.getHistory(finalThreadId);

    return NextResponse.json({
      threadId: finalThreadId,
      message: assistantMessage,
      history,
    });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const threadId = request.nextUrl.searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json(
        { error: 'ThreadId is required' },
        { status: 400 }
      );
    }

    const checkpoint = await checkpointer.getCheckpoint(threadId);
    const history = await checkpointer.getHistory(threadId);

    return NextResponse.json({
      threadId,
      checkpoint,
      history,
    });
  } catch (error) {
    console.error('Failed to fetch agent state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent state' },
      { status: 500 }
    );
  }
}
