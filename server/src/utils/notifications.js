// Validate notification template parameters
export const validateTemplate = (template, params) => {
  // Extract required parameters from template
  const requiredParams = (template.match(/\{\{([^}]+)\}\}/g) || [])
    .map(param => param.slice(2, -2).trim());

  // Check if all required parameters are provided
  const missingParams = requiredParams.filter(param => !params.hasOwnProperty(param));
  if (missingParams.length > 0) {
    throw new Error(`Missing required template parameters: ${missingParams.join(', ')}`);
  }

  return true;
};

// Compile template with parameters
export const compileTemplate = (template, params) => {
  validateTemplate(template, params);
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => params[key.trim()] || '');
};

// Validate email template
export const validateEmailTemplate = (template) => {
  const requiredSections = ['subject', 'body'];
  const missingSections = requiredSections.filter(section => !template[section]);

  if (missingSections.length > 0) {
    throw new Error(`Missing required email template sections: ${missingSections.join(', ')}`);
  }

  return true;
};