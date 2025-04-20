import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BarChartIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  LineChartIcon,
  PieChartIcon,
  RefreshCwIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { sessionAPI } from "../../api/sessions";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Progress } from "../../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { api } from "../../lib/api";

const COLORS = [
  "#4C6FFF", // Primary blue
  "#02BC77", // Success green
  "#FFB100", // Warning amber
  "#FF5630", // Danger red
  "#8E4BF8", // Purple
  "#00B8D9", // Cyan
  "#36B37E", // Green
  "#FF7452", // Orange
  "#6554C0", // Indigo
  "#00C7E6", // Light blue
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSession, setSelectedSession] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [teams, setTeams] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    const fetchTeamsAndSupervisors = async () => {
      try {
        const [teamsResponse, supervisorsResponse] = await Promise.all([
          api.get("/api/teams"),
          api.get("/api/supervisors"),
        ]);
        setTeams(teamsResponse.data.teams);
        setSupervisors(supervisorsResponse.data.supervisors);
      } catch (error) {
        console.error("Failed to fetch teams or supervisors:", error);
        toast.error("Could not load teams or supervisors");
      }
    };

    fetchTeamsAndSupervisors();
  }, []);

  // Get analytics data
  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["admin-analytics", selectedSession],
    queryFn: async () => {
      if (!selectedSession) {
        const response = await api.get("/api/dashboard/admin");
        return response.data;
      } else {
        const response = await sessionAPI.getSessionDetailedAnalytics(
          selectedSession,
          {
            timeRange: "all",
            groupBy: "day",
          }
        );
        return response;
      }
    },
  });

  // Get sessions for dropdown
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const response = await sessionAPI.getAllSessions();
      return response.data.sessions;
    },
  });

  // Get pending supervisors
  const { data: pendingSupervisors, isLoading: loadingSupervisors } = useQuery({
    queryKey: ["pending-supervisors"],
    queryFn: async () => {
      const response = await api.get("/api/admin/pending-supervisors");
      return response.data;
    },
  });

  const data = analyticsData?.data;

  const handleApproveSupervisor = async (id) => {
    try {
      await api.put(`/api/admin/approve-supervisor/${id}`);
      toast.success("Supervisor approved successfully");
      // Refresh the data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to approve supervisor");
      console.error(error);
    }
  };

  const handleSessionChange = (sessionId) => {
    setSelectedSession(sessionId);
  };

  const handleAssignSupervisor = async () => {
    if (!selectedTeam || !selectedSupervisor) {
      toast.error("Please select both a team and a supervisor");
      return;
    }

    try {
      await api.post(`/api/teams/${selectedTeam}/assign-supervisor`, {
        supervisorId: selectedSupervisor,
      });
      toast.success("Supervisor assigned successfully");
      setIsAssignModalOpen(false);
    } catch (error) {
      console.error("Failed to assign supervisor:", error);
      toast.error("Failed to assign supervisor. Please try again.");
    }
  };

  // Enhanced loading display
  if (loadingAnalytics || loadingSupervisors) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Loading dashboard data...
        </h3>
      </div>
    );
  }

  // Prepare data for charts
  const projectTypeData = data?.projectStats?.byType
    ? Object.entries(data.projectStats.byType).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const projectStatusData = data?.projectStats?.byStatus
    ? Object.entries(data.projectStats.byStatus).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const teamSizeData = data?.teamStats?.sizeDistribution
    ? Object.entries(data.teamStats.sizeDistribution).map(([size, count]) => ({
        name: `${size} Member${size > 1 ? "s" : ""}`,
        value: count,
      }))
    : [];

  const submissionTrendData = data?.projectStats?.submissionTrend
    ? Object.entries(data.projectStats.submissionTrend).map(
        ([week, count]) => ({ week, count })
      )
    : [];

  const departmentData =
    data?.analytics?.departmentDistribution?.map((dept) => ({
      name: dept._id || "Unknown",
      count: dept.count,
    })) || [];

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Comprehensive overview of your project management system
            </p>
          </div>

          {data?.sessions && (
            <div className="mt-4 md:mt-0 flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <CalendarIcon
                size={18}
                className="text-gray-500 dark:text-gray-400"
              />
              <select
                className="bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-300 pr-8 py-1"
                value={selectedSession || data.currentSession?._id || ""}
                onChange={(e) => handleSessionChange(e.target.value)}
              >
                {data.sessions.map((session) => (
                  <option key={session._id} value={session._id}>
                    {session.name} {session.status === "active" && "(Active)"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Session Overview - Enhanced */}
        {data?.currentSession && (
          <Card className="mb-8 bg-white dark:bg-gray-800 border-none shadow-md overflow-hidden">
            <div className="border-l-4 border-blue-500 pl-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <CalendarIcon size={20} className="text-blue-500" />
                  Current Session: {data.currentSession.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <ClockIcon size={14} />
                    {new Date(
                      data.currentSession.startDate
                    ).toLocaleDateString()}{" "}
                    -{" "}
                    {new Date(data.currentSession.endDate).toLocaleDateString()}
                  </span>

                  {/* Add session status badge */}
                  <Badge
                    className={
                      data.currentSession.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    }
                  >
                    {data.currentSession.status === "active"
                      ? "Active"
                      : "Upcoming"}
                  </Badge>
                </CardDescription>
              </CardHeader>
            </div>

            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <LineChartIcon size={14} className="text-blue-500" />
                    Session Progress
                  </p>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={data.currentSession.progress}
                      className="h-2.5 flex-1"
                      // Add color gradient based on progress
                      indicatorClassName={
                        data.currentSession.progress > 75
                          ? "bg-green-500"
                          : data.currentSession.progress > 50
                          ? "bg-blue-500"
                          : data.currentSession.progress > 25
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[45px] text-right">
                      {data.currentSession.progress}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-5 justify-end">
                  <div className="text-center px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.analytics.totalTeams}
                    </p>
                    <p className="text-xs uppercase font-medium text-blue-600/70 dark:text-blue-400/70 tracking-wider">
                      Teams
                    </p>
                  </div>

                  <div className="text-center px-4 py-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {data.analytics.totalStudents}
                    </p>
                    <p className="text-xs uppercase font-medium text-green-600/70 dark:text-green-400/70 tracking-wider">
                      Students
                    </p>
                  </div>

                  <div className="text-center px-4 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {data.analytics.totalSupervisors}
                    </p>
                    <p className="text-xs uppercase font-medium text-purple-600/70 dark:text-purple-400/70 tracking-wider">
                      Supervisors
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs
          defaultValue={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="w-full p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-x-auto flex flex-nowrap">
            <TabsTrigger
              value="overview"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <BarChartIcon size={16} />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <UsersIcon size={16} />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <FileTextIcon size={16} />
              <span>Students</span>
            </TabsTrigger>
            <TabsTrigger
              value="supervisors"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <Settings2Icon size={16} />
              <span>Supervisors</span>
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <Settings2Icon size={16} />
              <span>Admins</span>
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <LayersIcon size={16} />
              <span>Projects</span>
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <UsersIcon size={16} />
              <span>Teams</span>
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <PieChartIcon size={16} />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="py-2 px-4 flex items-center gap-2 transition-all"
            >
              <CalendarIcon size={16} />
              <span>Timeline</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Enhanced with visual upgrades */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <UsersIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Students
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {data?.analytics?.totalStudents || 0}
                        </p>

                        {/* Optional: add trend indicator */}
                        {data?.analytics?.studentTrend > 0 ? (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                            <ArrowUpIcon size={14} />
                            {data?.analytics?.studentTrend}%
                          </span>
                        ) : data?.analytics?.studentTrend < 0 ? (
                          <span className="text-xs text-red-600 dark:text-red-400 flex items-center">
                            <ArrowDownIcon size={14} />
                            {Math.abs(data?.analytics?.studentTrend)}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                      <LayersIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Projects
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data?.projectStats?.total || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      <UsersIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Teams
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data?.teamStats?.total || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <AlertTriangleIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Pending Approvals
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data?.analytics?.pendingApprovals || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Types Chart - Enhanced */}
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <PieChartIcon size={18} className="text-blue-500" />
                    Project Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {projectTypeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="transparent"
                            className="drop-shadow-sm"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          border: "none",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        }}
                        itemStyle={{ color: "#333" }}
                      />
                      <Legend
                        iconType="circle"
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ paddingLeft: "10px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Project Status Chart - Enhanced */}
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <BarChartIcon size={18} className="text-blue-500" />
                    Project Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectStatusData} barCategoryGap={12}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#eee"
                      />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          border: "none",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        }}
                        cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                      />
                      <Legend iconType="circle" />
                      <Bar
                        dataKey="value"
                        name="Projects"
                        radius={[4, 4, 0, 0]}
                      >
                        {projectStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Size Distribution - Enhanced */}
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <UsersIcon size={18} className="text-blue-500" />
                    Team Size Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teamSizeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {teamSizeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          border: "none",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        }}
                        itemStyle={{ color: "#333" }}
                      />
                      <Legend
                        iconType="circle"
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ paddingLeft: "10px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Department Distribution - Enhanced */}
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <BarChartIcon size={18} className="text-blue-500" />
                    Department Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={departmentData}
                      layout="vertical"
                      barCategoryGap={12}
                      margin={{ left: 10, right: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                        stroke="#eee"
                      />
                      <XAxis type="number" axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          border: "none",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        }}
                        cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                      />
                      <Bar
                        dataKey="count"
                        name="Participants"
                        fill="#4C6FFF"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities - Enhanced */}
            <Card className="border-none shadow-md">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <ClockIcon size={18} className="text-blue-500" />
                    Recent Activities
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <RefreshCwIcon size={14} />
                    <span>Refresh</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data?.recentActivities?.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                      <TableRow>
                        <TableHead>Activity</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.recentActivities?.map((activity, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-default transition-colors"
                        >
                          <TableCell className="font-medium">
                            {activity.message}
                          </TableCell>
                          <TableCell>
                            {activity.user?.name || "System"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-4">
                      <ClockIcon size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      No recent activities
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
                      There are no recent activities to display at this time.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs remain similar but would be enhanced with the same styling patterns... */}
          {/* ... existing tabs content ... */}
        </Tabs>
      </div>

      {/* Enhanced dialog for supervisor assignment */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-800 p-0 overflow-hidden rounded-lg shadow-lg border-none">
          <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UsersIcon size={20} className="text-blue-500" />
              Assign Supervisor to Team
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="team"
                  className="text-gray-700 dark:text-gray-300 font-medium"
                >
                  Select Team
                </Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger
                    id="team"
                    className="w-full mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm"
                  >
                    <SelectValue placeholder="Choose a team" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                    {teams.map((team) => (
                      <SelectItem
                        key={team._id}
                        value={team._id}
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="supervisor"
                  className="text-gray-700 dark:text-gray-300 font-medium"
                >
                  Select Supervisor
                </Label>
                <Select
                  value={selectedSupervisor}
                  onValueChange={setSelectedSupervisor}
                >
                  <SelectTrigger
                    id="supervisor"
                    className="w-full mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm"
                  >
                    <SelectValue placeholder="Choose a supervisor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                    {supervisors.map((supervisor) => (
                      <SelectItem
                        key={supervisor._id}
                        value={supervisor._id}
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {supervisor.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSupervisor}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircleIcon size={16} />
              <span>Assign</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
