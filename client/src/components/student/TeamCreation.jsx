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
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const TeamCreation = ({ onTeamCreated }) => {
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsCreating(true);
      const response = await api.post("/api/student/teams", data);

      if (response.data.success) {
        reset();
        toast.success(
          "Team created successfully! You are now the team leader."
        );
        if (onTeamCreated) {
          onTeamCreated(response.data.data);
        }
      } else {
        toast.error(response.data.error || "Failed to create team");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create team");
      console.error("Team creation error:", error);
    } finally {
      setIsCreating(false);
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
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Create New Team</CardTitle>
                <CardDescription>
                  Create your own team and become the team leader
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  placeholder="Enter a name for your team"
                  {...register("name", {
                    required: "Team name is required",
                    minLength: {
                      value: 3,
                      message: "Team name must be at least 3 characters",
                    },
                    maxLength: {
                      value: 50,
                      message: "Team name cannot exceed 50 characters",
                    },
                  })}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name.message}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Team...
                    </>
                  ) : (
                    "Create Team"
                  )}
                </Button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  By creating a team, you'll automatically become the team
                  leader with the ability to invite other students.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default TeamCreation;
