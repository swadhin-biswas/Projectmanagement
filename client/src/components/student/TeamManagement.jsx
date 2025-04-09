import { teamAPI } from "@/api/teams";
import {
  faCrown,
  faEnvelope,
  faUserCheck,
  faUserClock,
  faUserMinus,
  faUserPlus,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import TeamChat from "./TeamChat";

const TeamManagement = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [joinTeamModalOpen, setJoinTeamModalOpen] = useState(false);
  const [createTeamForm, setCreateTeamForm] = useState({ name: "" });
  const [inviteForm, setInviteForm] = useState({ studentId: "", message: "" });
  const [joinTeamForm, setJoinTeamForm] = useState({
    teamId: "",
    inviteCode: "",
  });
  const [activeTab, setActiveTab] = useState("team");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);

      // Use the student-specific endpoint from our consolidated API
      const teamResponse = await teamAPI.student.getCurrentTeam();
      if (teamResponse.data) {
        setTeam(teamResponse.data);
        // Store the team ID for other operations
        if (teamResponse.data._id) {
          localStorage.setItem("currentTeamId", teamResponse.data._id);
        }
      }

      // Get pending invites
      const invitesResponse = await teamAPI.student.getPendingInvites();
      if (invitesResponse.data) {
        setPendingInvites(invitesResponse.data);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error("Failed to fetch team data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await teamAPI.student.getAvailableStudents();
      if (response.data?.success) {
        setAvailableStudents(response.data.data || []);
      } else {
        toast.error("Failed to fetch available students");
      }
    } catch (error) {
      console.error("Error fetching available students:", error);
      toast.error("Error loading available students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!createTeamForm.name.trim()) {
      toast.error("Team name is required");
      return;
    }

    try {
      setCreating(true);
      const response = await teamAPI.student.createTeam(createTeamForm);

      if (response.success || response.data?.success) {
        toast.success("Team created successfully!");
        const teamData = response.data || response.team;
        setTeam(teamData);

        // Store the new team ID
        if (teamData._id) {
          localStorage.setItem("currentTeamId", teamData._id);
        }

        setIsCreateModalOpen(false);
        setCreateTeamForm({ name: "", description: "" });
      } else {
        toast.error(
          response.message || response.error || "Failed to create team"
        );
      }
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error(error.response?.data?.message || "Error creating team");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteStudent = async () => {
    if (!selectedStudentId) {
      toast.error("Please select a student to invite");
      return;
    }

    const teamId = team?._id || localStorage.getItem("currentTeamId");
    if (!teamId) {
      toast.error("No active team found");
      return;
    }

    try {
      setInviting(true);
      const response = await teamAPI.student.inviteStudent(teamId, {
        studentId: selectedStudentId,
        message: inviteForm.message,
      });

      if (response.success || response.data?.success) {
        toast.success("Invitation sent successfully!");
        setIsInviteModalOpen(false);
        setSelectedStudentId("");
        setInviteForm({ studentId: "", message: "" });
      } else {
        toast.error(
          response.message || response.error || "Failed to send invitation"
        );
      }
    } catch (error) {
      console.error("Error inviting student:", error);
      toast.error(error.response?.data?.message || "Error sending invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    try {
      if (!joinTeamForm.teamId.trim()) {
        toast.error("Team ID is required");
        return;
      }

      // This is a direct team join operation - we need to check if this endpoint exists
      // in our consolidated API, otherwise use the original implementation
      const response = await fetch("/api/student/join-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(joinTeamForm),
      });

      const data = await response.json();

      if (data.success) {
        fetchTeamData();
        setJoinTeamModalOpen(false);
        setJoinTeamForm({ teamId: "", inviteCode: "" });
        toast.success(data.message || "Successfully joined team");
      } else {
        toast.error(data.error || "Failed to join team");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to join team");
    }
  };

  const handleRespondToInvite = async (inviteId, accept) => {
    try {
      const response = await teamAPI.student.respondToInvite(
        inviteId,
        accept ? "accepted" : "declined"
      );

      if (response.success || response.data?.success) {
        if (accept) {
          toast.success(response.message || "Joined team successfully");
          fetchTeamData(); // Refresh to get the updated team data
        } else {
          toast.info(response.message || "Invitation declined");
          // Remove the declined invitation from the pending invites list
          setPendingInvites(
            pendingInvites.filter((invite) => invite._id !== inviteId)
          );
        }
      } else {
        toast.error(response.error || "Failed to respond to invitation");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to respond to invitation"
      );
    }
  };

  const handleLeaveTeam = async () => {
    if (
      !window.confirm(
        "Are you sure you want to leave this team? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLeaving(true);
      const teamId = team?._id || localStorage.getItem("currentTeamId");
      if (!teamId) {
        toast.error("No active team found");
        return;
      }

      const response = await teamAPI.student.leaveTeam(teamId);

      if (response.success || response.data?.success) {
        toast.success("You left the team");
        setTeam(null);
        localStorage.removeItem("currentTeamId");
      } else {
        toast.error(
          response.message || response.error || "Failed to leave team"
        );
      }
    } catch (error) {
      console.error("Error leaving team:", error);
      toast.error(error.response?.data?.message || "Error leaving team");
    } finally {
      setLeaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const isTeamLeader = () => {
    if (!team) return false;
    const currentMember = team.members.find(
      (member) => member.user._id === user._id
    );
    return currentMember?.role === "leader";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-blue-800 dark:text-white flex items-center">
          <FontAwesomeIcon icon={faUsers} className="mr-2" /> Team Management
        </h2>
        {!team && (
          <div className="flex gap-2">
            <Button
              onClick={() => setJoinTeamModalOpen(true)}
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              <FontAwesomeIcon icon={faUserPlus} className="mr-2" /> Join Team
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" /> Create Team
            </Button>
          </div>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <AlertTitle className="text-yellow-800 dark:text-yellow-400 flex items-center">
            <FontAwesomeIcon icon={faUserClock} className="mr-2" />
            Pending Team Invitations
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p className="text-yellow-700 dark:text-yellow-300">
              You have {pendingInvites.length} pending team invitation(s).
            </p>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <Card
                  key={invite._id}
                  className="border-yellow-200 dark:border-yellow-800"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{invite.team.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Invited by: {invite.from.fullName} • Expires:{" "}
                          {formatDate(invite.expiresAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleRespondToInvite(invite._id, false)
                          }
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <FontAwesomeIcon
                            icon={faUserMinus}
                            className="mr-1"
                          />{" "}
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleRespondToInvite(invite._id, true)
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <FontAwesomeIcon
                            icon={faUserCheck}
                            className="mr-1"
                          />{" "}
                          Accept
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {team ? (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardTitle className="flex justify-between items-center">
              <span>{team.name}</span>
              <Badge className="bg-white text-blue-800">
                {team.members.length}/4 Members
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="team">Team Members</TabsTrigger>
                <TabsTrigger value="chat">Team Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="team" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {team.members.map((member) => (
                    <Card
                      key={member.user._id}
                      className={`border ${
                        member.role === "leader"
                          ? "border-amber-200 dark:border-amber-800"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            {member.user.profilePicture ? (
                              <AvatarImage
                                src={member.user.profilePicture}
                                alt={member.user.fullName}
                              />
                            ) : (
                              <AvatarFallback
                                className={`${
                                  member.role === "leader"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                }`}
                              >
                                {getInitials(member.user.fullName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <p className="text-sm font-medium truncate dark:text-white">
                                {member.user.fullName}
                              </p>
                              {member.role === "leader" && (
                                <Badge className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                  <FontAwesomeIcon
                                    icon={faCrown}
                                    className="mr-1 text-xs"
                                  />{" "}
                                  Leader
                                </Badge>
                              )}
                              {member.user._id === user._id && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {member.user.email}
                            </p>
                            {member.user.studentId && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Student ID: {member.user.studentId}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {team.members.length < 4 && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={() => {
                        setIsInviteModalOpen(true);
                        fetchAvailableStudents();
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FontAwesomeIcon icon={faUserPlus} className="mr-2" />{" "}
                      Invite Student
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="chat">
                {team._id ? (
                  <TeamChat teamId={team._id} team={team} />
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="text-3xl mb-2"
                    />
                    <p>Team chat is not available. Please try again later.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-gray-50 dark:bg-gray-800/50 flex justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Created on {formatDate(team.createdAt)}
            </div>
            <Button
              variant="outline"
              onClick={handleLeaveTeam}
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <FontAwesomeIcon icon={faUserMinus} className="mr-2" /> Leave Team
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Team Joined</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon
                icon={faUsers}
                className="text-blue-600 dark:text-blue-400 text-3xl"
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              You're not in a team yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create a new team to become a team leader, or join an existing
              team with an invitation code.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => setJoinTeamModalOpen(true)}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                <FontAwesomeIcon icon={faUserPlus} className="mr-2" /> Join Team
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faUsers} className="mr-2" /> Create Team
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Team Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 py-4">
            <div>
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={createTeamForm.name}
                onChange={(e) =>
                  setCreateTeamForm({ ...createTeamForm, name: e.target.value })
                }
                placeholder="Enter a team name"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!createTeamForm.name.trim() || creating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {creating ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Student Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Student to Team</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInviteStudent();
            }}
            className="space-y-4 py-4"
          >
            <div>
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                placeholder="Enter student ID (e.g., STU123456)"
                required
              />
            </div>

            <div>
              <Label htmlFor="inviteMessage">Message (Optional)</Label>
              <Textarea
                id="inviteMessage"
                value={inviteForm.message}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, message: e.target.value })
                }
                placeholder="Add a personal message to your invitation..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedStudentId.trim() || inviting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {inviting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Team Modal */}
      <Dialog open={joinTeamModalOpen} onOpenChange={setJoinTeamModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Existing Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJoinTeam} className="space-y-4 py-4">
            <div>
              <Label htmlFor="teamId">Team ID</Label>
              <Input
                id="teamId"
                value={joinTeamForm.teamId}
                onChange={(e) =>
                  setJoinTeamForm({ ...joinTeamForm, teamId: e.target.value })
                }
                placeholder="Enter team ID"
                required
              />
            </div>

            <div>
              <Label htmlFor="inviteCode">Invitation Code (Optional)</Label>
              <Input
                id="inviteCode"
                value={joinTeamForm.inviteCode}
                onChange={(e) =>
                  setJoinTeamForm({
                    ...joinTeamForm,
                    inviteCode: e.target.value,
                  })
                }
                placeholder="Enter invitation code if you have one"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setJoinTeamModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!joinTeamForm.teamId.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Join Team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default TeamManagement;
