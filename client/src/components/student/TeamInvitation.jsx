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
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { Loader2, UserPlus } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const TeamInvitation = ({ teamId, teamName, onInviteSent }) => {
  const [isInviting, setIsInviting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      studentId: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsInviting(true);
      const response = await api.post(`/api/teams/${teamId}/invite`, {
        studentId: data.studentId,
      });

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
      console.error("Invitation error:", error);
      toast.error(
        error.response?.data?.error || "Failed to send the invitation"
      );
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
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeIn}
    >
      <Card className="border-gray-200 dark:border-gray-800 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle>Invite to Team</CardTitle>
              <CardDescription>
                Invite a student to join {teamName || "your team"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">
                Student ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="studentId"
                {...register("studentId", {
                  required: "Student ID is required",
                  pattern: {
                    value: /^[a-zA-Z0-9]+$/,
                    message: "Please enter a valid Student ID",
                  },
                })}
                placeholder="Enter student ID"
                className={errors.studentId ? "border-red-500" : ""}
              />
              {errors.studentId && (
                <p className="text-sm text-red-500">
                  {errors.studentId.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Your team can have a maximum of 4 members.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeamInvitation;
