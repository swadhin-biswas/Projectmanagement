import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/LoadingSpinner";
import { api } from "../../lib/api";

const ProjectSubmission = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    githubUrl: "",
    deployedUrl: "",
    notes: "",
  });

  // Improved error handling in query
  const {
    data: projectData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["student-project"],
    queryFn: async () => {
      try {
        const response = await api.get("/student/project");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch project:", error);
        return { success: false, data: null };
      }
    },
    retry: 2,
    onError: (error) => {
      toast.error("Failed to load project information");
    },
  });

  const project = projectData?.data || null;
  const submissions = project?.submissions || [];

  const submitProject = useMutation({
    mutationFn: async (data) => {
      try {
        const response = await api.post(
          `/student/project/${data.projectId}/submit`,
          data
        );
        return response.data;
      } catch (error) {
        console.error("Submission error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["student-project"]);
      toast.success("Project submitted successfully");
      setFormData({
        title: "",
        description: "",
        githubUrl: "",
        deployedUrl: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to submit project");
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return toast.error("Title is required");
    }

    if (!formData.githubUrl.trim()) {
      return toast.error("GitHub URL is required");
    }

    // Validate GitHub URL format
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
    if (!githubRegex.test(formData.githubUrl)) {
      return toast.error("Please enter a valid GitHub repository URL");
    }

    if (project && project._id) {
      submitProject.mutate({
        projectId: project._id,
        ...formData,
      });
    } else {
      toast.error("No project found to submit to");
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-300">
            Error loading project
          </h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 rounded-md text-red-700 dark:text-red-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
          <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-300">
            No Project Found
          </h2>
          <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
            You need to create or join a project before submitting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Display project information */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">
          Project: {project?.name || "My Project"}
        </h1>

        {/* Previous submissions */}
        {submissions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Previous Submissions</h2>
            <div className="space-y-4">
              {submissions.map((submission, index) => (
                <div
                  key={submission._id || index}
                  className="border rounded-md p-4 dark:border-gray-700"
                >
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium">{submission.title}</h4>
                    <span className="text-sm text-gray-500">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{submission.description}</p>
                  <div className="text-sm">
                    <a
                      href={submission.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline mr-4"
                    >
                      GitHub Repository
                    </a>
                    {submission.deployedUrl && (
                      <a
                        href={submission.deployedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Deployed Version
                      </a>
                    )}
                  </div>

                  {submission.feedback && (
                    <div className="mt-3 pt-3 border-t dark:border-gray-700">
                      <h5 className="font-medium mb-1">Feedback</h5>
                      <p className="text-sm">{submission.feedback.comment}</p>
                      <p className="text-sm mt-1">
                        Score: {submission.feedback.marks}/
                        {submission.feedback.outOf}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Submit Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Submission Title*
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="e.g., Final Project Submission"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Brief description of your submission"
              rows="3"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              GitHub URL*
            </label>
            <input
              type="url"
              name="githubUrl"
              value={formData.githubUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="https://github.com/username/repo"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Deployed URL (if applicable)
            </label>
            <input
              type="url"
              name="deployedUrl"
              value={formData.deployedUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="https://yourproject.netlify.app"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Any additional information for your supervisor"
              rows="3"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              disabled={submitProject.isLoading}
            >
              {submitProject.isLoading ? "Submitting..." : "Submit Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectSubmission;
