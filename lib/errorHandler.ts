export interface ApiErrorResponse {
  status: number;
  message: string;
}

/**
 * Map database errors to HTTP responses
 * PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function handleDatabaseError(error: any): ApiErrorResponse {
  if (error.code === '23505') {
    return {
      status: 409,
      message: 'Email already exists',
    };
  }

  if (error.code === '23503') {
    return {
      status: 400,
      message: 'Invalid reference: foreign key constraint violation',
    };
  }

  if (error.code === '23502') {
    return {
      status: 400,
      message: 'Missing required field',
    };
  }

  if (error.code === '23514') {
    return {
      status: 400,
      message: 'Value violates check constraint',
    };
  }

  return {
    status: 500,
    message: 'Database error',
  };
}

/**
 * Map validation errors to HTTP responses
 */
export function handleValidationError(error: any): ApiErrorResponse {
  if (error instanceof SyntaxError) {
    return {
      status: 400,
      message: 'Invalid JSON in request body',
    };
  }

  return {
    status: 400,
    message: error.message || 'Validation error',
  };
}
