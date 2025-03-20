import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
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
    <div>
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
