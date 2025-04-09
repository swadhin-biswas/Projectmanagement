import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Crown,
  Info,
  Loader2,
  User,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const TeamItem = ({ team, onInviteMember, onLeaveTeam, currentUserId }) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const isTeamLeader = team.leader._id === currentUserId;

  const handleInvite = async () => {
    if (!studentId.trim()) {
      setError("Student ID is required");
      return;
    }

    setError("");
    setInviting(true);

    try {
      await onInviteMember(team._id, studentId);
      setStudentId("");
      setShowInviteDialog(false);
    } catch (error) {
      setError(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                {team.name}
                {isTeamLeader && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Crown className="h-4 w-4 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>You are the team leader</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {team.description || "No description"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {team.members.length}/{team.maxMembers || 4}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Team Members
              </h4>
              <div className="space-y-1">
                {team.members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {member.fullName || member.email}
                        {member._id === team.leader._id && (
                          <span className="ml-1 text-yellow-500 text-xs">
                            (Leader)
                          </span>
                        )}
                      </span>
                    </div>
                    {member._id === currentUserId && (
                      <span className="text-xs text-blue-500">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Dialog
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite to {team.name}</DialogTitle>
                    <DialogDescription>
                      Enter the student ID to invite them to join your team.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        placeholder="Enter student ID"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                      />
                      {error && <p className="text-red-500 text-sm">{error}</p>}
                    </div>
                    {team.members.length >= (team.maxMembers || 4) && (
                      <Alert variant="warning">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Team is full</AlertTitle>
                        <AlertDescription>
                          This team has reached the maximum number of members.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={
                        inviting ||
                        team.members.length >= (team.maxMembers || 4)
                      }
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Invitation"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => onLeaveTeam(team._id)}
              >
                <UserX className="h-4 w-4 mr-1" />
                {isTeamLeader ? "Disband Team" : "Leave Team"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const TeamsList = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const profileResponse = await api.get("/api/auth/profile");

        if (profileResponse.data.success) {
          setCurrentUserId(profileResponse.data.data._id);
        }

        const teamsResponse = await api.get("/api/teams");

        if (teamsResponse.data.success) {
          setTeams(teamsResponse.data.data);
        } else {
          setError(teamsResponse.data.error || "Failed to fetch teams");
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
        setError(
          error.response?.data?.error ||
            "An error occurred while fetching your teams"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const handleInviteMember = async (teamId, studentId) => {
    try {
      const response = await api.post(`/api/teams/${teamId}/invite`, {
        studentId,
      });

      if (response.data.success) {
        toast.success("Invitation sent successfully!");
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to send invitation"
      );
      throw error;
    }
  };

  const handleLeaveTeam = async (teamId) => {
    try {
      const team = teams.find((t) => t._id === teamId);
      const isLeader = team && team.leader._id === currentUserId;

      const confirmAction = window.confirm(
        isLeader
          ? "Are you sure you want to disband this team? This action cannot be undone."
          : "Are you sure you want to leave this team?"
      );

      if (!confirmAction) return;

      const endpoint = isLeader
        ? `/api/teams/${teamId}/disband`
        : `/api/teams/${teamId}/leave`;

      const response = await api.post(endpoint);

      if (response.data.success) {
        toast.success(
          isLeader ? "Team disbanded successfully" : "Left team successfully"
        );
        setTeams(teams.filter((t) => t._id !== teamId));
      } else {
        toast.error(response.data.error || "Failed to process your request");
      }
    } catch (error) {
      console.error("Error leaving/disbanding team:", error);
      toast.error(
        error.response?.data?.error ||
          "An error occurred while processing your request"
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <div className="space-y-1">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (teams.length === 0) {
    return (
      <Card className="bg-muted/40">
        <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center">
          <Info className="h-10 w-10 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium mb-1">No Teams Yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            You haven't joined any teams yet. Create a new team to get started.
          </p>
          <Button onClick={() => navigate("/student/teams/create")}>
            Create a Team
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <TeamItem
          key={team._id}
          team={team}
          onInviteMember={handleInviteMember}
          onLeaveTeam={handleLeaveTeam}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
};

export default TeamsList;
