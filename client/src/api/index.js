// Export all API functions
import { api } from '../lib/api'; // Import the base api instance
import { authAPI } from './auth'; // Import authAPI from auth.js
import sessionAPI from './sessions';
import teamAPI from './teams';
import projectAPI from './projects';
import dashboardAPI from './dashboard';

// Export all APIs
export {
  api, // Export the base api instance
  authAPI,
  sessionAPI,
  teamAPI,
  projectAPI,
  dashboardAPI
};

export default api; 