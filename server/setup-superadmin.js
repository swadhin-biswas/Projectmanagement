// setup-superadmin.js
import fetch from 'node-fetch';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '.env') });

async function setupSuperAdmin() {
  try {
    const response = await fetch('http://localhost:3000/api/setup/superadmin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Setup-Key': process.env.SUPER_ADMIN_SETUP_KEY
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error setting up superadmin:', error);
  }
}

// Run the setup
setupSuperAdmin();
