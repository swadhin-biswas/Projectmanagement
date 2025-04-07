import { useQuery } from '@tanstack/react-query';
import React from 'react';
import TeamChat from '../../components/student/TeamChat';
import TeamCreation from '../../components/student/TeamCreation';
import TeamDetails from '../../components/student/TeamDetails';
import TeamInvite from '../../components/student/TeamInvite';
import TeamInviteResponse from '../../components/student/TeamInviteResponse';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useTeam } from '../../hooks/useTeam';
import { api } from '../../lib/api';

const TeamManagement = () => {
  const {
    team,
    isLoading,
    error,
    refetchTeam
  } = useTeam();

  const {
    data: invitesData,
    refetch: refetchInvites
  } = useQuery({
    queryKey: ['team-invites'],
    queryFn: async () => {
      const response = await api.get('/api/student/pending-invites');
      return response.data;
    }
  });

  const handleTeamUpdate = () => {
    refetchTeam();
    refetchInvites();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600">Failed to load team data. Please try again later.</p>
              <Button onClick={refetchTeam} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If student has no team and no invites, show team creation
  if (!team && (!invitesData?.invites || invitesData.invites.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Team Management</h1>
        <TeamCreation onTeamCreated={handleTeamUpdate} />
      </div>
    );
  }

  // If student has pending invites but no team
  if (!team && invitesData?.invites?.length > 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Team Management</h1>
        <TeamInviteResponse
          invites={invitesData.invites}
          onInviteResponded={handleTeamUpdate}
        />
      </div>
    );
  }

  // If student has a team
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Team Management</h1>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Team Details</TabsTrigger>
            <TabsTrigger value="chat">Team Chat</TabsTrigger>
            {team.isLeader && (
              <TabsTrigger value="invite">Invite Members</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details">
            <TeamDetails team={team} onTeamUpdate={handleTeamUpdate} />
          </TabsContent>

          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Team Chat</CardTitle>
                <CardDescription>
                  Chat with your team members in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeamChat teamId={team._id} />
              </CardContent>
            </Card>
          </TabsContent>

          {team.isLeader && (
            <TabsContent value="invite">
              <TeamInvite
                teamId={team._id}
                onInviteSent={handleTeamUpdate}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TeamManagement;