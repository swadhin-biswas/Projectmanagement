import { config } from 'dotenv';
import mongoose from 'mongoose';

config(); // Load environment variables

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/test';

export const setupTestDB = () => {
  beforeAll(async () => {
    try {
      await mongoose.connect(TEST_MONGODB_URI);
    } catch (error) {
      console.error('Test database connection error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();
    } catch (error) {
      console.error('Test database cleanup error:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  });
};

export const createTestUser = async (userData) => {
  const { User } = await import('../models/User.js');
  return await User.create(userData);
};

export const generateMockUser = (role = 'student') => ({
  fullName: `Test ${role}`,
  email: `test.${role}@example.com`,
  password: 'Test@123',
  role,
  department: 'Computer Science',
  ...(role === 'student' ? { studentId: 'STU123456' } : {}),
  ...(role === 'supervisor' ? {
    supervisorId: 'SUP123456',
    specialization: 'Machine Learning'
  } : {})
});