import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
  Users
} from "lucide-react";
import { api } from "../../lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

const COLORS = ["#4338ca", "#0ea5e9", "#22c55e", "#f97316", "#f43f5e", "#8b5cf6"];

const SupervisorPerformanceMetrics = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [department, setDepartment] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [sortBy, setSortBy] = useState("rating");

  // Fetch all supervisors with metrics
  const { data: supervisorsData, isLoading: loadingSupervisors } = useQuery({
    queryKey: ["supervisors-metrics", timeRange],
    queryFn: async () => {
      const params = {};
      if (timeRange !== "all") {
        params.timeRange = timeRange;
      }
      const response = await api.get("/api/admin/supervisors/metrics", { params });
      return response.data.data;
    },
  });

  // Fetch detailed metrics for a specific supervisor
  const { data: supervisorDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["supervisor-details", selectedSupervisor, timeRange],
    queryFn: async () => {
      if (!selectedSupervisor) return null;
      const params = {};
      if (timeRange !== "all") {
        params.timeRange = timeRange;
      }
      const response = await api.get(`/api/admin/supervisors/${selectedSupervisor}/metrics`, { params });
      return response.data.data;
    },
    enabled: !!selectedSupervisor,
  });

  // Extract unique departments
  useEffect(() => {
    if (supervisorsData?.supervisors) {
      const uniqueDepartments = [...new Set(supervisorsData.supervisors.map(s => s.department))].filter(Boolean);
      setDepartments(uniqueDepartments);
    }
  }, [supervisorsData]);

  // Filter supervisors
  const filteredSupervisors = supervisorsData?.supervisors
    ? supervisorsData.supervisors.filter(supervisor => {
        // Department filter
        if (department !== "all" && supervisor.department !== department) {
          return false;
        }

        // Search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            supervisor.fullName?.toLowerCase().includes(term) ||
            supervisor.email?.toLowerCase().includes(term) ||
            supervisor.department?.toLowerCase().includes(term)
          );
        }

        return true;
      })
    : [];

  // Sort supervisors
  const sortedSupervisors = [...filteredSupervisors].sort((a, b) => {
    if (sortBy === "rating") {
      return b.metrics.overallRating - a.metrics.overallRating;
    } else if (sortBy === "teams") {
      return b.metrics.teamCount - a.metrics.teamCount;
    } else if (sortBy === "responseTime") {
      return a.metrics.avgResponseTime - b.metrics.avgResponseTime;
    } else if (sortBy === "name") {
      return a.fullName.localeCompare(b.fullName);
    }
    return 0;
  });

  // Handle supervisor selection
  const handleSelectSupervisor = (supervisorId) => {
    setSelectedSupervisor(supervisorId);
  };

  // Helper for charts
  const getMonthlyFeedbackData = () => {
    if (!supervisorDetails?.monthlyData) return [];

    return Object.entries(supervisorDetails.monthlyData).map(([month, data]) => ({
      month,
      feedback: data.feedbackCount || 0,
      meetings: data.meetingsCount || 0,
      submissions: data.submissionsReviewed || 0,
    }));
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (!supervisorsData?.supervisors) return;

    const csv = [
      "Name,Email,Department,Teams,Students,Avg Response Time (hours),Feedback Count,Meeting Count,Rating",
      ...supervisorsData.supervisors.map(s =>
        `"${s.fullName}","${s.email}","${s.department || ''}",${s.metrics.teamCount},${s.metrics.studentCount},${s.metrics.avgResponseTime},${s.metrics.feedbackCount},${s.metrics.meetingCount},${s.metrics.overallRating}`
      )
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `supervisor_metrics_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Supervisor Performance Metrics</h1>
          <p className="text-gray-500">
            Analyze and compare supervisor performance across multiple metrics
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="3months">Past 3 Months</SelectItem>
              <SelectItem value="6months">Past 6 Months</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters and Supervisors List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Supervisors</CardTitle>
            <CardDescription>
              {filteredSupervisors.length} supervisors found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search and filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search supervisors..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Sort by Rating</SelectItem>
                      <SelectItem value="teams">Sort by Team Count</SelectItem>
                      <SelectItem value="responseTime">Sort by Response Time</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Supervisors list */}
              {loadingSupervisors ? (
                <div className="text-center py-8 text-gray-500">
                  Loading supervisors...
                </div>
              ) : sortedSupervisors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No supervisors found matching your criteria
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {sortedSupervisors.map((supervisor) => (
                      <div
                        key={supervisor._id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSupervisor === supervisor._id
                            ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 hover:border-blue-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
                        }`}
                        onClick={() => handleSelectSupervisor(supervisor._id)}
                      >
                        <div className="flex items-start">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={supervisor.profileImage} alt={supervisor.fullName} />
                            <AvatarFallback>{getInitials(supervisor.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{supervisor.fullName}</p>
                              <Badge
                                variant={
                                  supervisor.metrics.overallRating >= 4.5 ? "default" :
                                  supervisor.metrics.overallRating >= 3.5 ? "secondary" :
                                  supervisor.metrics.overallRating >= 2.5 ? "outline" :
                                  "destructive"
                                }
                              >
                                {supervisor.metrics.overallRating.toFixed(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {supervisor.department}
                            </p>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <span className="inline-flex items-center mr-3">
                                <Users className="h-3 w-3 mr-1" />
                                {supervisor.metrics.teamCount} teams
                              </span>
                              <span className="inline-flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {supervisor.metrics.avgResponseTime}h response
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed metrics for selected supervisor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedSupervisor
                ? supervisorDetails?.fullName
                  ? `${supervisorDetails.fullName}'s Performance`
                  : "Supervisor Details"
                : "Overall Performance Summary"}
            </CardTitle>
            <CardDescription>
              {selectedSupervisor
                ? supervisorDetails?.department
                  ? `${supervisorDetails.department} • ${timeRange === "all" ? "All time metrics" : `Metrics for the past ${timeRange}`}`
                  : "Loading supervisor details..."
                : "Select a supervisor to view detailed metrics"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSupervisor ? (
              <div className="text-center py-16 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Supervisor Selected</h3>
                <p>Select a supervisor from the list to view detailed performance metrics</p>
              </div>
            ) : loadingDetails ? (
              <div className="text-center py-16 text-gray-500">
                Loading supervisor metrics...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Key metrics cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Teams Assigned</p>
                    <p className="text-2xl font-bold">{supervisorDetails.metrics.teamCount}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {supervisorDetails.metrics.studentCount} students total
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Feedback Given</p>
                    <p className="text-2xl font-bold">{supervisorDetails.metrics.feedbackCount}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(supervisorDetails.metrics.feedbackPerStudent || 0).toFixed(1)} per student
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Avg Response Time</p>
                    <p className="text-2xl font-bold">{supervisorDetails.metrics.avgResponseTime}h</p>
                    <p className="text-xs text-gray-500 mt-1">
                      to review submissions
                    </p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                    <p className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">Overall Rating</p>
                    <p className="text-2xl font-bold">{supervisorDetails.metrics.overallRating.toFixed(1)}</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${(supervisorDetails.metrics.overallRating / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Tabs for different metrics views */}
                <Tabs defaultValue="performance">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="teams">Teams & Students</TabsTrigger>
                  </TabsList>

                  {/* Performance metrics tab */}
                  <TabsContent value="performance" className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Radar chart for skills */}
                      <div className="h-80 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">Performance Metrics</h3>
                        <ResponsiveContainer width="100%" height="90%">
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            data={[
                              { metric: "Feedback Quality", value: supervisorDetails.metrics.feedbackQuality || 0 },
                              { metric: "Response Time", value: 5 - (supervisorDetails.metrics.normalizedResponseTime || 0) },
                              { metric: "Meeting Effectiveness", value: supervisorDetails.metrics.meetingEffectiveness || 0 },
                              { metric: "Student Satisfaction", value: supervisorDetails.metrics.studentSatisfaction || 0 },
                              { metric: "Project Success", value: supervisorDetails.metrics.projectSuccessRate / 20 || 0 },
                              { metric: "Guidance Quality", value: supervisorDetails.metrics.guidanceQuality || 0 },
                            ]}
                          >
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: '#888', fontSize: 11 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                            <Radar
                              name="Performance"
                              dataKey="value"
                              stroke="#4f46e5"
                              fill="#4f46e5"
                              fillOpacity={0.4}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Student success metrics */}
                      <div className="h-80 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">Team Success Rates</h3>
                        <ResponsiveContainer width="100%" height="90%">
                          <BarChart
                            data={[
                              { category: "Project Completion", rate: supervisorDetails.metrics.projectCompletionRate || 0 },
                              { category: "On-time Submissions", rate: supervisorDetails.metrics.onTimeSubmissionRate || 0 },
                              { category: "Quality Score", rate: supervisorDetails.metrics.avgQualityScore || 0 },
                              { category: "Student Retention", rate: supervisorDetails.metrics.studentRetentionRate || 0 },
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [`${value}%`, ""]} />
                            <Bar dataKey="rate" name="Success Rate" fill="#3b82f6">
                              {[0, 1, 2, 3].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Rating comparison */}
                      <div className="h-80 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 lg:col-span-2">
                        <h3 className="text-sm font-medium mb-2">Rating Categories</h3>
                        <ResponsiveContainer width="100%" height="90%">
                          <BarChart
                            data={[
                              { category: "Communication", rating: supervisorDetails.metrics.communicationRating || 0, avg: supervisorsData?.averages?.communicationRating || 0 },
                              { category: "Responsiveness", rating: supervisorDetails.metrics.responsivenessRating || 0, avg: supervisorsData?.averages?.responsivenessRating || 0 },
                              { category: "Knowledge", rating: supervisorDetails.metrics.knowledgeRating || 0, avg: supervisorsData?.averages?.knowledgeRating || 0 },
                              { category: "Guidance", rating: supervisorDetails.metrics.guidanceRating || 0, avg: supervisorsData?.averages?.guidanceRating || 0 },
                              { category: "Availability", rating: supervisorDetails.metrics.availabilityRating || 0, avg: supervisorsData?.averages?.availabilityRating || 0 },
                              { category: "Fairness", rating: supervisorDetails.metrics.fairnessRating || 0, avg: supervisorsData?.averages?.fairnessRating || 0 },
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => [`${value.toFixed(1)}/5`, ""]} />
                            <Legend />
                            <Bar dataKey="rating" name="This Supervisor" fill="#4f46e5" />
                            <Bar dataKey="avg" name="Department Average" fill="#94a3b8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Activity metrics tab */}
                  <TabsContent value="activity" className="pt-4">
                    <div className="grid grid-cols-1 gap-6">
                      {/* Activity timeline */}
                      <div className="h-80 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">Monthly Activity</h3>
                        <ResponsiveContainer width="100%" height="90%">
                          <LineChart
                            data={getMonthlyFeedbackData()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="feedback" name="Feedback Given" stroke="#4f46e5" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="meetings" name="Meetings Held" stroke="#10b981" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="submissions" name="Submissions Reviewed" stroke="#f97316" activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Recent activity table */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-4">Recent Activities</h3>
                        {supervisorDetails.recentActivities?.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Activity Type</TableHead>
                                <TableHead>Team/Student</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {supervisorDetails.recentActivities.map((activity, i) => (
                                <TableRow key={i}>
                                  <TableCell className="whitespace-nowrap">
                                    {format(new Date(activity.date), "MMM d, yyyy")}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {activity.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{activity.target}</TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {activity.description}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-center text-gray-500 py-4">
                            No recent activities to display
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Teams & students tab */}
                  <TabsContent value="teams" className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Assigned teams */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-4">Assigned Teams</h3>
                        {supervisorDetails.teams?.length > 0 ? (
                          <div className="space-y-3">
                            {supervisorDetails.teams.map((team) => (
                              <div key={team._id} className="border rounded-md p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium">{team.name}</h4>
                                    <p className="text-xs text-gray-500">
                                      {team.members?.length || 0} members • {team.projectTitle || "No project"}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      team.progress >= 80 ? "default" :
                                      team.progress >= 50 ? "secondary" :
                                      team.progress >= 30 ? "outline" :
                                      "destructive"
                                    }
                                  >
                                    {team.progress}% Complete
                                  </Badge>
                                </div>
                                <Progress
                                  value={team.progress}
                                  className="h-1.5 mt-2"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">
                            No teams assigned to this supervisor
                          </p>
                        )}
                      </div>

                      {/* Student satisfaction */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-4">Student Feedback</h3>
                        {supervisorDetails.studentFeedback?.length > 0 ? (
                          <div className="space-y-3">
                            {supervisorDetails.studentFeedback.map((feedback, i) => (
                              <div key={i} className="border rounded-md p-3">
                                <div className="flex justify-between">
                                  <p className="font-medium text-sm">{feedback.from}</p>
                                  <div className="flex items-center">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <svg
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < feedback.rating
                                            ? "text-yellow-400"
                                            : "text-gray-300 dark:text-gray-600"
                                        }`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                      </svg>
                                    ))}
                                    <span className="ml-1 text-sm">
                                      {feedback.rating.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                                  "{feedback.comment}"
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {format(new Date(feedback.date), "MMM d, yyyy")}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">
                            No student feedback available
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorPerformanceMetrics;