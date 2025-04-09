import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Mail, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const InvitationItem = ({ invitation, onAccept, onReject, isProcessing }) => {
  const { team, sender, createdAt } = invitation;
  const date = new Date(createdAt).toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      layout
      className="border rounded-lg p-4 mb-3 bg-white dark:bg-gray-800 shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {team.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Invitation from {sender.fullName} on {date}
          </p>
          {team.description && (
            <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
              {team.description}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
            onClick={onReject}
            disabled={isProcessing}
          >
            {isProcessing === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onAccept}
            disabled={isProcessing}
          >
            {isProcessing === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const TeamInvitationsList = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/teams/invitations");
      if (response.data.success) {
        setInvitations(response.data.data);
      } else {
        setError(response.data.error || "Failed to fetch invitations");
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      setError(
        error.response?.data?.error || "Failed to load team invitations"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      setProcessingAction("accept");
      const response = await api.post(
        `/api/teams/invitations/${invitationId}/accept`
      );
      if (response.data.success) {
        toast.success("You have joined the team!");
        setInvitations(invitations.filter((inv) => inv._id !== invitationId));
      } else {
        toast.error(response.data.error || "Failed to accept invitation");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error(
        error.response?.data?.error || "Failed to accept the invitation"
      );
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      setProcessingAction("reject");
      const response = await api.post(
        `/api/teams/invitations/${invitationId}/reject`
      );
      if (response.data.success) {
        toast.success("Invitation rejected");
        setInvitations(invitations.filter((inv) => inv._id !== invitationId));
      } else {
        toast.error(response.data.error || "Failed to reject invitation");
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      toast.error(
        error.response?.data?.error || "Failed to reject the invitation"
      );
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeIn}
    >
      <Card className="border-gray-200 dark:border-gray-800 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Team Invitations</CardTitle>
              <CardDescription>
                Respond to team invitations you've received
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              You don't have any pending team invitations
            </div>
          ) : (
            <AnimatePresence>
              {invitations.map((invitation) => (
                <InvitationItem
                  key={invitation._id}
                  invitation={invitation}
                  onAccept={() => handleAccept(invitation._id)}
                  onReject={() => handleReject(invitation._id)}
                  isProcessing={
                    processingId === invitation._id ? processingAction : null
                  }
                />
              ))}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeamInvitationsList;
