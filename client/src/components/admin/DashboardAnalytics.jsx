import { useMutation, useQuery } from "@tanstack/react-query";
import { format, isAfter } from "date-fns";
import {
  BarChart3,
  Clock,
  Download,
  FileText,
  LayoutGrid,
  List,
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import DataTable from "../ui/data-table";
import { Progress } from "../ui/progress";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

const DashboardAnalytics = () => {
  const [viewMode, setViewMode] = useState("analytics");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Fetch all sessions
  const { data: sessions } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const response = await api.get("/api/sessions");
      return response.data.data;
    },
  });

  // Fetch current active session and set it as default selected session
  const { data: currentSession } = useQuery({
    queryKey: ["current-session"],
    queryFn: async () => {
      const response = await api.get("/api/sessions/current");
      if (response.data.success && response.data.data) {
        setSelectedSessionId(response.data.data._id);
        return response.data.data;
      }
      return null;
    },
  });

  // Fetch admin analytics for selected session
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics", selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const response = await api.get(
        `/api/admin/analytics${
          selectedSessionId ? `?sessionId=${selectedSessionId}` : ""
        }`
      );
      return response.data.data;
    },
  });

  // Get system overview data
  const { data: overviewData } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const response = await api.get("/api/analytics/overview");
      return response.data.data;
    },
  });

  // Get team statistics
  const { data: teamStats } = useQuery({
    queryKey: ["team-stats", selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      const response = await api.get(
        `/api/analytics/teams?sessionId=${selectedSessionId}`
      );
      return response.data.data;
    },
  });

  // Convert project status distribution to chart data
  const projectStatusData = analytics?.projectStats?.statusDistribution
    ? Object.entries(analytics.projectStats.statusDistribution).map(
        ([status, count]) => ({
          name: status.replace(/_/g, " ").toUpperCase(),
          value: count,
        })
      )
    : [];

  // Convert team data to chart data
  const teamAssignmentData = [
    {
      name: "With Supervisors",
      value: analytics?.teamStats?.teamsWithSupervisors || 0,
    },
    {
      name: "Without Supervisors",
      value: analytics?.teamStats?.unassignedTeams || 0,
    },
  ];

  // Create data for student and supervisor counts
  const userRolesData = [
    { name: "Students", value: analytics?.analytics?.totalStudents || 0 },
    { name: "Supervisors", value: analytics?.analytics?.totalSupervisors || 0 },
  ];

  // Create deadline timeline data
  const deadlineData =
    analytics?.currentSession?.deadlines?.map((deadline) => {
      const dueDate = new Date(deadline.date);
      const now = new Date();
      const isPast = isAfter(now, dueDate);

      return {
        name: deadline.name,
        date: format(dueDate, "MMM d"),
        type: deadline.type,
        status: isPast ? "Passed" : "Upcoming",
        daysRemaining: isPast
          ? 0
          : Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)),
      };
    }) || [];

  // Sort deadlines by date
  deadlineData.sort((a, b) => {
    if (a.status === "Passed" && b.status !== "Passed") return -1;
    if (a.status !== "Passed" && b.status === "Passed") return 1;
    return a.daysRemaining - b.daysRemaining;
  });

  // Create team size distribution data
  const teamSizeDistribution = analytics?.teamStats?.teamSizeDistribution
    ? Object.entries(analytics.teamStats.teamSizeDistribution).map(
        ([size, count]) => ({
          name: `${size} ${parseInt(size) === 1 ? "Member" : "Members"}`,
          value: count,
        })
      )
    : [];

  // Function to get deadline status badge color
  const getDeadlineStatusBadge = (status, daysRemaining) => {
    if (status === "Passed") {
      return <Badge className="bg-gray-500">Passed</Badge>;
    } else if (daysRemaining <= 3) {
      return (
        <Badge className="bg-red-500">Urgent ({daysRemaining} days)</Badge>
      );
    } else if (daysRemaining <= 7) {
      return (
        <Badge className="bg-yellow-500">Soon ({daysRemaining} days)</Badge>
      );
    } else {
      return (
        <Badge className="bg-green-500">{daysRemaining} days remaining</Badge>
      );
    }
  };

  // Function to get deadline type badge
  const getDeadlineTypeBadge = (type) => {
    switch (type) {
      case "submission":
        return <Badge className="bg-blue-500">Submission</Badge>;
      case "presentation":
        return <Badge className="bg-purple-500">Presentation</Badge>;
      case "report":
        return <Badge className="bg-green-500">Report</Badge>;
      case "meeting":
        return <Badge className="bg-yellow-500">Meeting</Badge>;
      default:
        return <Badge className="bg-gray-500">{type}</Badge>;
    }
  };

  // Calculate session progress
  const calculateSessionProgress = (session) => {
    if (!session) return 0;

    const start = new Date(session.startDate);
    const end = new Date(session.endDate);
    const now = new Date();

    if (now < start) return 0;
    if (now > end) return 100;

    const totalDuration = end - start;
    const elapsed = now - start;

    return Math.min(100, Math.round((elapsed / totalDuration) * 100));
  };

  // Export data as CSV
  const exportData = useMutation({
    mutationFn: async (type) => {
      const response = await api.get(`/api/admin/export-data?type=${type}`);
      return response.data;
    },
    onSuccess: (data) => {
      // Create downloadable CSV from the data
      const csvContent = "data:text/csv;charset=utf-8," + data.data;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${data.type}_data_${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${data.type} data exported successfully`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to export data");
    },
  });

  const handleExport = (type) => {
    exportData.mutate(type);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Tabs
          value={viewMode}
          onValueChange={setViewMode}
          className="w-[400px]"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics View</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span>List View</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TabsContent value="analytics" className="mt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Students</span>
                <Users className="h-4 w-4 text-blue-500" />
              </CardDescription>
              <CardTitle className="text-3xl">
                {analytics?.analytics?.totalStudents || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>
                  Active: {analytics?.analytics?.activeStudentsInSession || 0}
                </span>
                <span>
                  In Teams: {analytics?.analytics?.studentsInTeams || 0}
                </span>
              </div>
              <Progress
                className="h-2 mt-2"
                value={
                  (analytics?.analytics?.studentsInTeams /
                    analytics?.analytics?.totalStudents) *
                    100 || 0
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Teams</span>
                <Users className="h-4 w-4 text-emerald-500" />
              </CardDescription>
              <CardTitle className="text-3xl">
                {analytics?.teamStats?.total || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Complete: {analytics?.teamStats?.fullTeams || 0}</span>
                <span>
                  Forming: {analytics?.teamStats?.incompleteTeams || 0}
                </span>
              </div>
              <Progress
                className="h-2 mt-2"
                value={
                  (analytics?.teamStats?.fullTeams /
                    analytics?.teamStats?.total) *
                    100 || 0
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Supervisors</span>
                <UserCog className="h-4 w-4 text-purple-500" />
              </CardDescription>
              <CardTitle className="text-3xl">
                {analytics?.analytics?.totalSupervisors || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>
                  Approved:{" "}
                  {analytics?.analytics?.approvedSupervisorsInSession || 0}
                </span>
                <span>
                  Pending: {analytics?.analytics?.pendingApprovals || 0}
                </span>
              </div>
              <Progress
                className="h-2 mt-2"
                value={
                  (analytics?.analytics?.approvedSupervisorsInSession /
                    analytics?.analytics?.totalSupervisors) *
                    100 || 0
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Projects</span>
                <FileText className="h-4 w-4 text-amber-500" />
              </CardDescription>
              <CardTitle className="text-3xl">
                {analytics?.projectStats?.total || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>
                  Research: {analytics?.projectStats?.researchProjectCount || 0}
                </span>
                <span>
                  Development:{" "}
                  {analytics?.projectStats?.developmentProjectCount || 0}
                </span>
              </div>
              <Progress
                className="h-2 mt-2"
                value={
                  (analytics?.projectStats?.inProgressProjectCount /
                    analytics?.projectStats?.total) *
                    100 || 0
                }
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Session Timeline
              </CardTitle>
              <CardDescription>
                Current session progress and upcoming deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.currentSession ? (
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-1">
                      {analytics.currentSession.name}
                    </div>
                    <div className="text-sm text-gray-500 flex justify-between">
                      <span>
                        {format(
                          new Date(analytics.currentSession.startDate),
                          "PP"
                        )}
                      </span>
                      <span>
                        {format(
                          new Date(analytics.currentSession.endDate),
                          "PP"
                        )}
                      </span>
                    </div>
                    <Progress
                      className="h-2 mt-2"
                      value={calculateSessionProgress(analytics.currentSession)}
                    />
                  </div>

                  <div className="mt-4">
                    <div className="font-medium mb-2">Upcoming Deadlines</div>
                    {analytics.upcomingDeadlines?.length > 0 ? (
                      <ul className="space-y-2">
                        {analytics.upcomingDeadlines.map((deadline, index) => (
                          <li
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span>{deadline.title}</span>
                            <span className="text-gray-500">
                              {format(new Date(deadline.dueDate), "PP")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No upcoming deadlines
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No active session
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Team Distribution
              </CardTitle>
              <CardDescription>
                Team sizes and project type distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="font-medium mb-2">Team Size Distribution</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((size) => (
                      <div key={size} className="text-center">
                        <div className="text-2xl font-bold">
                          {analytics?.teamStats?.teamSizeDistribution?.[size] ||
                            0}
                        </div>
                        <div className="text-xs text-gray-500">
                          {size} {size === 1 ? "Member" : "Members"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="font-medium mb-2">Project Types</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Research</span>
                        <span>
                          {analytics?.projectStats?.researchProjectCount || 0}{" "}
                          projects
                        </span>
                      </div>
                      <Progress
                        className="h-2"
                        value={
                          (analytics?.projectStats?.researchProjectCount /
                            analytics?.projectStats?.total) *
                            100 || 0
                        }
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Development</span>
                        <span>
                          {analytics?.projectStats?.developmentProjectCount ||
                            0}{" "}
                          projects
                        </span>
                      </div>
                      <Progress
                        className="h-2"
                        value={
                          (analytics?.projectStats?.developmentProjectCount /
                            analytics?.projectStats?.total) *
                            100 || 0
                        }
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Hybrid</span>
                        <span>
                          {analytics?.projectStats?.hybridProjectCount || 0}{" "}
                          projects
                        </span>
                      </div>
                      <Progress
                        className="h-2"
                        value={
                          (analytics?.projectStats?.hybridProjectCount /
                            analytics?.projectStats?.total) *
                            100 || 0
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="list" className="mt-0">
        <Tabs defaultValue="students" className="w-full mb-6">
          <TabsList className="w-full">
            <TabsTrigger value="students" className="flex-1">
              Students
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex-1">
              Teams
            </TabsTrigger>
            <TabsTrigger value="supervisors" className="flex-1">
              Supervisors
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex-1">
              Projects
            </TabsTrigger>
          </TabsList>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => handleExport("students")}
              disabled={exportData.isPending}
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>

          <TabsContent value="students" className="mt-4">
            <DataTable
              data={analytics?.students || []}
              columns={[
                { accessorKey: "studentId", header: "ID" },
                { accessorKey: "fullName", header: "Name" },
                { accessorKey: "email", header: "Email" },
                { accessorKey: "department", header: "Department" },
                { accessorKey: "teamId", header: "Team" },
                { accessorKey: "status", header: "Status" },
              ]}
            />
          </TabsContent>

          <TabsContent value="teams" className="mt-4">
            <DataTable
              data={analytics?.teams || []}
              columns={[
                { accessorKey: "teamId", header: "ID" },
                { accessorKey: "name", header: "Team Name" },
                { accessorKey: "memberCount", header: "Members" },
                { accessorKey: "projectName", header: "Project" },
                { accessorKey: "supervisorName", header: "Supervisor" },
                { accessorKey: "status", header: "Status" },
              ]}
            />
          </TabsContent>

          <TabsContent value="supervisors" className="mt-4">
            <DataTable
              data={analytics?.supervisors || []}
              columns={[
                { accessorKey: "supervisorId", header: "ID" },
                { accessorKey: "fullName", header: "Name" },
                { accessorKey: "email", header: "Email" },
                { accessorKey: "department", header: "Department" },
                { accessorKey: "teamCount", header: "Teams" },
                { accessorKey: "status", header: "Status" },
              ]}
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <DataTable
              data={analytics?.projects || []}
              columns={[
                { accessorKey: "name", header: "Name" },
                { accessorKey: "type", header: "Type" },
                { accessorKey: "category", header: "Category" },
                { accessorKey: "teamName", header: "Team" },
                { accessorKey: "supervisorName", header: "Supervisor" },
                { accessorKey: "status", header: "Status" },
              ]}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </>
  );
};

export default DashboardAnalytics;
