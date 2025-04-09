import { getInvitations, respondToInvitation } from "@/api/teams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const TeamInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await getInvitations();
      if (response.data.success) {
        setInvitations(response.data.data || []);
      } else {
        toast.error("Failed to fetch invitations");
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Error loading invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (invitationId, accept) => {
    try {
      setRespondingId(invitationId);
      const response = await respondToInvitation(invitationId, accept);

      if (response.data.success) {
        toast.success(accept ? "You joined the team!" : "Invitation declined");
        // Remove the invitation from the list
        setInvitations(invitations.filter((inv) => inv._id !== invitationId));
      } else {
        toast.error(response.data.message || "Failed to respond to invitation");
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast.error("Error responding to invitation");
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You have no pending team invitations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation._id} className="p-4 border rounded-lg">
              <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                <div>
                  <h4 className="font-medium">{invitation.team.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    From: {invitation.inviter.fullName}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    <Badge variant="outline">
                      {invitation.team.members.length} members
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Invited{" "}
                      {formatDistanceToNow(new Date(invitation.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 mt-2 sm:mt-0">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResponse(invitation._id, false)}
                    disabled={respondingId === invitation._id}
                  >
                    {respondingId === invitation._id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleResponse(invitation._id, true)}
                    disabled={respondingId === invitation._id}
                  >
                    {respondingId === invitation._id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Accept
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamInvitations;
