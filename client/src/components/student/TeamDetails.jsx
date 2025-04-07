import { format } from 'date-fns';
import { Users } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

const TeamDetails = ({ team, onTeamUpdate }) => {
  const { user } = useAuth();

  if (!team) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Team Found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              You are not currently a member of any team.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleLeaveTeam = async () => {
    try {
      await api.post('/api/student/leave-team');
      toast.success('Successfully left the team');
      if (onTeamUpdate) {
        onTeamUpdate();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave team');
    }
  };

  const isTeamLeader = () => {
    const currentMember = team.members.find(member => member.user._id === user._id);
    return currentMember?.role === 'leader';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {team.name}
            </CardTitle>
            <CardDescription>
              Team ID: {team.teamId} • Created {format(new Date(team.createdAt), 'PPP')}
            </CardDescription>
          </div>
          <Badge variant={team.status === 'active' ? 'success' : 'secondary'}>
            {team.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {team.members.map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          member.user.fullName
                        )}`}
                        alt={member.user.fullName}
                      />
                      <AvatarFallback>
                        {member.user.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user.fullName}
                        {member.user._id === user._id && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            You
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Joined {format(new Date(member.joinedAt), 'PP')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {!isTeamLeader() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Leave Team
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. You will need to be invited again to rejoin the team.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveTeam} className="bg-red-600 hover:bg-red-700">
                    Leave Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamDetails;