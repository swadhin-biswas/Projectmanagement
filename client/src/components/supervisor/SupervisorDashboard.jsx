import {
  getAssignedProjects,
  getAssignedTeams,
  getSupervisorAnalytics,
} from "@/api/supervisor";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Users,
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

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
const STATUS_ICONS = {
  on_track: <CheckCircle className="h-5 w-5 text-green-500" />,
  at_risk: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  delayed: <AlertCircle className="h-5 w-5 text-red-500" />,
  completed: <Award className="h-5 w-5 text-blue-500" />,
  not_started: <Clock className="h-5 w-5 text-gray-400" />,
};

const STATUS_COLORS = {
  on_track: "bg-green-500",
  at_risk: "bg-amber-500",
  delayed: "bg-red-500",
  completed: "bg-blue-500",
  not_started: "bg-gray-400",
};

export default function SupervisorDashboard() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load analytics
      const analyticsResponse = await getSupervisorAnalytics();
      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }

      // Load teams
      const teamsResponse = await getAssignedTeams({ limit: 10 });
      if (teamsResponse.success) {
        setTeams(teamsResponse.data.teams || []);
      }

      // Load projects
      const projectsResponse = await getAssignedProjects({ limit: 10 });
      if (projectsResponse.success) {
        setProjects(projectsResponse.data.projects || []);
      }
    } catch (error) {
      toast({
        title: "Error loading dashboard data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variantMap = {
      on_track: "outline",
      at_risk: "secondary",
      delayed: "destructive",
      completed: "default",
      not_started: "outline",
    };

    const variant = variantMap[status] || "outline";
    const icon = STATUS_ICONS[status] || <Clock className="h-4 w-4 mr-1" />;
    const label = status
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return (
      <Badge variant={variant} className="flex items-center">
        <span className="mr-1">{icon}</span>
        {label}
      </Badge>
    );
  };

  if (loading && !analytics) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  // Prepare data for charts
  const prepareTeamStatusData = () => {
    if (!analytics?.teamMetrics?.teamsByProgress) return [];

    const { teamsByProgress } = analytics.teamMetrics;
    return [
      {
        name: "On Track",
        value: teamsByProgress.onTrack || 0,
        color: "#10b981",
      },
      { name: "At Risk", value: teamsByProgress.atRisk || 0, color: "#f59e0b" },
      {
        name: "Delayed",
        value: teamsByProgress.delayed || 0,
        color: "#ef4444",
      },
    ].filter((item) => item.value > 0);
  };

  const prepareSubmissionData = () => {
    if (!analytics?.studentMetrics) return [];

    const {
      submittedReports = 0,
      pendingReports = 0,
      lateSubmissions = 0,
    } = analytics.studentMetrics;

    return [
      { name: "On Time", value: submittedReports - lateSubmissions },
      { name: "Late", value: lateSubmissions },
      { name: "Pending", value: pendingReports },
    ];
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Supervisor Dashboard</h2>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Supervised Teams
                    </p>
                    <p className="text-2xl font-bold">
                      {analytics?.teamMetrics?.totalTeams || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Students
                    </p>
                    <p className="text-2xl font-bold">
                      {analytics?.studentMetrics?.totalStudents || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Reports Reviewed
                    </p>
                    <p className="text-2xl font-bold">
                      {analytics?.activityMetrics?.feedbacksProvided || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Upcoming Meetings
                    </p>
                    <p className="text-2xl font-bold">
                      {analytics?.upcomingMeetings?.length || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Status Overview</CardTitle>
                <CardDescription>
                  Distribution of teams by current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareTeamStatusData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareTeamStatusData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>Status of report submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareSubmissionData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Submissions" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest activities across your supervised teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {analytics?.recentActivities?.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div
                        className={`p-2 rounded-full ${
                          STATUS_COLORS[activity.type] || "bg-blue-500"
                        }`}
                      >
                        {STATUS_ICONS[activity.type] || (
                          <FileText className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {(!analytics?.recentActivities ||
                    analytics.recentActivities.length === 0) && (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No recent activities to display
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Team/Student</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.upcomingMeetings?.map((meeting, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {meeting.title}
                      </TableCell>
                      <TableCell>
                        {meeting.team?.name ||
                          meeting.attendees[0]?.name ||
                          "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(meeting.date).toLocaleDateString()}{" "}
                        {new Date(meeting.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge>{meeting.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {(!analytics?.upcomingMeetings ||
                    analytics.upcomingMeetings.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-4"
                      >
                        No upcoming meetings scheduled
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6 pt-4">
          {/* Team List */}
          <Card>
            <CardHeader>
              <CardTitle>Supervised Teams</CardTitle>
              <CardDescription>
                All teams under your supervision
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team._id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>
                        {team.members?.length || 0} students
                      </TableCell>
                      <TableCell>
                        {team.project?.name || "Not assigned"}
                      </TableCell>
                      <TableCell>
                        <div className="w-full">
                          <Progress
                            value={team.progress || 0}
                            className="h-2"
                          />
                          <p className="text-xs text-right mt-1">
                            {team.progress || 0}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(team.status || "not_started")}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {teams.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-4"
                      >
                        No teams assigned to you
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" size="sm">
                View All Teams
              </Button>
            </CardFooter>
          </Card>

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>
                Progress tracking across all supervised teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teams.map((team) => ({
                      name: team.name,
                      progress: team.progress || 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="progress"
                      name="Progress (%)"
                      fill="#10b981"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6 pt-4">
          {/* Projects List */}
          <Card>
            <CardHeader>
              <CardTitle>Supervised Projects</CardTitle>
              <CardDescription>
                All projects under your supervision
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project._id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>{project.team?.name || "N/A"}</TableCell>
                      <TableCell>{project.type}</TableCell>
                      <TableCell>
                        {project.submissions?.length || 0} submissions
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(project.status || "not_started")}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-4"
                      >
                        No projects assigned to you
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" size="sm">
                View All Projects
              </Button>
            </CardFooter>
          </Card>

          {/* Project Types */}
          <Card>
            <CardHeader>
              <CardTitle>Project Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(() => {
                        const types = {};
                        projects.forEach((project) => {
                          types[project.type] = (types[project.type] || 0) + 1;
                        });
                        return Object.entries(types).map(([name, value]) => ({
                          name,
                          value,
                        }));
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
