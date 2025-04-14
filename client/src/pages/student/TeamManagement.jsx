import TeamAPI from "@/api/team";
import PageTransition from "@/components/PageTransition";
import TeamChat from "@/components/student/TeamChat";
import TeamCreation from "@/components/student/TeamCreation";
import TeamDetails from "@/components/student/TeamDetails";
import TeamInvite from "@/components/student/TeamInvite";
import TeamInviteResponse from "@/components/student/TeamInviteResponse";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Info, Loader2, MessageSquare, UserPlus, Users } from "lucide-react";
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

const TeamManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const [isLeaving, setIsLeaving] = useState(false);

  // Fetch team data using React Query
  const {
    data: teamData,
    isLoading: isTeamLoading,
    isError: isTeamError,
    refetch: refetchTeam,
  } = useQuery({
    queryKey: ["team-data"],
    queryFn: async () => {
      const response = await TeamAPI.getUserTeam();
      if (response.success) {
        // Return the team data
        return response.data || null;
      }
      return null;
    },
  });

  // Fetch pending invites
  const {
    data: invitesData,
    isLoading: isInvitesLoading,
    refetch: refetchInvites,
  } = useQuery({
    queryKey: ["team-invites"],
    queryFn: async () => {
      const response = await TeamAPI.getPendingInvitations();
      return response.success ? response.data.invitations || [] : [];
    },
    enabled: !teamData, // Only fetch invites if student isn't in a team
  });

  const handleTeamUpdate = () => {
    refetchTeam();
    refetchInvites();
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
      setIsLeaving(true);
      const response = await TeamAPI.leaveTeam();

      if (response.success) {
        toast.success(response.message || "Left team successfully");
        handleTeamUpdate();
      } else {
        toast.error(response.error || "Failed to leave team");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to leave team");
      console.error("Leave team error:", error);
    } finally {
      setIsLeaving(false);
    }
  };

  // Determine if current user is the team leader
  const isTeamLeader = teamData?.members?.some(
    (member) => member.user._id === user?._id && member.role === "leader"
  );

  // Helper function to check if team is at max capacity
  const isTeamFull = teamData?.members?.length >= 4;

  // If loading, show loading state
  if (isTeamLoading || isInvitesLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // If student has no team and no invites, show team creation
  if (!teamData && (!invitesData || invitesData.length === 0)) {
    return (
      <PageTransition>
        <Helmet>
          <title>Team Management | Student Portal</title>
        </Helmet>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Team Management</h1>
          <div className="max-w-2xl mx-auto">
            <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">
                No Team Joined
              </AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                You're not currently part of any team. Create a new team to
                become a team leader, or wait for an invitation to join an
                existing team.
              </AlertDescription>
            </Alert>
            <TeamCreation onTeamCreated={handleTeamUpdate} />
          </div>
        </div>
      </PageTransition>
    );
  }

  // If student has pending invites but no team
  if (!teamData && invitesData?.length > 0) {
    return (
      <PageTransition>
        <Helmet>
          <title>Team Invitations | Student Portal</title>
        </Helmet>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Team Invitations</h1>
          <div className="max-w-3xl mx-auto">
            <TeamInviteResponse
              invites={invitesData}
              onInviteResponded={handleTeamUpdate}
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  // If student has a team
  return (
    <PageTransition>
      <Helmet>
        <title>Team Management | Student Portal</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your team, chat with members, and coordinate your project
            </p>
          </div>

          {teamData && (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={handleLeaveTeam}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Leaving...
                </>
              ) : (
                "Leave Team"
              )}
            </Button>
          )}
        </div>

        {teamData && (
          <div className="mb-6">
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 shadow-sm">
              <CardContent className="p-4 flex items-center">
                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full mr-4">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-blue-800 dark:text-blue-300 flex items-center">
                    {teamData.name}
                    <Badge className="ml-2 bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                      {teamData.members?.length || 0}/4 Members
                    </Badge>
                    {isTeamLeader && (
                      <Badge className="ml-2 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
                        Team Leader
                      </Badge>
                    )}
                  </h2>
                  <p className="text-blue-700 dark:text-blue-400 text-sm">
                    Team ID: {teamData.teamId}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs
          defaultValue="details"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="details" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Team Chat
            </TabsTrigger>
            {isTeamLeader && !isTeamFull && (
              <TabsTrigger value="invite" className="flex items-center">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details">
            <TeamDetails team={teamData} />
          </TabsContent>

          <TabsContent value="chat">
            <TeamChat teamId={teamData?._id} />
          </TabsContent>

          {isTeamLeader && !isTeamFull && (
            <TabsContent value="invite">
              <TeamInvite
                teamId={teamData?._id}
                onInviteSent={handleTeamUpdate}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default TeamManagement;
