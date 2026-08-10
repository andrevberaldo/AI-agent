import { z } from 'zod';

// User schemas
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Invalid email address'),
});

export const UpdateUserSchema = CreateUserSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

export const UserIdSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer'),
});

// Agent schemas
export const AgentMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  threadId: z.string().uuid('Invalid thread ID format').optional(),
});

export const AgentThreadSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID format'),
});
