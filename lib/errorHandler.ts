import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export interface ApiErrorResponse {
  status: number;
  message: string;
  errorId: string;
}

/**
 * Map database errors to HTTP responses with secure error handling
 * - Logs full error details server-side with UUID for debugging
 * - Returns only generic message + errorId to frontend
 * PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function handleDatabaseError(error: any, context?: Record<string, any>): ApiErrorResponse {
  const errorId = uuidv4();
  let status = 500;

  // Determine status code based on error type
  if (error.code === '23505' || error.code === '23503' || error.code === '23502' || error.code === '23514') {
    status = 400;
  } else if (error.code === '23505') {
    status = 409;
  }

  // Log full error details server-side
  logger.error('Database error occurred', {
    errorId,
    code: error.code,
    message: error.message,
    stack: error.stack,
    ...context,
  });

  // Return generic message based on status code
  const genericMessages: Record<number, string> = {
    400: 'Invalid data provided.',
    409: 'Resource conflict occurred.',
    500: 'An error occurred.',
  };

  return {
    status,
    message: `${genericMessages[status] || 'An error occurred.'} Reference: ${errorId}`,
    errorId,
  };
}

/**
 * Map validation errors to HTTP responses with secure error handling
 * - Logs validation errors server-side with UUID
 * - Returns only generic message + errorId to frontend
 */
export function handleValidationError(error: any, context?: Record<string, any>): ApiErrorResponse {
  const errorId = uuidv4();

  logger.warn('Validation error occurred', {
    errorId,
    message: error.message,
    ...context,
  });

  return {
    status: 400,
    message: `Invalid input provided. Reference: ${errorId}`,
    errorId,
  };
}
