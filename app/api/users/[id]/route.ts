import { userRepository } from '@/lib/repositories/userRepository';
import { UpdateUserSchema, UserIdSchema } from '@/lib/schemas';
import { handleDatabaseError, handleValidationError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const validation = UserIdSchema.safeParse({ id });
    if (!validation.success) {
      const errorResponse = handleValidationError(validation.error, { endpoint: 'GET /api/users/[id]', id });
      return NextResponse.json(
        { error: errorResponse.message, errorId: errorResponse.errorId },
        { status: errorResponse.status }
      );
    }

    const user = await userRepository.getById(validation.data.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ data: user });
  } catch (error) {
    const errorId = uuidv4();
    logger.error('Failed to fetch user', { errorId, error: error as Error });
    return NextResponse.json(
      { error: `An error occurred. Reference: ${errorId}`, errorId },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const idValidation = UserIdSchema.safeParse({ id });
    if (!idValidation.success) {
      const errorResponse = handleValidationError(idValidation.error, { endpoint: 'PUT /api/users/[id]', id });
      return NextResponse.json(
        { error: errorResponse.message, errorId: errorResponse.errorId },
        { status: errorResponse.status }
      );
    }

    const body = await request.json();
    const bodyValidation = UpdateUserSchema.safeParse(body);
    if (!bodyValidation.success) {
      const errorResponse = handleValidationError(bodyValidation.error, { endpoint: 'PUT /api/users/[id]', id });
      return NextResponse.json(
        { error: errorResponse.message, errorId: errorResponse.errorId },
        { status: errorResponse.status }
      );
    }

    const { name, email } = bodyValidation.data;
    const user = await userRepository.update(idValidation.data.id, name, email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error: any) {
    const errorResponse = handleDatabaseError(error, { endpoint: 'PUT /api/users/[id]', id });
    return NextResponse.json(
      { error: errorResponse.message, errorId: errorResponse.errorId },
      { status: errorResponse.status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const validation = UserIdSchema.safeParse({ id });
    if (!validation.success) {
      const errorResponse = handleValidationError(validation.error, { endpoint: 'DELETE /api/users/[id]', id });
      return NextResponse.json(
        { error: errorResponse.message, errorId: errorResponse.errorId },
        { status: errorResponse.status }
      );
    }

    const deleted = await userRepository.delete(validation.data.id);
    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    const errorId = uuidv4();
    logger.error('Failed to delete user', { errorId, error: error as Error });
    return NextResponse.json(
      { error: `An error occurred. Reference: ${errorId}`, errorId },
      { status: 500 }
    );
  }
}
