import { User } from '../models/User.js';

export const setupSuperAdmin = async (body, setupKey) => {
  try {
    // Verify setup key
    if (setupKey !== process.env.SUPER_ADMIN_SETUP_KEY) {
      return { error: 'Invalid setup key', status: 401 };
    }

    // Check if setup is already completed
    if (process.env.INITIAL_SETUP_COMPLETED === 'true') {
      return { error: 'Initial setup already completed', status: 400 };
    }

    // Check if any superadmin exists
    const superadminExists = await User.superadminExists();
    if (superadminExists) {
      return { error: 'Super admin already exists', status: 400 };
    }

    // Create superadmin with default credentials
    const superadmin = await User.create({
      fullName: 'Super Admin',
      email: process.env.DEFAULT_ADMIN_EMAIL,
      password: process.env.DEFAULT_ADMIN_PASSWORD,
      role: 'superadmin',
      department: 'Administration', // Required field
      isApproved: true
    });

    // Update INITIAL_SETUP_COMPLETED in .env
    process.env.INITIAL_SETUP_COMPLETED = 'true';

    return {
      success: true,
      message: 'Super admin created successfully',
      email: superadmin.email
    };
  } catch (error) {
    console.error('Error creating superadmin:', error);
    return { 
      error: error.message || 'Failed to create superadmin', 
      status: 500 
    };
  }
};
