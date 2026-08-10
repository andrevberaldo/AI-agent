/**
 * Core domain types for the AI-Agent application
 */

// User types
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

// Agent types
export interface AgentMessage {
  message: string;
  threadId?: string;
}

export interface AgentHistory {
  messageType: 'user' | 'assistant' | 'action';
  content: Record<string, any>;
  createdAt: string;
}

export interface AgentState {
  threadId: string;
  checkpointId: string;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentCheckpoint {
  threadId: string;
  checkpointId: string;
  state: Record<string, any>;
  metadata: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  status: number;
}
