import { userRepository } from '@/lib/repositories/userRepository';
import { CreateUserSchema } from '@/lib/schemas';
import { handleDatabaseError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
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
    logger.error('Failed to fetch users', error as Error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      const errorMessage = firstIssue?.message || 'Invalid request';
      logger.warn('User creation validation failed', { error: errorMessage });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { name, email } = validation.data;
    const user = await userRepository.create(name, email);
    logger.info('User created successfully', { userId: user.id, email });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: any) {
    logger.error('Failed to create user', error);
    const errorResponse = handleDatabaseError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.status }
    );
  }
}
