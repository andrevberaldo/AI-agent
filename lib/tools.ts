import { userRepository } from './repositories/userRepository';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// Get Users Tool
export const getUsers = tool(
  async () => {
    const users = await userRepository.getAll();
    return JSON.stringify({ success: true, data: users });
  },
  {
    name: 'get_users',
    description: 'Retrieve all users from the database with their details',
    schema: z.object({}),
  }
);

// Create User Tool
export const createUser = tool(
  async (input: { name: string; email: string }) => {
    const { name, email } = input;
    try {
      const user = await userRepository.create(name, email);
      return JSON.stringify({ success: true, data: user });
    } catch (error: any) {
      if (error.code === '23505') {
        return JSON.stringify({ success: false, error: 'Email already exists' });
      }
      throw error;
    }
  },
  {
    name: 'create_user',
    description: 'Create a new user with name and email',
    schema: z.object({
      name: z.string().describe('The user name'),
      email: z.string().email().describe('The user email address'),
    }),
  }
);

// Update User Tool
export const updateUser = tool(
  async (input: { id: number; name?: string; email?: string }) => {
    const { id, name, email } = input;
    try {
      const user = await userRepository.update(id, name, email);
      if (!user) {
        return JSON.stringify({ success: false, error: 'User not found' });
      }
      return JSON.stringify({ success: true, data: user });
    } catch (error: any) {
      if (error.code === '23505') {
        return JSON.stringify({ success: false, error: 'Email already exists' });
      }
      throw error;
    }
  },
  {
    name: 'update_user',
    description: 'Update a user by ID with new name or email',
    schema: z.object({
      id: z.number().describe('The user ID'),
      name: z.string().optional().describe('The new user name'),
      email: z.string().email().optional().describe('The new user email address'),
    }),
  }
);

// Delete User Tool
export const deleteUser = tool(
  async (input: { id: number }) => {
    const { id } = input;
    const deleted = await userRepository.delete(id);
    if (!deleted) {
      return JSON.stringify({ success: false, error: 'User not found' });
    }
    return JSON.stringify({
      success: true,
      message: `User ${id} deleted successfully`,
    });
  },
  {
    name: 'delete_user',
    description: 'Delete a user by ID',
    schema: z.object({
      id: z.number().describe('The user ID'),
    }),
  }
);

// Export all tools
export const tools = [getUsers, createUser, updateUser, deleteUser];
