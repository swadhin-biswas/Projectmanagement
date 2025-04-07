import {
  faBell,
  faChartLine,
  faCheckCircle,
  faEnvelope,
  faFileAlt,
  faProjectDiagram,
  faUserGraduate,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
import { Textarea } from "../../components/ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

const COLORS = ["#8884d8", "#82ca9d", "#FFBB28", "#FF8042", "#0088FE"];

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isMarkingDialogOpen, setIsMarkingDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] =
    useState(false);
  const [markingForm, setMarkingForm] = useState({
    category: "report",
    marks: 0,
    feedback: "",
  });
  const [notificationForm, setNotificationForm] = useState({
    message: "",
    type: "general",
    isUrgent: false,
    toAll: true,
  });

  // Get supervisor dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ["supervisor-dashboard"],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/supervisor");
      return response.data;
    },
  });

  // Get supervised teams with extended details
  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["supervised-teams"],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/teams");
      return response.data.data || [];
    },
  });

  // Get supervised students
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["supervised-students"],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/students");
      return response.data.data || [];
    },
  });

  // Get pending submissions that need review
  const { data: pendingSubmissions, isLoading: isLoadingSubmissions } =
    useQuery({
      queryKey: ["pending-submissions"],
      queryFn: async () => {
        const response = await api.get("/api/supervisor/pending-submissions");
        return response.data.data || [];
      },
    });

  const stats = data?.data?.stats || {
    teamCount: 0,
    studentCount: 0,
    projectCount: 0,
    submittedReports: 0,
    pendingReviews: 0,
    projectTypes: { research: 0, development: 0 },
    submissionStatus: { pending: 0, submitted: 0, reviewed: 0 },
  };

  const teams = teamsData || [];
  const students = studentsData || [];
  const submissions = pendingSubmissions || [];

  const handleMarkStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const response = await api.post(
        `/api/supervisor/students/${selectedStudent._id}/mark`,
        markingForm
      );

      if (response.data.success) {
        toast.success("Student marked successfully");
        setIsMarkingDialogOpen(false);
        // Reset form
        setMarkingForm({
          category: "report",
          marks: 0,
          feedback: "",
        });
      }
    } catch (error) {
      toast.error(
        "Failed to mark student: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();

    try {
      let response;

      if (notificationForm.toAll) {
        // Send to entire team
        response = await api.post(
          `/api/supervisor/teams/${selectedTeam._id}/notify`,
          {
            message: notificationForm.message,
            type: notificationForm.type,
            isUrgent: notificationForm.isUrgent,
          }
        );
      } else if (selectedStudent) {
        // Send to specific student
        response = await api.post(
          `/api/supervisor/students/${selectedStudent._id}/feedback`,
          {
            message: notificationForm.message,
            type: notificationForm.type,
            isUrgent: notificationForm.isUrgent,
          }
        );
      }

      if (response?.data?.success) {
        toast.success("Notification sent successfully");
        setIsNotificationDialogOpen(false);
        // Reset form
        setNotificationForm({
          message: "",
          type: "general",
          isUrgent: false,
          toAll: true,
        });
      }
    } catch (error) {
      toast.error(
        "Failed to send notification: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  if (
    isLoading ||
    isLoadingTeams ||
    isLoadingStudents ||
    isLoadingSubmissions
  ) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-6 bg-red-50 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-700">
            {error.message || "Failed to load supervisor dashboard"}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-purple-600 hover:bg-purple-700"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const projectTypeData = Object.entries(stats.projectTypes || {}).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })
  );

  const submissionStatusData = Object.entries(stats.submissionStatus || {}).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })
  );

  // Helper function to get initials from name
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-800 dark:text-white">
          Supervisor Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome back, {user.fullName}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-4 gap-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faChartLine} className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUserGraduate} className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFileAlt} className="h-4 w-4" />
            Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-purple-500" />
                  Teams
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-3xl font-bold text-purple-500 mt-2">
                  {stats.teamCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faProjectDiagram}
                    className="text-green-500"
                  />
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-3xl font-bold text-green-500 mt-2">
                  {stats.projectCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faUserGraduate}
                    className="text-blue-500"
                  />
                  Students
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-3xl font-bold text-blue-500 mt-2">
                  {stats.studentCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faFileAlt}
                    className="text-amber-500"
                  />
                  Pending Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-3xl font-bold text-amber-500 mt-2">
                  {stats.pendingReviews || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle>Project Types</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectTypeData}
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

            <Card className="bg-white dark:bg-gray-800 p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle>Submission Status</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={submissionStatusData}>
                    <Bar dataKey="value" fill="#8884d8">
                      {submissionStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                    <Tooltip
                      formatter={(value, name, props) => [
                        value,
                        props.payload.name,
                      ]}
                      labelFormatter={() => ""}
                    />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-white dark:bg-gray-800 p-6 mt-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.recentActivities?.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">
                          {activity.type || "Activity"}
                        </Badge>
                      </TableCell>
                      <TableCell>{activity.team?.name || "N/A"}</TableCell>
                      <TableCell>
                        {activity.message || activity.description}
                      </TableCell>
                      <TableCell>
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.data?.recentActivities ||
                    data.data.recentActivities.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-4 text-gray-500"
                      >
                        No recent activities
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card className="bg-white dark:bg-gray-800 p-6">
            <CardHeader className="px-0 pt-0 mb-4">
              <CardTitle>Supervised Teams</CardTitle>
              <CardDescription>
                Teams you are supervising in the current session
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team._id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.memberCount} students</TableCell>
                      <TableCell>
                        {team.project ? team.project.name : "No project yet"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={team.project ? "success" : "outline"}>
                          {team.project ? team.project.status : "No project"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTeam(team);
                              setIsNotificationDialogOpen(true);
                              setNotificationForm((prev) => ({
                                ...prev,
                                toAll: true,
                              }));
                            }}
                          >
                            <FontAwesomeIcon
                              icon={faBell}
                              className="mr-2 h-4 w-4"
                            />
                            Notify
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedTeam(team);
                              // Navigate to team detail view
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {teams.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-gray-500"
                      >
                        No teams assigned yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card className="bg-white dark:bg-gray-800 p-6">
            <CardHeader className="px-0 pt-0 mb-4">
              <CardTitle>Supervised Students</CardTitle>
              <CardDescription>
                Students in teams you are supervising
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={student.profilePicture} />
                            <AvatarFallback>
                              {getInitials(student.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {student.fullName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell>{student.teamName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {student.role === "leader" ? "Team Leader" : "Member"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setSelectedTeam(
                                teams.find((t) => t._id === student.teamId)
                              );
                              setIsNotificationDialogOpen(true);
                              setNotificationForm((prev) => ({
                                ...prev,
                                toAll: false,
                              }));
                            }}
                          >
                            <FontAwesomeIcon
                              icon={faEnvelope}
                              className="mr-2 h-4 w-4"
                            />
                            Message
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsMarkingDialogOpen(true);
                            }}
                          >
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              className="mr-2 h-4 w-4"
                            />
                            Mark
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-gray-500"
                      >
                        No students assigned yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card className="bg-white dark:bg-gray-800 p-6">
            <CardHeader className="px-0 pt-0 mb-4">
              <CardTitle>Pending Submissions</CardTitle>
              <CardDescription>
                {submissions.length} submission
                {submissions.length !== 1 ? "s" : ""} awaiting your review
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {submissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission._id}>
                        <TableCell className="font-medium">
                          {submission.projectName}
                        </TableCell>
                        <TableCell>{submission.teamName}</TableCell>
                        <TableCell>
                          <Badge>{submission.submissionType || "Report"}</Badge>
                        </TableCell>
                        <TableCell>
                          {submission.submittedBy?.fullName || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {new Date(
                            submission.submittedAt
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Open link in new tab
                                window.open(
                                  submission.submissionLink,
                                  "_blank"
                                );
                              }}
                            >
                              View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Handle review
                                setSelectedStudent(
                                  students.find(
                                    (s) => s._id === submission.submittedBy?._id
                                  )
                                );
                                setIsMarkingDialogOpen(true);
                              }}
                            >
                              Review
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="h-12 w-12 text-green-500"
                  />
                  <p className="text-gray-500 text-center">
                    No pending submissions to review
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Marking Dialog */}
      <Dialog open={isMarkingDialogOpen} onOpenChange={setIsMarkingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Student: {selectedStudent?.fullName}</DialogTitle>
            <DialogDescription>
              Provide feedback and marks for this student's work
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMarkStudent}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={markingForm.category}
                  onValueChange={(value) =>
                    setMarkingForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="implementation">
                      Implementation
                    </SelectItem>
                    <SelectItem value="overall">Overall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marks">Marks (0-100)</Label>
                <Input
                  id="marks"
                  type="number"
                  min="0"
                  max="100"
                  value={markingForm.marks}
                  onChange={(e) =>
                    setMarkingForm((prev) => ({
                      ...prev,
                      marks: parseInt(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Provide feedback to the student"
                  value={markingForm.feedback}
                  onChange={(e) =>
                    setMarkingForm((prev) => ({
                      ...prev,
                      feedback: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsMarkingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Marks</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog
        open={isNotificationDialogOpen}
        onOpenChange={setIsNotificationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Send Notification to{" "}
              {notificationForm.toAll
                ? `Team: ${selectedTeam?.name}`
                : `Student: ${selectedStudent?.fullName}`}
            </DialogTitle>
            <DialogDescription>
              {notificationForm.toAll
                ? "This message will be sent to all members of the team"
                : "This message will be sent to the selected student only"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendNotification}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message here"
                  value={notificationForm.message}
                  onChange={(e) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  rows={4}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Message Type</Label>
                <Select
                  value={notificationForm.type}
                  onValueChange={(value) =>
                    setNotificationForm((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select message type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="praise">Praise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={notificationForm.isUrgent}
                  onChange={(e) =>
                    setNotificationForm((prev) => ({
                      ...prev,
                      isUrgent: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-purple-600"
                />
                <Label htmlFor="urgent" className="text-sm font-medium">
                  Mark as urgent
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNotificationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Send Message</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorDashboard;
