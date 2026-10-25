import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.status >= 500) req.log?.error({ err }, err.message);
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  // body-parser errors (malformed JSON, payload too large)
  const status = typeof err?.status === 'number' ? err.status : undefined;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({
      error: { code: 'VALIDATION_ERROR', message: err.type === 'entity.too.large' ? 'Request body too large' : 'Malformed request body' },
    });
    return;
  }
  (req.log ?? logger).error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
};
