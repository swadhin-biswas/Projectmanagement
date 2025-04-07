import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
const missingEnvVars = requiredEnvVars.filter(
  varName => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  logger.error(
    'Missing required Supabase environment variables:',
    missingEnvVars.join(', ')
  );
  throw new Error('Missing required environment variables');
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// Test the connection
supabase.auth.getSession().catch(error => {
  logger.error('Failed to connect to Supabase:', error);
  throw error;
});

export default supabase;