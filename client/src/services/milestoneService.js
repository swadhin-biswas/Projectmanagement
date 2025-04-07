import { useWebSocket } from '../contexts/WebSocketContext';
import { api } from '../lib/api';

export const useMilestoneCollaboration = (projectId) => {
  const { socket } = useWebSocket();

  const updateMilestone = async (milestoneId, updateData) => {
    try {
      const response = await api.patch(`/api/projects/${projectId}/milestones/${milestoneId}`, updateData);

      if (socket) {
        socket.emit('milestone:update', {
          projectId,
          milestoneId,
          ...updateData
        });
      }

      return response.data;
    } catch (error) {
      console.error('Failed to update milestone:', error);
      throw error;
    }
  };

  const createMilestone = async (milestoneData) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/milestones`, milestoneData);

      if (socket) {
        socket.emit('milestone:create', {
          projectId,
          milestone: response.data.milestone
        });
      }

      return response.data;
    } catch (error) {
      console.error('Failed to create milestone:', error);
      throw error;
    }
  };

  const deleteMilestone = async (milestoneId) => {
    try {
      await api.delete(`/api/projects/${projectId}/milestones/${milestoneId}`);

      if (socket) {
        socket.emit('milestone:delete', {
          projectId,
          milestoneId
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      throw error;
    }
  };

  const assignMember = async (milestoneId, memberId) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/milestones/${milestoneId}/assign`, {
        memberId
      });

      if (socket) {
        socket.emit('milestone:assign', {
          projectId,
          milestoneId,
          memberId
        });
      }

      return response.data;
    } catch (error) {
      console.error('Failed to assign member:', error);
      throw error;
    }
  };

  const markComplete = async (milestoneId) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/milestones/${milestoneId}/complete`);

      if (socket) {
        socket.emit('milestone:complete', {
          projectId,
          milestoneId
        });
      }

      return response.data;
    } catch (error) {
      console.error('Failed to mark milestone as complete:', error);
      throw error;
    }
  };

  return {
    updateMilestone,
    createMilestone,
    deleteMilestone,
    assignMember,
    markComplete
  };
};