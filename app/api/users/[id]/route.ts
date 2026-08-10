import { userRepository } from '@/lib/repositories/userRepository';
import { UpdateUserSchema, UserIdSchema } from '@/lib/schemas';
import { handleDatabaseError } from '@/lib/errorHandler';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const validation = UserIdSchema.safeParse({ id });
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await userRepository.getById(validation.data.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const bodyValidation = UpdateUserSchema.safeParse(body);
    if (!bodyValidation.success) {
      const error = bodyValidation.error.errors[0];
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { name, email } = bodyValidation.data;
    const user = await userRepository.update(idValidation.data.id, name, email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error: any) {
    const errorResponse = handleDatabaseError(error);
    return NextResponse.json(
      { error: errorResponse.message },
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
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const deleted = await userRepository.delete(validation.data.id);
    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
