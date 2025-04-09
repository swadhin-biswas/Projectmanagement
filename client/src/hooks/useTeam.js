import { teamAPI } from "@/api/teams";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook for team operations that provides team data and operations
 * Uses the consolidated teamAPI service for all API requests
 *
 * @param {string} teamId - The ID of the team to interact with
 */
export function useTeam(teamId) {
  const { user } = useAuth();
  const { sendMessage } = useWebSocket();
  const queryClient = useQueryClient();

  // Fetch team details
  const {
    data: team,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const response = await teamAPI.common.getTeam(teamId);
      return response.team || response.data; // Handle different response formats
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Get user role
  const userRole = user?.role || "student";
  const isStudent = userRole === "student";
  const isSupervisor = userRole === "supervisor" || userRole === "admin";
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  // Create team
  const createTeam = useMutation({
    mutationFn: async (data) => {
      // Use student endpoint for students, admin endpoint for admins
      if (isAdmin) {
        return teamAPI.admin.createTeam(data);
      } else {
        return teamAPI.student.createTeam(data);
      }
    },
    onSuccess: (data) => {
      const newTeam = data.team || data.data;
      const newTeamId = newTeam?._id;

      if (newTeamId) {
        queryClient.setQueryData(["team", newTeamId], newTeam);
        // Store current team ID for convenience
        localStorage.setItem("currentTeamId", newTeamId);
      }
      toast.success("Team created successfully");
    },
  });

  // Update team
  const updateTeam = useMutation({
    mutationFn: async (data) => {
      // Use different endpoints based on role
      if (isAdmin) {
        return teamAPI.admin.updateTeam(teamId, data);
      } else if (isSupervisor) {
        return teamAPI.supervisor.updateTeam(teamId, data);
      } else {
        // Use PUT to /api/teams/:teamId
        const response = await fetch(`/api/teams/${teamId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(data),
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      const updatedTeam = data.team || data.data;
      queryClient.setQueryData(["team", teamId], updatedTeam);
      toast.success("Team updated successfully");

      // Notify team members via WebSocket
      sendMessage({
        type: "team_update",
        teamId,
        action: "update",
        data: updatedTeam,
      });
    },
  });

  // Send team invitation
  const sendInvite = useMutation({
    mutationFn: async (studentData) => {
      // Extract studentId or use the whole object
      const studentId =
        typeof studentData === "string" ? studentData : studentData.studentId;
      const data =
        typeof studentData === "string" ? { studentId } : studentData;

      return teamAPI.student.inviteStudent(teamId, data);
    },
    onSuccess: (data) => {
      toast.success("Invitation sent successfully");

      // Get the invitation data from the response
      const invitation = data.invitation || data.data?.invitation || {};

      // Notify via WebSocket
      sendMessage({
        type: "team_update",
        teamId,
        action: "invite",
        data: {
          invitedUserId: invitation.student || invitation.userId,
        },
      });
    },
  });

  // Remove team member
  const removeMember = useMutation({
    mutationFn: async (userId) => {
      // POST to /api/teams/{teamId}/remove-member for more compatibility with
      // both Express and Elysia implementations
      const response = await fetch(`/api/teams/${teamId}/remove-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ memberId: userId }),
      });
      return response.json();
    },
    onSuccess: (_, userId) => {
      // Optimistically update team data
      queryClient.setQueryData(["team", teamId], (old) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.filter((m) => m.user._id !== userId),
        };
      });

      toast.success("Team member removed");

      // Notify via WebSocket
      sendMessage({
        type: "team_update",
        teamId,
        action: "remove_member",
        data: { userId },
      });
    },
  });

  // Leave team
  const leaveTeam = useMutation({
    mutationFn: async () => {
      return teamAPI.student.leaveTeam(teamId);
    },
    onSuccess: () => {
      // Clear team from cache
      queryClient.removeQueries(["team", teamId]);
      localStorage.removeItem("currentTeamId");
      toast.success("Left team successfully");

      // Notify via WebSocket
      sendMessage({
        type: "team_update",
        teamId,
        action: "leave",
        data: { userId: user._id },
      });
    },
  });

  // Change team leader
  const changeLeader = useMutation({
    mutationFn: async (newLeaderId) => {
      const response = await fetch(`/api/teams/${teamId}/leader`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId: newLeaderId }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      const updatedTeam = data.team || data.data;
      queryClient.setQueryData(["team", teamId], updatedTeam);
      toast.success("Team leader changed successfully");

      // Notify via WebSocket
      sendMessage({
        type: "team_update",
        teamId,
        action: "change_leader",
        data: {
          newLeaderId: updatedTeam.leader?._id || updatedTeam.leader,
        },
      });
    },
  });

  // Respond to team invitation
  const respondToInvite = useMutation({
    mutationFn: async ({ inviteId, accept }) => {
      return teamAPI.student.respondToInvite(
        inviteId,
        accept ? "accepted" : "declined"
      );
    },
    onSuccess: (data, variables) => {
      const team = data.team || data.data;

      if (variables.accept) {
        if (team?._id) {
          queryClient.setQueryData(["team", team._id], team);
          localStorage.setItem("currentTeamId", team._id);
        }
        toast.success("Joined team successfully");
      } else {
        toast.info("Invitation declined");
      }
    },
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
