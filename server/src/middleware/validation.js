import { ValidationError } from '../utils/errors.js';

export const validate = (schema) => ({
  name: 'validation',
  beforeHandle: ({ body, query, params }) => {
    try {
      if (schema.body && body) {
        const { error } = schema.body.validate(body);
        if (error) throw new ValidationError(error.details[0].message);
      }

      if (schema.query && query) {
        const { error } = schema.query.validate(query);
        if (error) throw new ValidationError(error.details[0].message);
      }

      if (schema.params && params) {
        const { error } = schema.params.validate(params);
        if (error) throw new ValidationError(error.details[0].message);
      }
    } catch (error) {
      throw new ValidationError(error.message);
    }
  }
});
