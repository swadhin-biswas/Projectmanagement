import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export function useFormValidation(validationSchema) {
  const [errors, setErrors] = useState({});

  const validate = useCallback(
    async (data) => {
      try {
        // Reset errors
        setErrors({});

        // Validate data against schema
        const validatedData = await validationSchema.validate(data, {
          abortEarly: false,
        });

        return { isValid: true, data: validatedData };
      } catch (error) {
        // Handle Yup validation errors
        if (error.inner) {
          const validationErrors = {};
          error.inner.forEach((err) => {
            validationErrors[err.path] = err.message;
          });
          setErrors(validationErrors);

          // Show toast for the first error
          if (error.inner.length > 0) {
            toast.error('Validation Error', {
              description: error.inner[0].message
            });
          }
        } else {
          // Handle unexpected errors
          toast.error('Validation Error', {
            description: error.message
          });
          setErrors({ form: error.message });
        }

        return { isValid: false, errors };
      }
    },
    [validationSchema]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field, message) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  return {
    errors,
    validate,
    clearErrors,
    setFieldError,
    hasErrors: Object.keys(errors).length > 0,
  };
}