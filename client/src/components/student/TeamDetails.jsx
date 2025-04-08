import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, User, Users } from "lucide-react";
import React from "react";

const TeamDetails = ({ team }) => {
  if (!team) return null;

  const getInitials = (name) => {
    if (!name) return "T";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const fade = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
  };

  return (
    <AnimatePresence>
      <motion.div
        className="space-y-6"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fade}
      >
        {/* Team Overview Card */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">{team.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Team ID:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {team.teamId}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Status:</span>
                  <Badge
                    variant="outline"
                    className={
                      team.status === "active"
                        ? "border-green-200 text-green-600 dark:border-green-800 dark:text-green-400"
                        : "border-yellow-200 text-yellow-600 dark:border-yellow-800 dark:text-yellow-400"
                    }
                  >
                    {team.status?.charAt(0)?.toUpperCase() +
                      team.status?.slice(1) || "Unknown"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Created:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatDate(team.createdAt)}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium mr-2">Session:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {team.session?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>
                Team Members ({team.members?.length || 0}/4)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {team.members?.map((member) => (
                <Card
                  key={member.user?._id}
                  className="border-gray-200 dark:border-gray-800"
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {member.user?.profilePicture ? (
                        <AvatarImage
                          src={member.user.profilePicture}
                          alt={member.user?.fullName}
                        />
                      ) : (
                        <AvatarFallback className="bg-blue-600 text-white">
                          {getInitials(member.user?.fullName)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="font-medium truncate">
                          {member.user?.fullName}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            member.role === "leader"
                              ? "ml-2 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
                              : "ml-2 border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400"
                          }
                        >
                          {member.role?.charAt(0)?.toUpperCase() +
                            member.role?.slice(1) || "Member"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {member.user?.email}
                      </p>
                      {member.user?.studentId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Student ID: {member.user.studentId}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {team.members?.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No members found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Info (if exists) */}
        {team.project && (
          <Card className="border-gray-200 dark:border-gray-800 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <ListChecks className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>
                  Project: {team.project?.name || "Unnamed Project"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Type:</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {team.project?.type?.charAt(0)?.toUpperCase() +
                          team.project?.type?.slice(1) || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Status:</span>
                      <Badge
                        variant="outline"
                        className={
                          team.project?.status === "completed"
                            ? "border-green-200 text-green-600 dark:border-green-800 dark:text-green-400"
                            : team.project?.status === "in_progress"
                            ? "border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
                            : "border-yellow-200 text-yellow-600 dark:border-yellow-800 dark:text-yellow-400"
                        }
                      >
                        {team.project?.status
                          ?.replace("_", " ")
                          ?.split(" ")
                          ?.map(
                            (word) =>
                              word.charAt(0)?.toUpperCase() + word.slice(1)
                          )
                          ?.join(" ") || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Supervisor:</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {team.supervisors?.[0]?.user?.fullName ||
                          "Not assigned"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="font-medium mr-2">Created:</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatDate(team.project?.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {team.project?.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Description:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {team.project.description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supervisor Info (if exists) */}
        {team.supervisors?.length > 0 && (
          <Card className="border-gray-200 dark:border-gray-800 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Supervisors</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {team.supervisors.map((supervisor) => (
                  <Card
                    key={supervisor.supervisor?._id}
                    className="border-gray-200 dark:border-gray-800"
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {supervisor.supervisor?.user?.profilePicture ? (
                          <AvatarImage
                            src={supervisor.supervisor.user.profilePicture}
                            alt={supervisor.supervisor?.user?.fullName}
                          />
                        ) : (
                          <AvatarFallback className="bg-purple-600 text-white">
                            {getInitials(supervisor.supervisor?.user?.fullName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="font-medium truncate">
                            {supervisor.supervisor?.user?.fullName}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              supervisor.role === "primary"
                                ? "ml-2 border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400"
                                : "ml-2 border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400"
                            }
                          >
                            {supervisor.role
                              ?.split("_")
                              ?.map(
                                (word) =>
                                  word.charAt(0)?.toUpperCase() + word.slice(1)
                              )
                              ?.join(" ") || "Supervisor"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {supervisor.supervisor?.user?.email}
                        </p>
                        {supervisor.supervisor?.department && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {supervisor.supervisor.department}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TeamDetails;
