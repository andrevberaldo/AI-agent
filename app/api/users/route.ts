import { userRepository } from '@/lib/repositories/userRepository';
import { CreateUserSchema } from '@/lib/schemas';
import { handleDatabaseError, handleValidationError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit');
    const offset = request.nextUrl.searchParams.get('offset');

    const options = limit || offset
      ? { limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined }
      : undefined;

    const users = await userRepository.getAll(options);
    logger.info('Retrieved users', { count: Array.isArray(users) ? users.length : users.data.length });
    return NextResponse.json({ data: users });
  } catch (error) {
    const errorId = uuidv4();
    logger.error('Failed to fetch users', { errorId, error: error as Error });
    return NextResponse.json(
      { error: `An error occurred. Reference: ${errorId}`, errorId },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      const errorResponse = handleValidationError(validation.error, { endpoint: 'POST /api/users' });
      return NextResponse.json(
        { error: errorResponse.message, errorId: errorResponse.errorId },
        { status: errorResponse.status }
      );
    }

    const { name, email } = validation.data;
    const user = await userRepository.create(name, email);
    logger.info('User created successfully', { userId: user.id, email });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: any) {
    const errorResponse = handleDatabaseError(error, { endpoint: 'POST /api/users', email: error?.detail });
    return NextResponse.json(
      { error: errorResponse.message, errorId: errorResponse.errorId },
      { status: errorResponse.status }
    );
  }
}
