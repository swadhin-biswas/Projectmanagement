import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useTeam(teamId) {
  const { user } = useAuth();
  const { sendMessage } = useWebSocket();
  const queryClient = useQueryClient();

  // Fetch team details
  const {
    data: team,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const response = await api.get(`/api/teams/${teamId}`);
      return response.data.team;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Create team
  const createTeam = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/teams/create', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['team', data.team._id], data.team);
      toast.success('Team created successfully');
    }
  });

  // Update team
  const updateTeam = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/api/teams/${teamId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['team', teamId], data.team);
      toast.success('Team updated successfully');

      // Notify team members via WebSocket
      sendMessage({
        type: 'team_update',
        teamId,
        action: 'update',
        data: data.team
      });
    }
  });

  // Send team invitation
  const sendInvite = useMutation({
    mutationFn: async (userId) => {
      const response = await api.post(`/api/teams/${teamId}/invite`, { userId });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Invitation sent successfully');

      // Notify via WebSocket
      sendMessage({
        type: 'team_update',
        teamId,
        action: 'invite',
        data: {
          invitedUserId: data.invitation.userId
        }
      });
    }
  });

  // Remove team member
  const removeMember = useMutation({
    mutationFn: async (userId) => {
      const response = await api.delete(`/api/teams/${teamId}/members/${userId}`);
      return response.data;
    },
    onSuccess: (_, userId) => {
      // Optimistically update team data
      queryClient.setQueryData(['team', teamId], (old) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.filter(m => m.user._id !== userId)
        };
      });

      toast.success('Team member removed');

      // Notify via WebSocket
      sendMessage({
        type: 'team_update',
        teamId,
        action: 'remove_member',
        data: { userId }
      });
    }
  });

  // Leave team
  const leaveTeam = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/teams/${teamId}/leave`);
      return response.data;
    },
    onSuccess: () => {
      // Clear team from cache
      queryClient.removeQueries(['team', teamId]);
      toast.success('Left team successfully');

      // Notify via WebSocket
      sendMessage({
        type: 'team_update',
        teamId,
        action: 'leave',
        data: { userId: user._id }
      });
    }
  });

  // Change team leader
  const changeLeader = useMutation({
    mutationFn: async (newLeaderId) => {
      const response = await api.put(`/api/teams/${teamId}/leader`, { userId: newLeaderId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['team', teamId], data.team);
      toast.success('Team leader changed successfully');

      // Notify via WebSocket
      sendMessage({
        type: 'team_update',
        teamId,
        action: 'change_leader',
        data: { newLeaderId: data.team.leader }
      });
    }
  });

  // Respond to team invitation
  const respondToInvite = useMutation({
    mutationFn: async ({ inviteId, accept }) => {
      const response = await api.post(`/api/teams/invites/${inviteId}/respond`, { accept });
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (variables.accept) {
        queryClient.setQueryData(['team', data.team._id], data.team);
        toast.success('Joined team successfully');
      } else {
        toast.info('Invitation declined');
      }
    }
  });

  return {
    team,
    isLoading,
    error,
    createTeam: createTeam.mutate,
    updateTeam: updateTeam.mutate,
    sendInvite: sendInvite.mutate,
    removeMember: removeMember.mutate,
    leaveTeam: leaveTeam.mutate,
    changeLeader: changeLeader.mutate,
    respondToInvite: respondToInvite.mutate,
    refetch,
    isCreating: createTeam.isLoading,
    isUpdating: updateTeam.isLoading,
    isSendingInvite: sendInvite.isLoading,
    isRemoving: removeMember.isLoading,
    isLeaving: leaveTeam.isLoading,
    isChangingLeader: changeLeader.isLoading,
    isRespondingToInvite: respondToInvite.isLoading,
  };
}