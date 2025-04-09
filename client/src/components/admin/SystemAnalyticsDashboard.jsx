import {
  BarChart2,
  Briefcase,
  Calendar,
  FileCheck,
  Filter,
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
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
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

  const OverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Students
              </p>
              <p className="text-3xl font-bold">
                {analyticsData.overview.totalStudents}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              <span className="text-green-500 font-medium">
                {analyticsData.overview.activeStudents}
              </span>{" "}
              active in current session
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Teams</p>
              <p className="text-3xl font-bold">
                {analyticsData.overview.totalTeams}
              </p>
            </div>
            <Briefcase className="h-8 w-8 text-amber-500" />
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Average{" "}
              {(
                analyticsData.overview.totalStudents /
                  analyticsData.overview.totalTeams || 0
              ).toFixed(1)}{" "}
              students per team
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Projects Completed
              </p>
              <p className="text-3xl font-bold">
                {analyticsData.overview.completedProjects}
              </p>
            </div>
            <FileCheck className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {(
                (analyticsData.overview.completedProjects /
                  analyticsData.overview.totalProjects) *
                  100 || 0
              ).toFixed(1)}
              % completion rate
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SessionProgressOverview = () => (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Session Progress</CardTitle>
        <CardDescription>
          Current session progress and upcoming deadlines
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Overall Progress</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${analyticsData.sessionProgress.current}%` }}
                ></div>
              </div>
            </div>
            <span className="text-sm font-bold">
              {analyticsData.sessionProgress.current}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Deadlines Completed</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-green-600 h-2.5 rounded-full"
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
            <span className="text-sm font-bold">
              {analyticsData.sessionProgress.deadlinesCompleted} /{" "}
              {analyticsData.sessionProgress.totalDeadlines}
            </span>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Upcoming Deadlines</h4>
            <div className="space-y-2">
              {analyticsData.sessionProgress.upcomingDeadlines
                .slice(0, 3)
                .map((deadline, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                  >
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">{deadline.title}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm mr-2">
                        {new Date(deadline.dueDate).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          deadline.daysRemaining <= 3
                            ? "bg-red-100 text-red-800"
                            : deadline.daysRemaining <= 7
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {deadline.daysRemaining} days
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProjectAnalytics = () => (
    <Card>
      <CardHeader>
        <CardTitle>Project Distribution</CardTitle>
        <div className="flex items-center justify-between">
          <CardDescription>Projects by status and type</CardDescription>
          <Select value="status" onValueChange={(value) => console.log(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="View by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="type">By Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analyticsData.projectStats.byStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {analyticsData.projectStats.byStatus.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} projects`, "Count"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const TeamFormationChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Team Formation Trend</CardTitle>
        <CardDescription>Team registrations over time</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analyticsData.teamFormation.trend}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const SupervisorWorkloadChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Supervisor Workload</CardTitle>
        <CardDescription>
          Distribution of teams among supervisors
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.supervisorStats.workloadDistribution}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" name="Current Teams" fill="#8884d8" />
              <Bar dataKey="capacity" name="Max Capacity" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const SubmissionAnalytics = () => (
    <Card>
      <CardHeader>
        <CardTitle>Submission Timeline</CardTitle>
        <CardDescription>Project submissions over time</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analyticsData.projectStats.submissionTrend}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="submissions"
                stroke="#00C49F"
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="reviews"
                stroke="#0088FE"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  const DepartmentDistribution = () => (
    <Card>
      <CardHeader>
        <CardTitle>Department Distribution</CardTitle>
        <CardDescription>Teams by department</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
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
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="department" />
              <Tooltip />
              <Legend />
              <Bar dataKey="teams" name="Teams" fill="#8884d8" />
              <Bar dataKey="students" name="Students" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">System Analytics Dashboard</h2>
          <p className="text-gray-500">
            Comprehensive analytics for the entire system
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session._id} value={session._id}>
                  {session.name} {session.status === "active" ? "(Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={fetchAnalyticsData}
          >
            <Filter className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-1 md:grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span>Projects</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Teams</span>
          </TabsTrigger>
          <TabsTrigger value="supervisors" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>Supervisors</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewCards />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SessionProgressOverview />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProjectAnalytics />
            <TeamFormationChart />
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProjectAnalytics />
            <SubmissionAnalytics />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
              <CardDescription>
                Project milestones and deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Timeline visualization would go here */}
              <div className="p-8 flex justify-center items-center text-gray-500">
                Detailed project timeline visualization
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamFormationChart />
            <DepartmentDistribution />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Team Performance Metrics</CardTitle>
              <CardDescription>
                Comparative team performance analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Team performance metrics would go here */}
              <div className="p-8 flex justify-center items-center text-gray-500">
                Detailed team performance visualization
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervisors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SupervisorWorkloadChart />
            <Card>
              <CardHeader>
                <CardTitle>Supervisor Performance</CardTitle>
                <CardDescription>
                  Review speeds and team completion rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Supervisor performance visualization would go here */}
                <div className="p-8 flex justify-center items-center text-gray-500">
                  Supervisor performance analytics
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supervisor Approval Timeline</CardTitle>
              <CardDescription>
                Supervisor approvals and assignment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Supervisor approval timeline would go here */}
              <div className="p-8 flex justify-center items-center text-gray-500">
                Supervisor approval and assignment timeline
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemAnalyticsDashboard;
