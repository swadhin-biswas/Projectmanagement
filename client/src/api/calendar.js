import { api } from '../lib/api';

export const calendarApi = {
  // Get project events
  getEvents: async (projectId, { view, start, end } = {}) => {
    const params = new URLSearchParams();
    if (view) params.append('view', view);
    if (start) params.append('start', start);
    if (end) params.append('end', end);

    const query = params.toString();
    const url = `/projects/${projectId}/calendar${query ? `?${query}` : ''}`;

    return api.get(url);
  },

  // Create new event
  createEvent: async (projectId, eventData) => {
    return api.post(`/projects/${projectId}/calendar`, eventData);
  },

  // Update attendance status
  updateAttendance: async (projectId, eventId, status) => {
    return api.post(`/projects/${projectId}/calendar/${eventId}/attendance`, {
      status
    });
  },

  // Invite members to event
  inviteMembers: async (projectId, eventId, members) => {
    return api.post(`/projects/${projectId}/calendar/${eventId}/invite`, {
      members
    });
  }
};