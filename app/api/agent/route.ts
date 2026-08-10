import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { processAgentRequest } from '@/lib/deepagent';
import { v4 as uuidv4 } from 'uuid';

/**
 * Primary Agent API Endpoint
 *
 * Architecture: Deep Agent is the single primary AI framework.
 * - Tools: Defined in lib/tools.ts using @langchain/core/tools
 * - Agent: Implemented via createDeepAgent in lib/deepagent.ts
 * - Checkpointing: Handled by PostgresCheckpointSaver in lib/postgres-checkpointer.ts
 * - UI: CopilotKit widget uses /api/copilotkit as thin adapter to this endpoint
 */

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
    await query(
      `INSERT INTO agent_history (thread_id, message_type, content)
       VALUES ($1, $2, $3)`,
      [finalThreadId, 'user', JSON.stringify({
        text: message,
        timestamp: new Date().toISOString(),
      })]
    );

    // Process message with agent
    const assistantMessage = await processAgentRequest(message);

    // Save assistant response to history
    await query(
      `INSERT INTO agent_history (thread_id, message_type, content)
       VALUES ($1, $2, $3)`,
      [finalThreadId, 'assistant', JSON.stringify({
        text: assistantMessage,
        timestamp: new Date().toISOString(),
      })]
    );

    // Save agent state checkpoint
    const checkpointId = uuidv4();
    await query(
      `INSERT INTO agent_state (thread_id, checkpoint_id, state, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (thread_id) DO UPDATE SET
       checkpoint_id = $2, state = $3, metadata = $4, updated_at = CURRENT_TIMESTAMP`,
      [
        finalThreadId,
        checkpointId,
        JSON.stringify({
          lastMessage: message,
          responseGenerated: true,
        }),
        JSON.stringify({
          processedAt: new Date().toISOString(),
        })
      ]
    );

    // Get updated history
    const historyResult = await query(
      'SELECT * FROM agent_history WHERE thread_id = $1 ORDER BY created_at ASC',
      [finalThreadId]
    );
    const history = historyResult.rows.map((row: any) => ({
      messageType: row.message_type,
      content: JSON.parse(row.content),
      createdAt: row.created_at,
    }));

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

    // Get latest checkpoint
    const checkpointResult = await query(
      'SELECT * FROM agent_state WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 1',
      [threadId]
    );

    const checkpoint = checkpointResult.rows.length > 0
      ? {
          threadId: checkpointResult.rows[0].thread_id,
          checkpointId: checkpointResult.rows[0].checkpoint_id,
          state: JSON.parse(checkpointResult.rows[0].state),
          metadata: JSON.parse(checkpointResult.rows[0].metadata || '{}'),
        }
      : null;

    // Get history
    const historyResult = await query(
      'SELECT * FROM agent_history WHERE thread_id = $1 ORDER BY created_at ASC',
      [threadId]
    );
    const history = historyResult.rows.map((row: any) => ({
      messageType: row.message_type,
      content: JSON.parse(row.content),
      createdAt: row.created_at,
    }));

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
