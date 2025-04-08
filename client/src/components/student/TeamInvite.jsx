import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, UserPlus } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const TeamInvite = ({ teamId, onInviteSent }) => {
  const [isInviting, setIsInviting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      studentId: "",
      message: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsInviting(true);
      const response = await api.post(
        `/api/student/teams/${teamId}/invite`,
        data
      );

      if (response.data.success) {
        reset();
        toast.success("Invitation sent successfully!");
        if (onInviteSent) {
          onInviteSent(response.data.data);
        }
      } else {
        toast.error(response.data.error || "Failed to send invitation");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to send invitation";
      toast.error(errorMessage);

      // Show specific error messages based on error type
      if (errorMessage.includes("already in a team")) {
        toast.error("This student is already in another team");
      } else if (errorMessage.includes("already invited")) {
        toast.error("This student has already been invited");
      } else if (errorMessage.includes("team is full")) {
        toast.error("Your team is already at maximum capacity");
      }
    } finally {
      setIsInviting(false);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
  };

  return (
    <AnimatePresence>
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
                <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Invite Team Member</CardTitle>
                <CardDescription>
                  Invite other students to join your team (max 4 members)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  placeholder="Enter student ID (e.g., S12345)"
                  {...register("studentId", {
                    required: "Student ID is required",
                    pattern: {
                      value: /^[A-Za-z0-9-]+$/,
                      message: "Please enter a valid student ID",
                    },
                  })}
                />
                {errors.studentId && (
                  <p className="text-red-500 text-sm">
                    {errors.studentId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a message to your invitation"
                  className="h-24"
                  {...register("message", {
                    maxLength: {
                      value: 200,
                      message: "Message cannot exceed 200 characters",
                    },
                  })}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isInviting}
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default TeamInvite;
