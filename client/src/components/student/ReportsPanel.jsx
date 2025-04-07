import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { BookOpen, BarChart as ChartIcon, Clock, TrendingUp } from "lucide-react";
import React, { useContext, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { studentService } from "../../services/api";

const ReportsPanel = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reportData, setReportData] = useState({
    title: "",
    fileUrl: "",
    projectId: "",
  });
  const [projects, setProjects] = useState([]);
  const [submittedReports, setSubmittedReports] = useState([]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['studentStats'],
    queryFn: () => api.get('/api/student/stats')
  });

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  // Mock data for demonstration
  const activityData = [
    { month: 'Jan', submissions: 4, meetings: 2 },
    { month: 'Feb', submissions: 3, meetings: 4 },
    { month: 'Mar', submissions: 5, meetings: 3 },
    { month: 'Apr', submissions: 2, meetings: 5 },
  ];

  const progressData = [
    { week: 'Week 1', progress: 25 },
    { week: 'Week 2', progress: 45 },
    { week: 'Week 3', progress: 65 },
    { week: 'Week 4', progress: 85 },
  ];

  useEffect(() => {
    if (user?.studentId) {
      fetchProjects();
      fetchSubmittedReports();
    }
  }, [user]);

  const fetchProjects = async () => {
    // Mock data - in a real application, you'd fetch this from your API
    setProjects([
      { id: "1", title: "Final Year Project" },
      { id: "2", title: "Research Paper" },
    ]);
  };

  const fetchSubmittedReports = async () => {
    // Mock data - in a real application, you'd fetch this from your API
    setSubmittedReports([
      {
        id: "101",
        title: "Progress Report 1",
        submittedAt: "2025-02-10T12:30:00Z",
        feedback: "Good progress. Keep up the momentum.",
        grade: 85,
      },
      {
        id: "102",
        title: "Literature Review",
        submittedAt: "2025-03-01T15:45:00Z",
        feedback: null,
        grade: null,
      },
    ]);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await studentService.submitReport(reportData);
      setSuccess("Report submitted successfully!");
      setReportData({
        title: "",
        fileUrl: "",
        projectId: "",
      });
      fetchSubmittedReports(); // Refresh the reports list
    } catch (error) {
      setError(error.response?.data?.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <Card className="border-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Project Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-blue-600">85%</div>
                <Progress value={85} className="bg-blue-100 dark:bg-blue-950">
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: '85%' }} />
                </Progress>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall completion rate</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card className="border-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-green-600">A+</div>
                <Badge className="bg-green-500">Excellent</Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current grade standing</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
          <Card className="border-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-amber-500" />
                Upcoming Deadline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-xl font-semibold text-amber-600">Final Submission</div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                  {format(new Date('2025-05-15'), 'MMM dd, yyyy')}
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">9 days remaining</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.4 }}>
          <Card className="border-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ChartIcon className="w-5 h-5 text-purple-500" />
                Activity Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-purple-600">92</div>
                <Progress value={92} className="bg-purple-100 dark:bg-purple-950">
                  <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '92%' }} />
                </Progress>
                <p className="text-sm text-gray-600 dark:text-gray-400">Based on participation</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div {...fadeIn} transition={{ delay: 0.5 }}>
          <Card className="border-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
            <CardHeader>
              <CardTitle>Monthly Activity</CardTitle>
              <CardDescription>Submissions and team meetings overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300/20" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar dataKey="submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meetings" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.6 }}>
          <Card className="border-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
            <CardHeader>
              <CardTitle>Progress Trend</CardTitle>
              <CardDescription>Weekly progress monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300/20" />
                    <XAxis dataKey="week" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="progress"
                      stroke="url(#progressGradient)"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <h2 className="text-2xl font-semibold mb-6">Reports</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Submit a New Report</h3>
        <form onSubmit={handleSubmitReport}>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="reportTitle"
            >
              Report Title
            </label>
            <input
              type="text"
              id="reportTitle"
              value={reportData.title}
              onChange={(e) =>
                setReportData({ ...reportData, title: e.target.value })
              }
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="reportFile"
            >
              Report File URL
            </label>
            <input
              type="text"
              id="reportFile"
              value={reportData.fileUrl}
              onChange={(e) =>
                setReportData({ ...reportData, fileUrl: e.target.value })
              }
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="https://drive.google.com/your-file"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Please upload your document to Google Drive or another file
              sharing service and paste the URL here.
            </p>
          </div>

          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="projectSelect"
            >
              Project
            </label>
            <select
              id="projectSelect"
              value={reportData.projectId}
              onChange={(e) =>
                setReportData({ ...reportData, projectId: e.target.value })
              }
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Submitted Reports</h3>

        {submittedReports.length === 0 ? (
          <p className="text-gray-500">
            You haven't submitted any reports yet.
          </p>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Report Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Submitted Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submittedReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(report.submittedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          report.feedback
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {report.feedback ? "Reviewed" : "Pending Review"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.grade !== null ? `${report.grade}/100` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPanel;
