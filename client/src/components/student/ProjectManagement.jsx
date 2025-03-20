import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { studentService } from "../../services/api";

const ProjectManagement = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    category: "project", // Default to project
    team: "",
    supervisor: "",
  });
  const [currentProject, setCurrentProject] = useState(null);
  const [hasProject, setHasProject] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  // Check if the student's team has a project already
  useEffect(() => {
    if (user?.studentId) {
      fetchProjectData();
      // Fetch team members and supervisors (mock data for now)
      setTeamMembers([
        { id: "1", fullName: "Team Member 1" },
        { id: "2", fullName: "Team Member 2" },
      ]);
      setSupervisors([
        { id: "101", fullName: "Dr. Smith" },
        { id: "102", fullName: "Prof. Johnson" },
      ]);
    }
  }, [user]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      // Mock fetching project data
      // In a real app, you'd have a specific endpoint for this
      setHasProject(false); // This would be determined by your API
      setCurrentProject(null); // This would come from your API
      setLoading(false);
    } catch (error) {
      console.error("Error fetching project data:", error);
      setError("Failed to load project data");
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await studentService.createProject(projectData);
      setSuccess("Project created successfully!");
      setHasProject(true);
      setCurrentProject(response); // Assuming response contains project details
      setProjectData({
        title: "",
        description: "",
        category: "project",
        team: "",
        supervisor: "",
      });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Project Management</h2>

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

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : hasProject ? (
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-3">
            {currentProject?.title || "Your Project"}
          </h3>

          <div className="mb-4">
            <p className="font-medium">Category:</p>
            <p>
              {currentProject?.category === "research"
                ? "Research Project"
                : "Course Project"}
            </p>
          </div>

          <div className="mb-4">
            <p className="font-medium">Description:</p>
            <p className="mt-1">
              {currentProject?.description || "No description provided"}
            </p>
          </div>

          <div className="mb-4">
            <p className="font-medium">Status:</p>
            <span
              className={`inline-block px-2 py-1 text-xs rounded ${
                currentProject?.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : currentProject?.status === "in-progress"
                  ? "bg-blue-100 text-blue-800"
                  : currentProject?.status === "proposed"
                  ? "bg-yellow-100 text-yellow-800"
                  : currentProject?.status === "completed"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {currentProject?.status || "Unknown"}
            </span>
          </div>

          <div className="mb-4">
            <p className="font-medium">Supervisor:</p>
            <p>{currentProject?.supervisor?.fullName || "Not assigned"}</p>
          </div>

          <div>
            <p className="font-medium">Team Members:</p>
            {currentProject?.team?.members?.length > 0 ? (
              <ul className="list-disc list-inside mt-1">
                {currentProject.team.members.map((member, index) => (
                  <li key={index}>{member.fullName || "Unknown Member"}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 mt-1">No team members listed</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-semibold mb-4">Create a New Project</h3>
          <form onSubmit={handleCreateProject}>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="projectTitle"
              >
                Project Title
              </label>
              <input
                type="text"
                id="projectTitle"
                value={projectData.title}
                onChange={(e) =>
                  setProjectData({ ...projectData, title: e.target.value })
                }
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="projectCategory"
              >
                Project Category
              </label>
              <select
                id="projectCategory"
                value={projectData.category}
                onChange={(e) =>
                  setProjectData({ ...projectData, category: e.target.value })
                }
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="project">Course Project</option>
                <option value="research">Research Project</option>
              </select>
            </div>

            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="projectDescription"
              >
                Project Description
              </label>
              <textarea
                id="projectDescription"
                value={projectData.description}
                onChange={(e) =>
                  setProjectData({
                    ...projectData,
                    description: e.target.value,
                  })
                }
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="4"
                required
              ></textarea>
            </div>

            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="supervisorSelect"
              >
                Supervisor
              </label>
              <select
                id="supervisorSelect"
                value={projectData.supervisor}
                onChange={(e) =>
                  setProjectData({ ...projectData, supervisor: e.target.value })
                }
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select a supervisor</option>
                {supervisors.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <p className="block text-gray-700 text-sm font-bold mb-2">
                Team Members
              </p>
              <div className="bg-gray-100 p-4 rounded">
                {teamMembers.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {teamMembers.map((member) => (
                      <li key={member.id}>{member.fullName}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">
                    No team members available. Please create or join a team
                    first.
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || teamMembers.length === 0}
                className={`${
                  teamMembers.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-700"
                } text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
