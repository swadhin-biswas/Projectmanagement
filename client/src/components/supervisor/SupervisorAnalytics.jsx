import {
  faCheckCircle,
  faClockRotateLeft,
  faUserGraduate,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useState } from "react";
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
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#9966FF"];

const SupervisorAnalytics = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");

  // Get analytics data
  const { data, isLoading, error } = useQuery({
    queryKey: ["supervisor-analytics", selectedTimeframe],
    queryFn: async () => {
      const response = await api.get("/api/supervisor/analytics/dashboard", {
        params: { timeframe: selectedTimeframe },
      });
      return response.data.data || {};
    },
  });

  // Get team performance data
  const { data: teamPerformance, isLoading: loadingTeamPerformance } = useQuery(
    {
      queryKey: ["team-performance"],
      queryFn: async () => {
        const response = await api.get("/api/supervisor/analytics/teams");
        return response.data.data || [];
      },
    }
  );

  // Get student progress data
  const { data: studentProgress, isLoading: loadingStudentProgress } = useQuery(
    {
      queryKey: ["student-progress"],
      queryFn: async () => {
        const response = await api.get("/api/supervisor/analytics/students");
        return response.data.data || [];
      },
    }
  );

  // Get submission trends data
  const { data: submissionTrends, isLoading: loadingSubmissionTrends } =
    useQuery({
      queryKey: ["submission-trends"],
      queryFn: async () => {
        const response = await api.get("/api/supervisor/analytics/submissions");
        return response.data.data || [];
      },
    });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500">
        Failed to load analytics data. Please try again later.
      </div>
    );
  }

  const stats = data?.analytics || {
    totalTeams: 0,
    totalStudents: 0,
    projectSubmissions: 0,
    pendingReviews: 0,
    projectTypes: { research_based: 0, project_based: 0 },
    submissionStatus: { submitted: 0, reviewed: 0, in_progress: 0 },
  };

  const projectTypeData = Object.entries(stats.projectTypes || {}).map(
    ([name, value]) => ({
      name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    })
  );

  const submissionStatusData = Object.entries(stats.submissionStatus || {}).map(
    ([name, value]) => ({
      name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    })
  );

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Supervisor Analytics Dashboard</CardTitle>
            <CardDescription>
              Detailed analytics about your teams, students, and projects
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedTimeframe === "month" ? "default" : "outline"}
              onClick={() => setSelectedTimeframe("month")}
              size="sm"
            >
              Month
            </Button>
            <Button
              variant={selectedTimeframe === "semester" ? "default" : "outline"}
              onClick={() => setSelectedTimeframe("semester")}
              size="sm"
            >
              Semester
            </Button>
            <Button
              variant={selectedTimeframe === "all" ? "default" : "outline"}
              onClick={() => setSelectedTimeframe("all")}
              size="sm"
            >
              All Time
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Team Analytics</TabsTrigger>
            <TabsTrigger value="students">Student Performance</TabsTrigger>
            <TabsTrigger value="submissions">Submission Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-2">
                    <FontAwesomeIcon icon={faUsers} className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold">{stats.totalTeams}</div>
                  <p className="text-sm text-gray-500">Teams</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mb-2">
                    <FontAwesomeIcon
                      icon={faUserGraduate}
                      className="h-6 w-6"
                    />
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.totalStudents}
                  </div>
                  <p className="text-sm text-gray-500">Students</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 text-purple-600 mb-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.projectSubmissions}
                  </div>
                  <p className="text-sm text-gray-500">Submissions</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 mb-2">
                    <FontAwesomeIcon
                      icon={faClockRotateLeft}
                      className="h-6 w-6"
                    />
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.pendingReviews}
                  </div>
                  <p className="text-sm text-gray-500">Pending Reviews</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
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
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Submission Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={submissionStatusData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8">
                          {submissionStatusData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.recentActivities
                    ?.slice(0, 5)
                    .map((activity, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-500">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{activity.message}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(activity.timestamp), "PPp")}
                          </p>
                        </div>
                      </div>
                    ))}

                  {(!data?.recentActivities ||
                    data.recentActivities.length === 0) && (
                    <p className="text-center text-gray-500">
                      No recent activities
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Analytics Tab */}
          <TabsContent value="teams" className="space-y-6">
            {loadingTeamPerformance ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Team Performance Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={teamPerformance}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="submissions"
                            name="Submissions"
                            fill="#0088FE"
                          />
                          <Bar
                            dataKey="avgScore"
                            name="Avg Score"
                            fill="#00C49F"
                          />
                          <Bar
                            dataKey="onTimeRate"
                            name="On-time %"
                            fill="#FFBB28"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Team Engagement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {teamPerformance?.slice(0, 5).map((team, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{team.name}</span>
                              <span className="text-sm text-gray-500">
                                {team.engagementScore}%
                              </span>
                            </div>
                            <Progress
                              value={team.engagementScore}
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Project Completion Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Completed",
                                  value:
                                    teamPerformance?.filter(
                                      (t) => t.completionStatus === "completed"
                                    ).length || 0,
                                },
                                {
                                  name: "In Progress",
                                  value:
                                    teamPerformance?.filter(
                                      (t) =>
                                        t.completionStatus === "in_progress"
                                    ).length || 0,
                                },
                                {
                                  name: "Not Started",
                                  value:
                                    teamPerformance?.filter(
                                      (t) =>
                                        t.completionStatus === "not_started"
                                    ).length || 0,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              <Cell fill="#00C49F" />
                              <Cell fill="#FFBB28" />
                              <Cell fill="#FF8042" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Student Performance Tab */}
          <TabsContent value="students" className="space-y-6">
            {loadingStudentProgress ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Student Performance Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              range: "90-100",
                              count:
                                studentProgress?.filter(
                                  (s) => s.overallScore >= 90
                                ).length || 0,
                            },
                            {
                              range: "80-89",
                              count:
                                studentProgress?.filter(
                                  (s) =>
                                    s.overallScore >= 80 && s.overallScore < 90
                                ).length || 0,
                            },
                            {
                              range: "70-79",
                              count:
                                studentProgress?.filter(
                                  (s) =>
                                    s.overallScore >= 70 && s.overallScore < 80
                                ).length || 0,
                            },
                            {
                              range: "60-69",
                              count:
                                studentProgress?.filter(
                                  (s) =>
                                    s.overallScore >= 60 && s.overallScore < 70
                                ).length || 0,
                            },
                            {
                              range: "Below 60",
                              count:
                                studentProgress?.filter(
                                  (s) => s.overallScore < 60
                                ).length || 0,
                            },
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="count"
                            name="Number of Students"
                            fill="#8884d8"
                          >
                            <Cell fill="#00C49F" />
                            <Cell fill="#0088FE" />
                            <Cell fill="#FFBB28" />
                            <Cell fill="#FF8042" />
                            <Cell fill="#FF0000" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Top Performing Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {studentProgress
                          ?.sort((a, b) => b.overallScore - a.overallScore)
                          .slice(0, 5)
                          .map((student, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3"
                            >
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-grow">
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-gray-500">
                                  {student.teamName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">
                                  {student.overallScore}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  Overall Score
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Students Needing Attention
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {studentProgress
                          ?.sort((a, b) => a.overallScore - b.overallScore)
                          .slice(0, 5)
                          .map((student, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3"
                            >
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-red-600">!</span>
                              </div>
                              <div className="flex-grow">
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-gray-500">
                                  {student.teamName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">
                                  {student.overallScore}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  Overall Score
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Skill Area Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          outerRadius={90}
                          width={500}
                          height={300}
                          data={[
                            {
                              subject: "Technical Skills",
                              A:
                                studentProgress?.reduce(
                                  (sum, s) => sum + s.technicalScore,
                                  0
                                ) / (studentProgress?.length || 1),
                            },
                            {
                              subject: "Communication",
                              A:
                                studentProgress?.reduce(
                                  (sum, s) => sum + s.communicationScore,
                                  0
                                ) / (studentProgress?.length || 1),
                            },
                            {
                              subject: "Collaboration",
                              A:
                                studentProgress?.reduce(
                                  (sum, s) => sum + s.collaborationScore,
                                  0
                                ) / (studentProgress?.length || 1),
                            },
                            {
                              subject: "Problem Solving",
                              A:
                                studentProgress?.reduce(
                                  (sum, s) => sum + s.problemSolvingScore,
                                  0
                                ) / (studentProgress?.length || 1),
                            },
                            {
                              subject: "Time Management",
                              A:
                                studentProgress?.reduce(
                                  (sum, s) => sum + s.timeManagementScore,
                                  0
                                ) / (studentProgress?.length || 1),
                            },
                          ]}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar
                            name="Average Score"
                            dataKey="A"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Submission Trends Tab */}
          <TabsContent value="submissions" className="space-y-6">
            {loadingSubmissionTrends ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Submission Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={submissionTrends}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="Submissions"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Submission Quality Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Excellent",
                                  value:
                                    submissionTrends?.reduce(
                                      (sum, s) => sum + s.excellent,
                                      0
                                    ) || 0,
                                },
                                {
                                  name: "Good",
                                  value:
                                    submissionTrends?.reduce(
                                      (sum, s) => sum + s.good,
                                      0
                                    ) || 0,
                                },
                                {
                                  name: "Average",
                                  value:
                                    submissionTrends?.reduce(
                                      (sum, s) => sum + s.average,
                                      0
                                    ) || 0,
                                },
                                {
                                  name: "Poor",
                                  value:
                                    submissionTrends?.reduce(
                                      (sum, s) => sum + s.poor,
                                      0
                                    ) || 0,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              <Cell fill="#00C49F" />
                              <Cell fill="#0088FE" />
                              <Cell fill="#FFBB28" />
                              <Cell fill="#FF8042" />
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
                      <CardTitle className="text-base">
                        On-Time vs Late Submissions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: "On Time",
                                value:
                                  submissionTrends?.reduce(
                                    (sum, s) => sum + s.onTime,
                                    0
                                  ) || 0,
                              },
                              {
                                name: "Late",
                                value:
                                  submissionTrends?.reduce(
                                    (sum, s) => sum + s.late,
                                    0
                                  ) || 0,
                              },
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="value"
                              name="Submissions"
                              fill="#8884d8"
                            >
                              <Cell fill="#00C49F" />
                              <Cell fill="#FF8042" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Review Time Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={submissionTrends}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="averageReviewTime"
                            name="Avg. Review Time (days)"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SupervisorAnalytics;
