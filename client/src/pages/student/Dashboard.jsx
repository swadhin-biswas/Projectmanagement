import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarIcon,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { studentAPI } from "../../api/student";
import { useAuth } from "../../contexts/AuthContext";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "MMM d, yyyy");
};

const getProgressPercent = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return 100;
    case "in_progress":
    case "in progress":
      return 60;
    case "pending":
      return 30;
    default:
      return 0;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "in_progress":
    case "in progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }
};

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return <CheckCircle className="h-4 w-4 mr-1" />;
    case "in_progress":
    case "in progress":
      return <TrendingUp className="h-4 w-4 mr-1" />;
    case "pending":
      return <Clock className="h-4 w-4 mr-1" />;
    default:
      return null;
  }
};

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data,
    isLoading,
    error,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: async () => {
      try {
        return await studentAPI.getStudentDashboard();
      } catch (error) {
        toast.error("Failed to load dashboard");
        throw error;
      }
    },
  });

  const { student, currentSession, team, pendingInvites } = data || {};

  // Find upcoming deadlines
  const upcomingDeadlines =
    currentSession?.deadlines
      ?.filter((d) => isAfter(parseISO(d.date), new Date()))
      ?.sort((a, b) => parseISO(a.date) - parseISO(b.date)) || [];

  const nextDeadline = upcomingDeadlines[0];
  const daysRemaining = nextDeadline
    ? Math.ceil(
        (parseISO(nextDeadline.date) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const fadeIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card
              key={i}
              className="border-gray-200/50 dark:border-gray-800/50"
            >
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert
          variant="destructive"
          className="border border-red-200 dark:border-red-900"
        >
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription>
            {error.message || "Please try again later"}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetchDashboard()}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200">
          Welcome, {student?.fullName?.split(" ")[0]}
        </h1>
      </motion.div>

      {/* Invitations Alert */}
      {pendingInvites?.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Bell className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-sm font-medium">
              You have {pendingInvites.length} team invitation
              {pendingInvites.length > 1 ? "s" : ""}
            </AlertTitle>
            <div className="flex justify-between items-center mt-2">
              <div className="flex -space-x-2">
                {pendingInvites.slice(0, 3).map((invite, idx) => (
                  <Avatar
                    key={idx}
                    className="h-6 w-6 border-2 border-white dark:border-gray-900"
                  >
                    <AvatarFallback className="text-xs bg-blue-500 text-white">
                      {getInitials(invite.team?.name || "Team")}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {pendingInvites.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      +{pendingInvites.length - 3}
                    </span>
                  </div>
                )}
              </div>
              <Link to="/student/team/management">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                  View <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Info Cards */}
      <motion.div
        {...fadeIn}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Session Card */}
        <Card className="border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSession ? (
              <div className="space-y-2">
                <p className="text-lg font-medium">{currentSession.name}</p>
                <div className="flex gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatDate(currentSession.startDate)}</span>
                  <span>—</span>
                  <span>{formatDate(currentSession.endDate)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No active session
              </p>
            )}
          </CardContent>
        </Card>

        {/* Project Status Card */}
        <Card className="border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <FileText className="h-4 w-4" />
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {team?.project ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium">{team.project.name}</p>
                  <Badge className={`${getStatusColor(team.project.status)}`}>
                    {getStatusIcon(team.project.status)}
                    {team.project.status?.replace("_", " ") || "N/A"}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>Progress</span>
                    <span>{getProgressPercent(team.project.status)}%</span>
                  </div>
                  <Progress
                    value={getProgressPercent(team.project.status)}
                    className="h-1.5 bg-gray-100 dark:bg-gray-700"
                  >
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${getProgressPercent(team.project.status)}%`,
                      }}
                    ></div>
                  </Progress>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No project assigned
              </p>
            )}
          </CardContent>
        </Card>

        {/* Next Deadline Card */}
        <Card
          className={`
          border-gray-200 dark:border-gray-800
          ${
            nextDeadline
              ? daysRemaining <= 3
                ? "border-red-200 dark:border-red-900/40"
                : "border-amber-200 dark:border-amber-900/40"
              : ""
          }
          hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200
        `}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              Next Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextDeadline ? (
              <div className="space-y-2">
                <p className="text-lg font-medium">{nextDeadline.name}</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <CalendarIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  <span>{formatDate(nextDeadline.date)}</span>
                </div>
                <Badge
                  className={
                    daysRemaining <= 3
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  }
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                </Badge>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No upcoming deadlines
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dashboard Tabs */}
      <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="mt-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="border-b border-gray-200 dark:border-gray-800">
            <TabsList className="bg-transparent h-10 p-0 w-auto">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent px-4 py-2 h-10 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="rounded-none border-b-2 border-transparent px-4 py-2 h-10 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
              >
                Team
              </TabsTrigger>
              <TabsTrigger
                value="project"
                className="rounded-none border-b-2 border-transparent px-4 py-2 h-10 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
              >
                Project
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 p-0 border-none">
            {/* Team Members Summary */}
            {team && (
              <Card className="border-gray-200 dark:border-gray-800 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {team.members.map((member) => (
                      <div
                        key={member.user._id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              member.user.profilePicture ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                member.user.fullName
                              )}&background=blue&color=fff`
                            }
                            alt={member.user.fullName}
                          />
                          <AvatarFallback className="bg-blue-500 text-xs">
                            {getInitials(member.user.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            {member.user.fullName}
                            {member.user._id === user?._id && (
                              <Badge
                                variant="secondary"
                                className="text-xs h-5 px-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              >
                                You
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 bg-gray-50/50 dark:bg-gray-800/50">
                  <Link
                    to="/student/team/management"
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center hover:underline"
                  >
                    View Team <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </CardFooter>
              </Card>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6 p-0 border-none">
            {team ? (
              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    {team.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Badge className={getStatusColor(team.status)}>
                      {getStatusIcon(team.status)}
                      {team.status}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      •
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Team ID: {team.teamId}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Members
                      </div>
                      <div className="text-lg font-medium">
                        {team.members.length}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Created
                      </div>
                      <div className="text-lg font-medium">
                        {formatDate(team.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                  <Link to="/student/team/management">
                    <Button size="sm" variant="outline" className="gap-1">
                      Manage Team <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ) : (
              <Card className="border-gray-200 dark:border-gray-800 text-center py-8">
                <CardContent>
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium mb-2">No Team Assigned</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm mx-auto">
                    Join or create a team to start collaborating on projects
                  </p>
                  <Link to="/student/team/management">
                    <Button size="sm" className="gap-1">
                      Get Started <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Project Tab */}
          <TabsContent value="project" className="space-y-4 p-0 border-none">
            {team?.project ? (
              <div className="space-y-4">
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-medium">
                          {team.project.name}
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap gap-2">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {team.project.type === "research"
                              ? "Research"
                              : "Project"}
                          </Badge>
                          <Badge
                            className={getStatusColor(team.project.status)}
                          >
                            {getStatusIcon(team.project.status)}
                            {team.project.status?.replace("_", " ")}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {team.project.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Description
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {team.project.description}
                        </p>
                      </div>
                    )}

                    {/* Project Progress */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Progress
                      </h3>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-500 dark:text-gray-400">
                            Overall
                          </span>
                          <span className="font-medium">
                            {getProgressPercent(team.project.status)}%
                          </span>
                        </div>
                        <Progress
                          value={getProgressPercent(team.project.status)}
                          className="h-1.5"
                        >
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${getProgressPercent(
                                team.project.status
                              )}%`,
                            }}
                          />
                        </Progress>
                      </div>
                    </div>

                    {/* Supervisor */}
                    {team.project.supervisor && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Supervisor
                        </h3>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-500 text-xs">
                              {getInitials(team.project.supervisor.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {team.project.supervisor.fullName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {team.project.supervisor.department}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Milestones */}
                    {team.project.milestones &&
                      team.project.milestones.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" /> Milestones
                          </h3>
                          <div className="space-y-2 text-sm">
                            {team.project.milestones
                              .slice(0, 3)
                              .map((milestone, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/60 rounded-md"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Badge
                                      className={
                                        milestone.completed
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                      }
                                    >
                                      {milestone.completed ? "Done" : "Pending"}
                                    </Badge>
                                    <span className="font-medium text-sm">
                                      {milestone.name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(milestone.dueDate)}
                                  </span>
                                </div>
                              ))}
                            {team.project.milestones.length > 3 && (
                              <div className="text-center text-xs text-blue-600 dark:text-blue-400 pt-1">
                                +{team.project.milestones.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>
                  <CardFooter className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <Link to={`/student/project/${team.project._id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        View Project <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            ) : (
              <Card className="border-gray-200 dark:border-gray-800 text-center py-8">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium mb-2">
                    No Project Assigned
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
                    Once your team is assigned a project, you'll be able to see
                    details here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Dashboard;
