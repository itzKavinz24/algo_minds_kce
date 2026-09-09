export class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function publicError(error) {
  if (error instanceof AppError) return { code: error.code, message: error.message, details: error.details };
  return { code: 'INTERNAL_ERROR', message: 'The data source request failed' };
}
