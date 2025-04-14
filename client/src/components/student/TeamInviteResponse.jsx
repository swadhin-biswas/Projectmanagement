import TeamAPI from "@/api/team";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Users, X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

const TeamInviteResponse = ({ invites = [], onInviteResponded }) => {
  const [respondingIds, setRespondingIds] = useState({});

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      setRespondingIds((prev) => ({ ...prev, [inviteId]: true }));

      const response = await TeamAPI.respondToInvitation({
        invitationId: inviteId,
        accept,
      });

      if (response.success) {
        toast.success(
          accept ? "Successfully joined team!" : "Invitation declined"
        );
        if (onInviteResponded) {
          onInviteResponded(response);
        }
      } else {
        toast.error(response.error || "Failed to respond to invitation");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to respond to invitation"
      );
      console.error("Invitation response error:", error);
    } finally {
      setRespondingIds((prev) => ({ ...prev, [inviteId]: false }));
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
    if (!name) return "T";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
  };

  if (!invites?.length) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="space-y-4"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeIn}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold">Pending Team Invitations</h2>
        </div>

        {invites.map((invite) => (
          <Card
            key={invite.teamId}
            className="border-yellow-200 dark:border-yellow-800 shadow-md overflow-hidden"
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full hidden sm:flex">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">{invite.teamName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">Team Size:</span>{" "}
                      {invite.members?.length || 0} / 4 members
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Session:</span>{" "}
                      {invite.sessionName || "Current Session"}
                    </p>
                    {invite.expiresAt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Expires:</span>{" "}
                        {formatDate(invite.expiresAt)}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-sm font-medium">Invited by:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {invite.invitedBy?.profilePicture ? (
                            <AvatarImage
                              src={invite.invitedBy.profilePicture}
                              alt={invite.invitedBy.name}
                            />
                          ) : (
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              {getInitials(invite.invitedBy?.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-sm">
                          {invite.invitedBy?.name || "Team Leader"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 md:self-center">
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => handleInviteResponse(invite.teamId, false)}
                    disabled={respondingIds[invite.teamId]}
                  >
                    {respondingIds[invite.teamId] ? (
                      <span className="flex items-center">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-e-transparent mr-2"></span>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </>
                    )}
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleInviteResponse(invite.teamId, true)}
                    disabled={respondingIds[invite.teamId]}
                  >
                    {respondingIds[invite.teamId] ? (
                      <span className="flex items-center">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-e-transparent mr-2"></span>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Accept
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default TeamInviteResponse;
