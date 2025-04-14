import TeamAPI from "@/api/team";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Loader2, User, UserPlus, UserX } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import CreateTeamForm from "./CreateTeamForm";

const ManageTeam = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteStudent, setInviteStudent] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await TeamAPI.getUserTeam();
      if (response.success) {
        setTeam(response.data);
      } else {
        // User doesn't have a team yet
        setTeam(null);
      }
    } catch (error) {
      console.error("Error fetching team:", error);
      // If 404, user doesn't have a team
      if (error.response?.status !== 404) {
        toast.error("Failed to load team information");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTeamCreated = (newTeam) => {
    setTeam(newTeam);
    setShowCreateForm(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteStudent.trim()) {
      toast.error("Please enter a student ID");
      return;
    }

    try {
      setIsInviting(true);
      const response = await TeamAPI.inviteStudent({
        studentId: inviteStudent.trim(),
      });

      if (response.success) {
        toast.success("Invitation sent successfully!");
        setInviteStudent("");
      } else {
        toast.error(response.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error inviting student:", error);
      toast.error(error.response?.data?.error || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (
      !confirm("Are you sure you want to remove this member from the team?")
    ) {
      return;
    }

    try {
      setIsRemovingMember(true);
      const response = await TeamAPI.removeMember({ memberId });

      if (response.success) {
        toast.success("Team member removed successfully");
        fetchTeam(); // Refresh team data
      } else {
        toast.error(response.error || "Failed to remove team member");
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error(
        error.response?.data?.error || "Failed to remove team member"
      );
    } finally {
      setIsRemovingMember(false);
    }
  };

  const leaveTeam = async () => {
    if (!confirm("Are you sure you want to leave this team?")) {
      return;
    }

    try {
      const response = await TeamAPI.leaveTeam();
      if (response.success) {
        toast.success("You have left the team");
        setTeam(null);
      } else {
        toast.error(response.error || "Failed to leave team");
      }
    } catch (error) {
      console.error("Error leaving team:", error);
      toast.error(
        error.response?.data?.error ||
          "An error occurred while leaving the team"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-4">
        {showCreateForm ? (
          <CreateTeamForm onTeamCreated={handleTeamCreated} />
        ) : (
          <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle>You're Not In a Team</CardTitle>
              <CardDescription>
                Create a team or wait for an invitation to join one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowCreateForm(true)}>
                Create a New Team
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const isTeamLeader = team.leader === user?._id;

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle>{team.name}</CardTitle>
          <CardDescription>
            {team.description || "No team description provided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Team Members:</h3>
            <div className="space-y-2">
              {team.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    {member._id === team.leader ? (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <User className="h-5 w-5 text-gray-500" />
                    )}
                    <span>
                      {member.fullName} ({member.studentId})
                      {member._id === team.leader && " - Team Leader"}
                      {member._id === user?._id && " - You"}
                    </span>
                  </div>
                  {isTeamLeader && member._id !== user?._id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={isRemovingMember}
                    >
                      {isRemovingMember ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserX className="h-4 w-4" />
                      )}
                      <span className="ml-1">Remove</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {team.members.length < 4 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Invite Students:</h3>
              <form onSubmit={handleInvite} className="flex gap-2">
                <Input
                  placeholder="Enter student ID"
                  value={inviteStudent}
                  onChange={(e) => setInviteStudent(e.target.value)}
                />
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Invite
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {!isTeamLeader && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>
                  Leaving the team may affect your project submission.
                </span>
                <Button variant="destructive" size="sm" onClick={leaveTeam}>
                  Leave Team
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageTeam;
