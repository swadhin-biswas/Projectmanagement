// server/src/utils/validation.js

export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export const validateLogin = (data) => {
  const { email, password } = data;

  // Validate required fields
  if (!email || !password) {
    throw new ValidationError(
      "Email and password are required",
      !email ? "email" : "password"
    );
  }

  // Validate email format
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format", "email");
  }

  // For login, only check that password is not empty and meets minimum length
  if (password.length < 8) {
    throw new ValidationError(
      "Password must be at least 8 characters long",
      "password"
    );
  }
};

export const validateRegistration = (data) => {
  const { fullName, email, password, role, department, studentId, supervisorId, specialization } = data;

  // Validate required fields
  if (!fullName || !email || !password || !role || !department) {
    const missingField = !fullName ? "fullName" : !email ? "email" : !password ? "password" : !role ? "role" : "department";
    throw new ValidationError(`${missingField} is required`, missingField);
  }

  // Validate fullName
  if (!/^[a-zA-Z0-9\s\-\.,']{2,50}$/.test(fullName)) {
    throw new ValidationError(
      "Full name must be 2-50 characters long and contain only letters, numbers, spaces, and basic punctuation",
      "fullName"
    );
  }

  // Validate email format
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format", "email");
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new ValidationError(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      "password"
    );
  }

  // Validate role
  const validRoles = ["student", "supervisor"];
  if (!validRoles.includes(role)) {
    throw new ValidationError(
      "Role must be student or supervisor",
      "role"
    );
  }

  // Validate department
  if (!/^[a-zA-Z\s&',.]{2,50}$/.test(department)) {
    throw new ValidationError(
      "Department must be 2-50 characters long and contain only letters, spaces, and basic punctuation",
      "department"
    );
  }

  // Role-specific validations
  if (role === "supervisor" && !specialization?.trim()) {
    throw new ValidationError("Specialization is required for supervisors", "specialization");
  }

  if (role === "supervisor" && specialization && !/^[a-zA-Z\s&',.]{2,50}$/.test(specialization)) {
    throw new ValidationError(
      "Specialization must be 2-50 characters long and contain only letters, spaces, and basic punctuation",
      "specialization"
    );
  }

  // Optional ID validations
  if (studentId && !/^STU\d{6}$/.test(studentId)) {
    throw new ValidationError("Student ID must start with STU followed by 6 digits", "studentId");
  }

  if (supervisorId && !/^SUP\d{6}$/.test(supervisorId)) {
    throw new ValidationError("Supervisor ID must start with SUP followed by 6 digits", "supervisorId");
  }
};

export const validateSupervisorFields = (data) => {
  const { supervisorId, specialization } = data;

  // Validate supervisorId format (e.g., SUP followed by 3-6 digits)
  if (!supervisorId || !/^SUP\d{3,6}$/.test(supervisorId)) {
    throw new ValidationError(
      "Supervisor ID must start with SUP followed by 3-6 digits",
      "supervisorId"
    );
  }

  // Validate specialization (2-50 characters, letters, spaces, and basic punctuation)
  if (!specialization || !/^[a-zA-Z\s&]{2,50}$/.test(specialization)) {
    throw new ValidationError(
      "Specialization must be 2-50 characters long and contain only letters and spaces",
      "specialization"
    );
  }
};
