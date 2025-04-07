import { useQuery } from "@tanstack/react-query";
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
import LoadingSpinner from "../../components/LoadingSpinner";
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
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
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
      const response = await api.get("/api/dashboard/admin", {
        params: selectedSession ? { sessionId: selectedSession } : {},
      });
      return response.data;
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

  if (loadingAnalytics || loadingSupervisors) {
    return <LoadingSpinner />;
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Admin Dashboard</h1>

        {data?.sessions && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Session:</span>
            <select
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1"
              value={selectedSession || data.currentSession?._id || ""}
              onChange={(e) => handleSessionChange(e.target.value)}
            >
              {data.sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.name} {session.status === "active" ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Current Session Overview */}
      {data?.currentSession && (
        <Card className="mb-6 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold">
              Current Session: {data.currentSession.name}
            </CardTitle>
            <CardDescription>
              {new Date(data.currentSession.startDate).toLocaleDateString()} -{" "}
              {new Date(data.currentSession.endDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Progress
                </p>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.currentSession.progress}
                    className="h-2"
                  />
                  <span className="text-sm font-medium">
                    {data.currentSession.progress}%
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {data.analytics.totalTeams}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Teams
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {data.analytics.totalStudents}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Students
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {data.analytics.totalSupervisors}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.analytics?.totalStudents || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.projectStats?.total || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.teamStats?.total || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.analytics?.pendingApprovals || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Types Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Project Types</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
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
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Project Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Project Status</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Size Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Team Size Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={teamSizeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
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
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentActivities?.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell>{activity.message}</TableCell>
                      <TableCell>{activity.user?.name || "System"}</TableCell>
                      <TableCell>
                        {new Date(activity.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.teamStats?.total || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  With Supervisor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.teamStats?.withSupervisor || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Without Supervisor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.teamStats?.withoutSupervisor || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Avg Team Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.teamStats?.averageSize?.toFixed(1) || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Size Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Team Size Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamSizeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Teams">
                    {teamSizeData.map((entry, index) => (
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

          {/* Teams without Supervisors Section */}
          <Card>
            <CardHeader>
              <CardTitle>Teams Needing Supervisors</CardTitle>
              <CardDescription>
                {data?.analytics?.supervisorAssignmentStats
                  ?.teamsWithoutSupervisor || 0}{" "}
                teams need supervisors assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button
                  variant="default"
                  onClick={() => setIsAssignModalOpen(true)}
                >
                  Assign Supervisors
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supervisors Tab */}
        <TabsContent value="supervisors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Supervisors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.supervisorStats?.total || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.supervisorStats?.pendingApprovals || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Avg Load
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.supervisorStats?.analytics?.length
                    ? (
                        data.supervisorStats.analytics.reduce(
                          (acc, sup) => acc + sup.currentLoad,
                          0
                        ) / data.supervisorStats.analytics.length
                      ).toFixed(1)
                    : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Supervisors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Supervisors</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.supervisorStats?.analytics
                    ?.slice(0, 5)
                    .map((supervisor) => (
                      <TableRow key={supervisor._id}>
                        <TableCell>{supervisor.name}</TableCell>
                        <TableCell>{supervisor.department}</TableCell>
                        <TableCell>{supervisor.currentLoad}</TableCell>
                        <TableCell>{supervisor.studentCount}</TableCell>
                        <TableCell>
                          {supervisor.isApproved ? (
                            <Badge variant="success">Approved</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending Supervisor Approvals */}
          {pendingSupervisors?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Supervisor Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSupervisors.map((supervisor) => (
                      <TableRow key={supervisor._id}>
                        <TableCell>{supervisor.fullName}</TableCell>
                        <TableCell>{supervisor.email}</TableCell>
                        <TableCell>{supervisor.department}</TableCell>
                        <TableCell>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              handleApproveSupervisor(supervisor._id)
                            }
                          >
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.currentSession?.deadlines
                    ?.filter((d) => !d.isPast)
                    ?.sort((a, b) => a.daysRemaining - b.daysRemaining)
                    ?.map((deadline, index) => (
                      <TableRow key={index}>
                        <TableCell>{deadline.title}</TableCell>
                        <TableCell>
                          {new Date(deadline.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge>{deadline.type}</Badge>
                        </TableCell>
                        <TableCell>{deadline.daysRemaining}</TableCell>
                        <TableCell>
                          {deadline.daysRemaining <= 3 ? (
                            <Badge variant="destructive">Urgent</Badge>
                          ) : deadline.daysRemaining <= 7 ? (
                            <Badge variant="warning">Approaching</Badge>
                          ) : (
                            <Badge variant="outline">Upcoming</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Past Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.currentSession?.deadlines
                    ?.filter((d) => d.isPast)
                    ?.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
                    ?.map((deadline, index) => (
                      <TableRow key={index}>
                        <TableCell>{deadline.title}</TableCell>
                        <TableCell>
                          {new Date(deadline.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge>{deadline.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Completed</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Supervisor to Team</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="team">Select Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger id="team" className="w-full">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="supervisor">Select Supervisor</Label>
              <Select
                value={selectedSupervisor}
                onValueChange={setSelectedSupervisor}
              >
                <SelectTrigger id="supervisor" className="w-full">
                  <SelectValue placeholder="Choose a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((supervisor) => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSupervisor}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
