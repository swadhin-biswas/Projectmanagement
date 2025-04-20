import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  faCheckCircle,
  faSearch,
  faTimes,
  faTrash,
  faUserClock,
  faUserGraduate,
  faUserShield,
  faUserTie,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import React, { useContext, useEffect, useState } from "react";
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
import { toast } from "sonner"; // Fixed import
import NotificationCenter from "../components/admin/NotificationCenter";
import SessionManagement from "../components/admin/SessionManagement";
import { AuthContext } from "../context/AuthContext";
import { api } from "../lib/api";
import { adminService } from "../services/api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [allUsers, setAllUsers] = useState([]);
  const [pendingSupervisors, setPendingSupervisors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  // Fetch all analytics data using React Query
  const { data: overviewData } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const response = await api.get("/api/analytics/overview");
      return response.data;
    },
  });

  const { data: teamStats } = useQuery({
    queryKey: ["team-stats"],
    queryFn: async () => {
      const response = await api.get("/api/analytics/teams");
      return response.data;
    },
  });

  const { data: submissionStats } = useQuery({
    queryKey: ["submission-stats"],
    queryFn: async () => {
      const response = await api.get("/api/analytics/submissions");
      return response.data;
    },
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      const response = await api.get("/api/analytics/performance");
      return response.data;
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [usersResponse, pendingSupervisorsResponse] = await Promise.all([
          adminService.getUsers(),
          adminService.getPendingSupervisors(),
        ]);

        setAllUsers(usersResponse);
        setPendingSupervisors(pendingSupervisorsResponse);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast.error("Failed to load dashboard data");
      }
    };

    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  const handleApproveSupervisor = async (id) => {
    try {
      await adminService.approveSupervisor(id);
      setPendingSupervisors((prev) => prev.filter((s) => s._id !== id));
      setAllUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isApproved: true } : u))
      );
      toast.success("Supervisor has been approved successfully");
    } catch (error) {
      console.error("Error approving supervisor:", error);
      toast.error("Failed to approve supervisor. Please try again.");
    }
  };

  const handleDeleteUser = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      try {
        await adminService.deleteUser(id);
        setAllUsers((prev) => prev.filter((u) => u._id !== id));
        setPendingSupervisors((prev) => prev.filter((s) => s._id !== id));
        toast.success("User has been deleted");
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      }
    }
  };

  const filteredUsers = allUsers.filter(
    (user) =>
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const countUsersByRole = (role) =>
    allUsers.filter((u) => u.role === role).length;

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-center">
          You do not have permission to access the admin dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Title and Notifications */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 dark:text-white flex items-center">
            <FontAwesomeIcon icon={faUserShield} className="mr-2" /> Admin
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeSection === "dashboard" ? "default" : "outline"}
                onClick={() => setActiveSection("dashboard")}
                className={activeSection === "dashboard" ? "bg-blue-600" : ""}
              >
                Dashboard
              </Button>
              <Button
                variant={activeSection === "users" ? "default" : "outline"}
                onClick={() => setActiveSection("users")}
                className={activeSection === "users" ? "bg-blue-600" : ""}
              >
                Users
              </Button>
              <Button
                variant={activeSection === "students" ? "default" : "outline"}
                onClick={() => setActiveSection("students")}
                className={activeSection === "students" ? "bg-green-600" : ""}
              >
                Students
              </Button>
              <Button
                variant={activeSection === "supervisors" ? "default" : "outline"}
                onClick={() => setActiveSection("supervisors")}
                className={activeSection === "supervisors" ? "bg-purple-600" : ""}
              >
                Supervisors
              </Button>
              <Button
                variant={activeSection === "admins" ? "default" : "outline"}
                onClick={() => setActiveSection("admins")}
                className={activeSection === "admins" ? "bg-red-600" : ""}
              >
                Admins
              </Button>
              <Button
                variant={activeSection === "projects" ? "default" : "outline"}
                onClick={() => setActiveSection("projects")}
                className={activeSection === "projects" ? "bg-yellow-600" : ""}
              >
                Projects
              </Button>
              <Button
                variant={activeSection === "teams" ? "default" : "outline"}
                onClick={() => setActiveSection("teams")}
                className={activeSection === "teams" ? "bg-teal-600" : ""}
              >
                Teams
              </Button>
              <Button
                variant={activeSection === "summarization" ? "default" : "outline"}
                onClick={() => setActiveSection("summarization")}
                className={activeSection === "summarization" ? "bg-pink-600" : ""}
              >
                Summarization
              </Button>
              <Button
                variant={activeSection === "timeline" ? "default" : "outline"}
                onClick={() => setActiveSection("timeline")}
                className={activeSection === "timeline" ? "bg-indigo-600" : ""}
              >
                Timeline
              </Button>
              <Button
                variant={activeSection === "analysis" ? "default" : "outline"}
                onClick={() => setActiveSection("analysis")}
                className={activeSection === "analysis" ? "bg-gray-600" : ""}
              >
                Analysis
              </Button>
            </div>
            <NotificationCenter />
          </div>
        </div>

        {activeSection === "dashboard" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white dark:bg-gray-800 border-t-4 border-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Users
                      </p>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {allUsers.length}
                      </h3>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                      <FontAwesomeIcon
                        icon={faUsers}
                        className="text-xl text-blue-500 dark:text-blue-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-t-4 border-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Students
                      </p>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {countUsersByRole("student")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <FontAwesomeIcon
                        icon={faUserGraduate}
                        className="text-xl text-green-500 dark:text-green-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-t-4 border-purple-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Supervisors
                      </p>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {countUsersByRole("supervisor")}
                      </h3>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                      <FontAwesomeIcon
                        icon={faUserTie}
                        className="text-xl text-purple-500 dark:text-purple-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-t-4 border-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Pending Approvals
                      </p>
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {pendingSupervisors.length}
                      </h3>
                    </div>
                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                      <FontAwesomeIcon
                        icon={faUserClock}
                        className="text-xl text-yellow-500 dark:text-yellow-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Submission Trend */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Submission Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={Object.entries(
                          submissionStats?.submissionTrend || {}
                        ).map(([date, count]) => ({
                          date: new Date(date).toLocaleDateString(),
                          count,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#0088FE"
                          name="Submissions"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Project Types Distribution */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Project Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(
                            teamStats?.projectTypes || {}
                          ).map(([type, count], index) => ({
                            name: type.replace("_", " ").toUpperCase(),
                            value: count,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(teamStats?.projectTypes || {}).map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Project Timeline Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(
                          performanceMetrics?.timeline || {}
                        ).map(([status, count]) => ({
                          name:
                            status.charAt(0).toUpperCase() + status.slice(1),
                          count,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#82ca9d" name="Projects" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Team Statistics */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>Team Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Teams
                      </span>
                      <span className="font-bold">{teamStats?.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        Teams with Projects
                      </span>
                      <span className="font-bold">
                        {teamStats?.withProject || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        Average Team Size
                      </span>
                      <span className="font-bold">
                        {teamStats?.averageSize?.toFixed(1) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        Project Completion Rate
                      </span>
                      <span className="font-bold">
                        {performanceMetrics?.completionRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeSection === "sessions" && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <SessionManagement />
          </div>
        )}

        {activeSection === "users" && (
          <Tabs defaultValue="users" className="mb-8">
            <TabsList className="grid w-full grid-cols-2 bg-blue-100 dark:bg-blue-900 rounded-lg p-1">
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-800 dark:data-[state=active]:text-white"
              >
                <FontAwesomeIcon icon={faUsers} className="mr-2" /> All Users
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-800 dark:data-[state=active]:text-white"
              >
                <FontAwesomeIcon icon={faUserClock} className="mr-2" /> Pending
                Approvals
                {pendingSupervisors.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {pendingSupervisors.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-blue-800 dark:text-white">
                    Manage Users
                  </CardTitle>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      type="text"
                      placeholder="Search by name, email, role, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-blue-50 dark:bg-blue-900">
                        <TableRow>
                          <TableHead className="font-semibold text-blue-800 dark:text-white">
                            Name
                          </TableHead>
                          <TableHead className="font-semibold text-blue-800 dark:text-white">
                            Email
                          </TableHead>
                          <TableHead className="font-semibold text-blue-800 dark:text-white">
                            Role
                          </TableHead>
                          <TableHead className="font-semibold text-blue-800 dark:text-white">
                            Department
                          </TableHead>
                          <TableHead className="font-semibold text-blue-800 dark:text-white">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold text-blue-800 dark:text-white">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <TableRow
                              key={user._id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <TableCell className="font-medium dark:text-white">
                                {user.profileImage && (
                                  <img
                                    src={user.profileImage}
                                    alt={user.fullName}
                                    className="w-8 h-8 rounded-full inline mr-2"
                                  />
                                )}
                                {user.fullName}
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold
                                  ${
                                    user.role === "admin"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                      : user.role === "supervisor"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  }`}
                                >
                                  {user.role}
                                </span>
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                {user.department || "-"}
                              </TableCell>
                              <TableCell>
                                {user.isApproved ? (
                                  <span className="text-green-600 dark:text-green-400 flex items-center">
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="mr-1"
                                    />{" "}
                                    Approved
                                  </span>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-400 flex items-center">
                                    <FontAwesomeIcon
                                      icon={faUserClock}
                                      className="mr-1"
                                    />{" "}
                                    Pending
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user._id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <FontAwesomeIcon
                                    icon={faTrash}
                                    className="mr-1"
                                  />{" "}
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-8 text-gray-500 dark:text-gray-400"
                            >
                              No users found matching the search criteria.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-white">
                    Pending Supervisor Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingSupervisors.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-blue-50 dark:bg-blue-900">
                          <TableRow>
                            <TableHead className="font-semibold text-blue-800 dark:text-white">
                              Name
                            </TableHead>
                            <TableHead className="font-semibold text-blue-800 dark:text-white">
                              Email
                            </TableHead>
                            <TableHead className="font-semibold text-blue-800 dark:text-white">
                              Department
                            </TableHead>
                            <TableHead className="font-semibold text-blue-800 dark:text-white">
                              Specialization
                            </TableHead>
                            <TableHead className="font-semibold text-blue-800 dark:text-white">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingSupervisors.map((supervisor) => (
                            <TableRow
                              key={supervisor._id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <TableCell className="font-medium dark:text-white">
                                {supervisor.profileImage && (
                                  <img
                                    src={supervisor.profileImage}
                                    alt={supervisor.fullName}
                                    className="w-8 h-8 rounded-full inline mr-2"
                                  />
                                )}
                                {supervisor.fullName}
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                {supervisor.email}
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                {supervisor.department || "-"}
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                {supervisor.specialization || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() =>
                                      handleApproveSupervisor(supervisor._id)
                                    }
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="mr-1"
                                    />{" "}
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteUser(supervisor._id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    <FontAwesomeIcon
                                      icon={faTimes}
                                      className="mr-1"
                                    />{" "}
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 px-4">
                      <div className="flex justify-center">
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="text-green-500 text-4xl mb-3"
                        />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        All caught up!
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        There are no pending supervisor approvals at this time.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
