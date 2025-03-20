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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, parseISO } from "date-fns";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarIcon,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
import { useState } from "react";
import dashboardAPI from "../../api/dashboard";
import { useAuth } from "../../contexts/AuthContext";

// Format date helper function
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(parseISO(dateString), "MMM dd, yyyy");
};

// Get status color helper function
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "text-green-500 bg-green-100 dark:bg-green-900/20 dark:text-green-300";
    case "in_progress":
    case "in progress":
      return "text-blue-500 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300";
    case "pending":
      return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300";
    case "overdue":
      return "text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-300";
    default:
      return "text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-300";
  }
};

// Get progress percent based on status
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

// Function to get initials from full name
const getInitials = (name) => {
  if (!name) return "NA";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: async () => {
      const response = await dashboardAPI.getStudentDashboard();
      return response;
    },
  });

  // Destructure response data
  const { student, currentSession, team, pendingInvites } = data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-blue-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="border-red-500">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error loading dashboard</AlertTitle>
          <AlertDescription>
            {error.message ||
              "An error occurred while fetching your dashboard data. Please try again later."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Find next upcoming deadline
  const upcomingDeadlines =
    currentSession?.deadlines
      ?.filter((d) => isAfter(parseISO(d.date), new Date()))
      ?.sort((a, b) => parseISO(a.date) - parseISO(b.date)) || [];

  const nextDeadline = upcomingDeadlines[0];

  // Calculate days remaining for next deadline if available
  const daysRemaining = nextDeadline
    ? Math.ceil(
        (parseISO(nextDeadline.date) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header with welcome and profile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Welcome, {student?.fullName.split(" ")[0]}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            <GraduationCap className="inline-block mr-2 h-4 w-4" />
            {student?.department} | Student ID: {student?.studentId}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-blue-500">
            <AvatarImage
              src={`https://ui-avatars.com/api/?name=${student?.fullName}&background=0D8ABC&color=fff`}
              alt={student?.fullName}
            />
            <AvatarFallback className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {getInitials(student?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {student?.fullName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {student?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Invites Alert - Show only if there are invites */}
      {pendingInvites && pendingInvites.length > 0 && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 mb-6">
          <Bell className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <AlertTitle className="text-blue-700 dark:text-blue-300">
            You have {pendingInvites.length} pending team{" "}
            {pendingInvites.length === 1 ? "invitation" : "invitations"}
          </AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span className="text-blue-600 dark:text-blue-400">
              From {pendingInvites[0].from.name}
              {pendingInvites.length > 1
                ? ` and ${pendingInvites.length - 1} others`
                : ""}
            </span>
            <Button
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/50"
            >
              View Invitations
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto bg-blue-100 dark:bg-gray-800">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-blue-900"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-blue-900"
          >
            Team
          </TabsTrigger>
          <TabsTrigger
            value="project"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-blue-900"
          >
            Project
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Session Card */}
            <Card className="overflow-hidden border-blue-100 dark:border-blue-900">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white pb-2">
                <CardTitle className="flex gap-2 items-center text-lg">
                  <Calendar className="h-5 w-5" />
                  Current Session
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {currentSession ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Session:
                      </span>
                      <span className="font-medium">{currentSession.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Start Date:
                      </span>
                      <span className="font-medium">
                        {formatDate(currentSession.startDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        End Date:
                      </span>
                      <span className="font-medium">
                        {formatDate(currentSession.endDate)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic text-center">
                    No active session
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Project Status Card */}
            <Card className="overflow-hidden border-blue-100 dark:border-blue-900">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white pb-2">
                <CardTitle className="flex gap-2 items-center text-lg">
                  <FileText className="h-5 w-5" />
                  Project Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {team?.project ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{team.project.name}</span>
                      <Badge className={getStatusColor(team.project.status)}>
                        {team.project.status?.replace("_", " ").toUpperCase() ||
                          "N/A"}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Progress
                        </span>
                        <span className="text-sm font-medium">
                          {getProgressPercent(team.project.status)}%
                        </span>
                      </div>
                      <Progress
                        value={getProgressPercent(team.project.status)}
                        className="h-2"
                      />
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Type:{" "}
                      </span>
                      <span className="font-medium">{team.project.type}</span>
                    </div>
                    {team.project.submittedAt && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Submitted:{" "}
                        </span>
                        <span className="font-medium">
                          {formatDate(team.project.submittedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic text-center">
                    No project assigned
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Next Deadline Card */}
            <Card
              className={`overflow-hidden ${
                nextDeadline
                  ? "border-yellow-200 dark:border-yellow-900"
                  : "border-blue-100 dark:border-blue-900"
              }`}
            >
              <CardHeader
                className={`${
                  nextDeadline
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : "bg-gradient-to-r from-blue-600 to-blue-800"
                } text-white pb-2`}
              >
                <CardTitle className="flex gap-2 items-center text-lg">
                  <Clock className="h-5 w-5" />
                  Next Deadline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {nextDeadline ? (
                  <div className="space-y-4">
                    <div className="text-lg font-semibold text-center">
                      {nextDeadline.name}
                    </div>
                    <div className="flex justify-center items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span>{formatDate(nextDeadline.date)}</span>
                    </div>
                    <div className="text-center">
                      <Badge
                        className={`px-3 py-1 text-sm ${
                          daysRemaining <= 3
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                        }`}
                      >
                        {daysRemaining} {daysRemaining === 1 ? "day" : "days"}{" "}
                        remaining
                      </Badge>
                    </div>
                    <div className="text-sm text-center">
                      <span className="text-gray-500 dark:text-gray-400">
                        Type:{" "}
                      </span>
                      <span className="font-medium">{nextDeadline.type}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic text-center">
                    No upcoming deadlines
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* All Deadlines Section */}
          {currentSession?.deadlines && currentSession.deadlines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Deadlines</CardTitle>
                <CardDescription>
                  All scheduled deadlines for the {currentSession.name} session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentSession.deadlines.map((deadline, index) => {
                    const isPast = !isAfter(
                      parseISO(deadline.date),
                      new Date()
                    );
                    return (
                      <div
                        key={index}
                        className={`flex justify-between items-center p-3 rounded-lg ${
                          isPast
                            ? "bg-gray-100 dark:bg-gray-800/50"
                            : "bg-blue-50 dark:bg-blue-900/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isPast ? (
                            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                          )}
                          <div>
                            <p className="font-medium">{deadline.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {deadline.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-sm ${
                              isPast
                                ? "text-gray-500 dark:text-gray-400"
                                : "text-blue-600 dark:text-blue-400 font-medium"
                            }`}
                          >
                            {formatDate(deadline.date)}
                          </span>
                          {!isPast && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          {team ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Team: {team.name}
                  </CardTitle>
                  <CardDescription>
                    Your current team members and details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Team Members List */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Team Members
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {team.members?.map((member, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={`https://ui-avatars.com/api/?name=${member.user.fullName}&background=0D8ABC&color=fff`}
                              alt={member.user.fullName}
                            />
                            <AvatarFallback className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {getInitials(member.user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.user.fullName}
                            </p>
                            <div className="flex items-center text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                {member.user.email}
                              </span>
                              <Badge className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {member.role}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Team Assigned</CardTitle>
                <CardDescription>
                  You are not currently assigned to a team
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-6">
                <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You haven't been assigned to a team yet or haven't created
                  one.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button>Create Team</Button>
                  <Button variant="outline">Browse Teams</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Project Tab */}
        <TabsContent value="project" className="space-y-6">
          {team?.project ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      {team.project.name}
                    </CardTitle>
                    <Badge className={getStatusColor(team.project.status)}>
                      {team.project.status?.replace("_", " ").toUpperCase() ||
                        "N/A"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Project type: {team.project.type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Project Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Project Progress
                      </h3>
                      <span className="text-sm font-medium">
                        {getProgressPercent(team.project.status)}%
                      </span>
                    </div>
                    <Progress
                      value={getProgressPercent(team.project.status)}
                      className="h-2"
                    />
                  </div>

                  {/* Submission Status */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Submission Status
                    </h3>
                    {team.project.submittedAt ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            Submitted on {formatDate(team.project.submittedAt)}
                          </span>
                        </div>
                        {team.project.submissionLink && (
                          <div className="flex justify-between items-center mt-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <span className="text-sm truncate max-w-[300px]">
                              {team.project.submissionLink}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:dark:text-blue-300"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Not submitted yet</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    View Details
                  </Button>
                  {!team.project.submittedAt && <Button>Submit Project</Button>}
                </CardFooter>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Project Assigned</CardTitle>
                <CardDescription>
                  Your team doesn't have a project assigned yet
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-6">
                <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your team needs to select or be assigned a project to start
                  working.
                </p>
                <Button>Browse Available Projects</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;