// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation regex (min 8 chars, at least one number, one letter)
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

// Phone number validation regex
const phoneRegex = /^\+?[\d\s-]{10,}$/;

export const validateUserForm = (data) => {
  const errors = {};

  // Name validation
  if (!data.name) {
    errors.name = "Name is required";
  } else if (data.name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  } else if (data.name.length > 50) {
    errors.name = "Name must be less than 50 characters";
  }

  // Email validation
  if (!data.email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Password validation (only for new users or password changes)
  if (data.password) {
    if (!passwordRegex.test(data.password)) {
      errors.password =
        "Password must be at least 8 characters and contain at least one letter and one number";
    }
  }

  // Role validation
  if (!data.role) {
    errors.role = "Role is required";
  } else if (!["admin", "supervisor", "student"].includes(data.role)) {
    errors.role = "Invalid role selected";
  }

  // Department validation (if provided)
  if (data.department && data.department.length < 2) {
    errors.department = "Department name must be at least 2 characters";
  }

  // Phone validation (if provided)
  if (data.phone && !phoneRegex.test(data.phone)) {
    errors.phone = "Please enter a valid phone number";
  }

  // Status validation (if provided)
  if (data.status && !["active", "inactive", "pending"].includes(data.status)) {
    errors.status = "Invalid status selected";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateTeamForm = (data) => {
  const errors = {};

  if (!data.name) {
    errors.name = "Team name is required";
  } else if (data.name.length < 2) {
    errors.name = "Team name must be at least 2 characters";
  }

  if (data.members && !Array.isArray(data.members)) {
    errors.members = "Members must be a valid array";
  }

  if (data.supervisors && !Array.isArray(data.supervisors)) {
    errors.supervisors = "Supervisors must be a valid array";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateProjectForm = (data) => {
  const errors = {};

  if (!data.title) {
    errors.title = "Project title is required";
  } else if (data.title.length < 3) {
    errors.title = "Project title must be at least 3 characters";
  }

  if (!data.description) {
    errors.description = "Project description is required";
  } else if (data.description.length < 10) {
    errors.description = "Project description must be at least 10 characters";
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      errors.endDate = "End date cannot be before start date";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateSessionForm = (data) => {
  const errors = {};

  if (!data.name) {
    errors.name = "Session name is required";
  }

  if (!data.startDate) {
    errors.startDate = "Start date is required";
  }

  if (!data.endDate) {
    errors.endDate = "End date is required";
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      errors.endDate = "End date cannot be before start date";
    }

    // Check if session duration is between 4-5 months
    const diffMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    if (diffMonths < 4 || diffMonths > 5) {
      errors.endDate = "Session duration must be between 4-5 months";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
