import { Check, X } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

const TeamInviteResponse = ({ invites, onInviteResponded }) => {
  const handleInviteResponse = async (inviteId, accept) => {
    try {
      const response = await api.post('/api/student/respond-to-invite', {
        inviteId,
        accept,
      });

      toast.success(accept ? 'Successfully joined team!' : 'Invitation declined');
      if (onInviteResponded) {
        onInviteResponded(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to respond to invitation');
    }
  };

  if (!invites?.length) {
    return null;
  }

  return (
    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
      <AlertTitle className="text-blue-800 dark:text-blue-200">
        Pending Team Invitations
      </AlertTitle>
      <AlertDescription>
        <div className="mt-4 space-y-4">
          {invites.map((invite) => (
            <Card key={invite._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          invite.from.fullName
                        )}`}
                        alt={invite.from.fullName}
                      />
                      <AvatarFallback>
                        {invite.from.fullName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {invite.team.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Invited by {invite.from.fullName}
                      </p>
                      {invite.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          "{invite.message}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={() => handleInviteResponse(invite._id, false)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleInviteResponse(invite._id, true)}
                    >
                      <Check className="h-4 w-4 mr-1" />
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
  );
};

export default TeamInviteResponse;