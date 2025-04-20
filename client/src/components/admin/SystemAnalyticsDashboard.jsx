import {
  Activity,
  BarChart2,
  BarChart as BarChartIcon,
  Briefcase,
  Calendar,
  ChevronRight,
  Clipboard,
  Clock,
  Compass,
  Download,
  FileCheck,
  Layers,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { SkeletonCard } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

// Enhanced color palette for better data visualization
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

const SystemAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState("month");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalStudents: 0,
      totalSupervisors: 0,
      totalTeams: 0,
      totalProjects: 0,
      activeStudents: 0,
      completedProjects: 0,
    },
    projectStats: {
      byStatus: [],
      byType: [],
      submissionTrend: [],
    },
    teamFormation: {
      trend: [],
      byDepartment: [],
    },
    supervisorStats: {
      workloadDistribution: [],
      performanceMetrics: [],
    },
    sessionProgress: {
      current: 0,
      deadlinesCompleted: 0,
      totalDeadlines: 0,
      upcomingDeadlines: [],
    },
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchAnalyticsData();
    }
  }, [selectedSession, timeRange]);

  const fetchSessions = async () => {
    try {
      const response = await api.get("/api/sessions");
      const sessionsData = response.data.data || [];
      setSessions(sessionsData);

      // Select active session by default
      const activeSession = sessionsData.find(
        (session) => session.status === "active"
      );
      if (activeSession) {
        setSelectedSession(activeSession._id);
      } else if (sessionsData.length > 0) {
        setSelectedSession(sessionsData[0]._id);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load sessions");
    }
  };

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/analytics/system`, {
        params: {
          sessionId: selectedSession,
          timeRange: timeRange,
        },
      });

      setAnalyticsData(response.data.data || {});
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  // Skeleton loader for loading state
  if (isLoading && !analyticsData.overview.totalStudents) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-60 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard className="h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    );
  }

  const OverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="flex items-start">
            <div className="p-6 flex-1">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  Total Students
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.overview.totalStudents.toLocaleString()}
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 mb-0.5"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {analyticsData.overview.activeStudents} active
                  </Badge>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex justify-between mb-1">
                  <span>Active vs. Total</span>
                  <span>
                    {Math.round(
                      (analyticsData.overview.activeStudents /
                        analyticsData.overview.totalStudents) *
                        100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (analyticsData.overview.activeStudents /
                      analyticsData.overview.totalStudents) *
                    100
                  }
                  className="h-1.5 bg-gray-100 dark:bg-gray-700"
                  indicatorClassName="bg-blue-500"
                />
              </div>
            </div>
            <div className="w-1 self-stretch bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/10"></div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="flex items-start">
            <div className="p-6 flex-1">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-green-500" />
                  Projects Completed
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.overview.completedProjects.toLocaleString()}
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 mb-0.5"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {(
                      (analyticsData.overview.completedProjects /
                        analyticsData.overview.totalProjects) *
                      100
                    ).toFixed(1)}
                    %
                  </Badge>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex justify-between mb-1">
                  <span>Completion Rate</span>
                  <span>
                    {analyticsData.overview.completedProjects}/
                    {analyticsData.overview.totalProjects}
                  </span>
                </div>
                <Progress
                  value={
                    (analyticsData.overview.completedProjects /
                      analyticsData.overview.totalProjects) *
                    100
                  }
                  className="h-1.5 bg-gray-100 dark:bg-gray-700"
                  indicatorClassName="bg-green-500"
                />
              </div>
            </div>
            <div className="w-1 self-stretch bg-gradient-to-b from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/10"></div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="flex items-start">
            <div className="p-6 flex-1">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                  Teams
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analyticsData.overview.totalTeams.toLocaleString()}
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 mb-0.5"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {(
                      analyticsData.overview.totalStudents /
                        analyticsData.overview.totalTeams || 0
                    ).toFixed(1)}{" "}
                    avg size
                  </Badge>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex justify-between mb-1">
                  <span>With supervisors</span>
                  <span>
                    {Math.round(
                      ((analyticsData.supervisorStats?.teamsWithSupervisor ||
                        0) /
                        analyticsData.overview.totalTeams) *
                        100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    ((analyticsData.supervisorStats?.teamsWithSupervisor || 0) /
                      analyticsData.overview.totalTeams) *
                    100
                  }
                  className="h-1.5 bg-gray-100 dark:bg-gray-700"
                  indicatorClassName="bg-purple-500"
                />
              </div>
            </div>
            <div className="w-1 self-stretch bg-gradient-to-b from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/10"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SessionProgressOverview = () => (
    <Card className="col-span-1 md:col-span-2 border-none shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Session Progress
            </CardTitle>
            <CardDescription>
              Current session progress and upcoming deadlines
            </CardDescription>
          </div>
          <Badge
            variant={
              analyticsData.sessionProgress.current > 75 ? "success" : "default"
            }
          >
            {analyticsData.sessionProgress.current}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-500" />
                Overall Progress
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {analyticsData.sessionProgress.current}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${
                  analyticsData.sessionProgress.current > 75
                    ? "bg-green-500"
                    : analyticsData.sessionProgress.current > 50
                    ? "bg-blue-500"
                    : analyticsData.sessionProgress.current > 25
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${analyticsData.sessionProgress.current}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Clipboard className="h-4 w-4 text-green-500" />
                Deadlines Completed
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {analyticsData.sessionProgress.deadlinesCompleted} /{" "}
                {analyticsData.sessionProgress.totalDeadlines}
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full dark:bg-gray-700 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-green-500"
                style={{
                  width: `${
                    (analyticsData.sessionProgress.deadlinesCompleted /
                      analyticsData.sessionProgress.totalDeadlines) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-500" />
              Upcoming Deadlines
            </h4>
            <div className="space-y-2">
              {analyticsData.sessionProgress.upcomingDeadlines
                .slice(0, 3)
                .map((deadline, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-md ${
                          deadline.daysRemaining <= 3
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : deadline.daysRemaining <= 7
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {deadline.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(deadline.dueDate).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        deadline.daysRemaining <= 3
                          ? "destructive"
                          : deadline.daysRemaining <= 7
                          ? "warning"
                          : "outline"
                      }
                    >
                      {deadline.daysRemaining} days
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProjectAnalytics = () => (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-500" />
              Project Distribution
            </CardTitle>
            <CardDescription>Projects by status and type</CardDescription>
          </div>
          <Select
            defaultValue="status"
            onValueChange={(value) => console.log(value)}
          >
            <SelectTrigger className="h-8 w-[150px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="View by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="type">By Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 py-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analyticsData.projectStats.byStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                paddingAngle={2}
              >
                {analyticsData.projectStats.byStatus.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="transparent"
                    className="drop-shadow-sm"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} projects`, "Count"]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "none",
                }}
                itemStyle={{ color: "#333" }}
              />
              <Legend
                iconType="circle"
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{
                  paddingLeft: "20px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const TeamFormationChart = () => (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-blue-500" />
              Team Formation Trend
            </CardTitle>
            <CardDescription>Team registrations over time</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 py-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analyticsData.teamFormation.trend}
              margin={{
                top: 5,
                right: 30,
                left: 5,
                bottom: 15,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,0,0,0.1)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "none",
                }}
                itemStyle={{ color: "#333" }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Teams Formed"
                stroke="#4C6FFF"
                strokeWidth={3}
                activeDot={{ r: 8, strokeWidth: 0, fill: "#4C6FFF" }}
                dot={{ r: 0 }}
              />
              <Line
                type="monotone"
                dataKey="targetCount"
                name="Target"
                stroke="#FFB100"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={{ r: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const SupervisorWorkloadChart = () => (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChartIcon className="h-5 w-5 text-blue-500" />
              Supervisor Workload
            </CardTitle>
            <CardDescription>
              Distribution of teams among supervisors
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 py-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.supervisorStats.workloadDistribution}
              margin={{
                top: 5,
                right: 30,
                left: 5,
                bottom: 15,
              }}
              barCategoryGap={10}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,0,0,0.1)"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "none",
                }}
                itemStyle={{ color: "#333" }}
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{
                  paddingTop: "15px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="current"
                name="Current Teams"
                fill="#4C6FFF"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="capacity"
                name="Max Capacity"
                fill="#E8EDFF"
                stroke="#4C6FFF"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const SubmissionAnalytics = () => (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-blue-500" />
              Submission Timeline
            </CardTitle>
            <CardDescription>Project submissions over time</CardDescription>
          </div>
          <Badge
            variant="outline"
            className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-gray-200 dark:border-gray-700"
          >
            {analyticsData.projectStats.submissionTrend?.length || 0} data
            points
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-2 py-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analyticsData.projectStats.submissionTrend}
              margin={{
                top: 5,
                right: 30,
                left: 5,
                bottom: 15,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,0,0,0.1)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "none",
                }}
                itemStyle={{ color: "#333" }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{
                  paddingTop: "15px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="submissions"
                name="Submissions"
                stroke="#02BC77"
                strokeWidth={3}
                activeDot={{ r: 8, strokeWidth: 0, fill: "#02BC77" }}
                dot={{ r: 0 }}
              />
              <Line
                type="monotone"
                dataKey="reviews"
                name="Reviews"
                stroke="#4C6FFF"
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#4C6FFF" }}
                dot={{ r: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const DepartmentDistribution = () => (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Compass className="h-5 w-5 text-blue-500" />
              Department Distribution
            </CardTitle>
            <CardDescription>Teams by department</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 py-4">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.teamFormation.byDepartment}
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: 100,
                bottom: 5,
              }}
              barCategoryGap={10}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                stroke="rgba(0,0,0,0.1)"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="department"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={95}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "none",
                }}
                itemStyle={{ color: "#333" }}
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{
                  paddingTop: "15px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="teams"
                name="Teams"
                fill="#8E4BF8"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
              <Bar
                dataKey="students"
                name="Students"
                fill="#C5A3FF"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-blue-500" />
            System Analytics Dashboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Comprehensive analytics for{" "}
            {sessions.find((s) => s._id === selectedSession)?.name ||
              "the system"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {sessions.map((session) => (
                <SelectItem
                  key={session._id}
                  value={session._id}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span>{session.name}</span>
                    {session.status === "active" && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 font-normal text-xs ml-1">
                        Active
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[150px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <SelectItem
                value="week"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Last Week
              </SelectItem>
              <SelectItem
                value="month"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Last Month
              </SelectItem>
              <SelectItem
                value="quarter"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Last Quarter
              </SelectItem>
              <SelectItem
                value="year"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Last Year
              </SelectItem>
              <SelectItem
                value="all"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                All Time
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={fetchAnalyticsData}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="bg-transparent">
        <div className="overflow-x-auto">
          <TabsList className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 mb-6 w-full inline-flex whitespace-nowrap">
            <TabsTrigger
              value="overview"
              className="rounded-md py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white gap-2"
            >
              <BarChart2 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="rounded-md py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white gap-2"
            >
              <FileCheck className="h-4 w-4" />
              <span>Projects</span>
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="rounded-md py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white gap-2"
            >
              <Users className="h-4 w-4" />
              <span>Teams</span>
            </TabsTrigger>
            <TabsTrigger
              value="supervisors"
              className="rounded-md py-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white gap-2"
            >
              <Briefcase className="h-4 w-4" />
              <span>Supervisors</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 mt-0">
          <OverviewCards />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SessionProgressOverview />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectAnalytics />
            <TeamFormationChart />
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectAnalytics />
            <SubmissionAnalytics />
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Project Timeline
                  </CardTitle>
                  <CardDescription>
                    Project milestones and deadlines
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 gap-1 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Timeline visualization would go here */}
              <div className="p-20 flex flex-col justify-center items-center text-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 mb-4">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Detailed project timeline
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  This visualization would show key project milestones,
                  deadlines, and progress markers across the timeline.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 py-3 px-6">
              <Button
                variant="link"
                size="sm"
                className="ml-auto text-blue-600 dark:text-blue-400 p-0 h-auto gap-1 hover:no-underline"
              >
                <span>View detailed timeline</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TeamFormationChart />
            <DepartmentDistribution />
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Team Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Comparative team performance analytics
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-gray-200 dark:border-gray-700"
                >
                  {analyticsData.overview.totalTeams} teams
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Team performance metrics would go here */}
              <div className="p-20 flex flex-col justify-center items-center text-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 mb-4">
                  <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Team performance analytics
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  This visualization would show detailed metrics about team
                  performance, collaboration, and progress across projects.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 py-3 px-6">
              <Button
                variant="link"
                size="sm"
                className="ml-auto text-blue-600 dark:text-blue-400 p-0 h-auto gap-1 hover:no-underline"
              >
                <span>View detailed performance data</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="supervisors" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SupervisorWorkloadChart />
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Supervisor Performance
                    </CardTitle>
                    <CardDescription>
                      Review speeds and team completion rates
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-gray-200 dark:border-gray-700"
                  >
                    {analyticsData.overview.totalSupervisors} supervisors
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Supervisor performance visualization would go here */}
                <div className="p-20 flex flex-col justify-center items-center text-center">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 mb-4">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Supervisor performance metrics
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    This visualization would show review speeds, quality
                    metrics, and team success rates for supervisors.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 py-3 px-6">
                <Button
                  variant="link"
                  size="sm"
                  className="ml-auto text-blue-600 dark:text-blue-400 p-0 h-auto gap-1 hover:no-underline"
                >
                  <span>View detailed supervisor analytics</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Supervisor Approval Timeline
                  </CardTitle>
                  <CardDescription>
                    Supervisor approvals and assignment history
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 gap-1 text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Supervisor approval timeline would go here */}
              <div className="p-20 flex flex-col justify-center items-center text-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 mb-4">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Supervisor approval timeline
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  This visualization would show supervisor approvals,
                  rejections, and team assignments over time.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 py-3 px-6">
              <Button
                variant="link"
                size="sm"
                className="ml-auto text-blue-600 dark:text-blue-400 p-0 h-auto gap-1 hover:no-underline"
              >
                <span>View detailed approval history</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemAnalyticsDashboard;
