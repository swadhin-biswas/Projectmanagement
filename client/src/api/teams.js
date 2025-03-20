import api from './auth';

export const teamAPI = {
  // Create a new team (Student)
  createTeam: async (teamData) => {
    try {
      const response = await api.post('/student/create-team', teamData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create team' };
    }
  },

  // Join a team (Student)
  joinTeam: async (teamData) => {
    try {
      const response = await api.post('/student/join-team', teamData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to join team' };
    }
  },

  // Invite a student to a team
  sendInvite: async (inviteData) => {
    try {
      const response = await api.post('/student/invite-to-team', inviteData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send invite' };
    }
  },

  // Get a list of the supervisor's teams
  getSupervisorTeams: async () => {
    try {
      const response = await api.get('/supervisor/teams');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch teams' };
    }
  }
};

export default teamAPI;
