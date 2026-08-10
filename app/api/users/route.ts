import { userRepository } from '@/lib/repositories/userRepository';
import { CreateUserSchema } from '@/lib/schemas';
import { handleDatabaseError, handleValidationError } from '@/lib/errorHandler';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const users = await userRepository.getAll();
    return NextResponse.json({ data: users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      const error = validation.error.errors[0];
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { name, email } = validation.data;
    const user = await userRepository.create(name, email);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: any) {
    const errorResponse = handleDatabaseError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: errorResponse.status }
    );
  }
}
