import Joi from 'joi';

// User registration validation schema
export const userRegistrationSchema = Joi.object({
  fullName: Joi.string().required().min(3).max(100),
  email: Joi.string().email().required(),
  password: Joi.string()
    .required()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  role: Joi.string().valid('student', 'supervisor').required(),
  department: Joi.string().required(),
  studentId: Joi.when('role', {
    is: 'student',
    then: Joi.string().required().pattern(/^[0-9]{8}$/).message('Student ID must be 8 digits')
  }),
  semester: Joi.when('role', {
    is: 'student',
    then: Joi.number().required().min(1).max(12)
  }),
  specialization: Joi.when('role', {
    is: 'supervisor',
    then: Joi.string().required()
  }),
  researchInterests: Joi.when('role', {
    is: 'supervisor',
    then: Joi.array().items(Joi.string()).min(1).required()
  }),
  acceptedTerms: Joi.boolean().valid(true).required()
});

// Profile update validation schema
export const profileUpdateSchema = Joi.object({
  fullName: Joi.string().min(3).max(100).optional(),
  department: Joi.string().optional(),
  profilePicture: Joi.string().uri().optional(),
  contactNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  bio: Joi.string().max(500).optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  socialLinks: Joi.object({
    github: Joi.string().uri().optional(),
    linkedin: Joi.string().uri().optional(),
    website: Joi.string().uri().optional()
  }).optional(),
  preferences: Joi.object({
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      digest: Joi.string().valid('none', 'daily', 'weekly')
    }).optional(),
    visibility: Joi.object({
      profile: Joi.string().valid('public', 'private', 'team_only'),
      contactInfo: Joi.string().valid('public', 'private', 'team_only')
    }).optional()
  }).optional()
}).min(1);

// Student profile validation schema
export const studentProfileSchema = Joi.object({
  studentId: Joi.string().pattern(/^[0-9]{8}$/).required(),
  semester: Joi.number().min(1).max(12).required(),
  batch: Joi.string().required(),
  cgpa: Joi.number().min(0).max(4).optional(),
  skills: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      level: Joi.string().valid('beginner', 'intermediate', 'advanced').required()
    })
  ).optional(),
  projectPreferences: Joi.object({
    preferredTypes: Joi.array().items(
      Joi.string().valid('research', 'development', 'analysis', 'design')
    ).optional(),
    preferredDomains: Joi.array().items(Joi.string()).optional(),
    preferredTechnologies: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// Supervisor profile validation schema
export const supervisorProfileSchema = Joi.object({
  specialization: Joi.string().required(),
  designation: Joi.string().required(),
  department: Joi.string().required(),
  researchInterests: Joi.array().items(Joi.string()).min(1).required(),
  expertise: Joi.array().items(
    Joi.object({
      domain: Joi.string().required(),
      years: Joi.number().required(),
      level: Joi.string().valid('expert', 'advanced', 'intermediate').required()
    })
  ).optional(),
  officeHours: Joi.array().items(
    Joi.object({
      day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday').required(),
      startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    })
  ).optional(),
  projectPreferences: Joi.object({
    maxTeams: Joi.number().min(1).max(10).default(5),
    preferredProjectTypes: Joi.array().items(
      Joi.string().valid('research', 'development', 'analysis', 'design')
    ).optional(),
    preferredDomains: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// Password update validation schema
export const passwordUpdateSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .required()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({ 'any.only': 'Passwords do not match' })
});

// Email update validation schema
export const emailUpdateSchema = Joi.object({
  newEmail: Joi.string().email().required(),
  password: Joi.string().required()
});

// Contact information validation schema
export const contactInfoSchema = Joi.object({
  email: Joi.string().email().required(),
  contactNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  alternateEmail: Joi.string().email().optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional(),
    postalCode: Joi.string().optional()
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().optional(),
    relationship: Joi.string().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
  }).optional()
});