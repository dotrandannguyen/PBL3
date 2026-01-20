import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

import { OptionalException } from '../exceptions/index.js';

export const validateRequestMiddleware = (schema) => {
  return (req, _res, next) => {
    try {
      for (const key in schema) {
        const zodSchema = schema[key];

        if (!zodSchema) continue;

        const value = req[key];

        if (Array.isArray(zodSchema)) {
          zodSchema.forEach((s) => s.parse(value));
        } else {
          zodSchema.parse(value);
        }
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues
          .map((e) => `${e.path.join('.')} ${e.message}`)
          .join('; ');

        return next(
          new OptionalException(
            StatusCodes.UNPROCESSABLE_ENTITY,
            message,
          ),
        );
      }

      return next(err);
    }
  };
};
