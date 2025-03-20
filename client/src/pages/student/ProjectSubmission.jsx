import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const ProjectSubmission = () => {
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['student-project'],
    queryFn: async () => {
      const response = await api.get('/student/project');
      return response.data;
    },
  });

  const submitProject = useMutation({
    mutationFn: async ({ title, description, githubUrl, deployedUrl, notes }) => {
      const response = await api.post('/student/project/submit', {
        title,
        description,
        githubUrl,
        deployedUrl,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['student-project']);
      toast.success('Project submitted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit project');
    },
  });

  const updateSubmission = useMutation({
    mutationFn: async ({ submissionId, title, description, githubUrl, deployedUrl, notes }) => {
      const response = await api.put(`/student/project/submissions/${submissionId}`, {
        title,
        description,
        githubUrl,
        deployedUrl,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['student-project']);
      toast.success('Submission updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update submission');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Project Assigned</h1>
        <p className="text-gray-600 dark:text-gray-400">
          You haven't been assigned to a project yet. Please contact your supervisor.
        </p>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      githubUrl: formData.get('githubUrl'),
      deployedUrl: formData.get('deployedUrl'),
      notes: formData.get('notes'),
    };

    if (project.latestSubmission?.id) {
      updateSubmission.mutate({ submissionId: project.latestSubmission.id, ...data });
    } else {
      submitProject.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Submission</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6">
          {/* Project Details */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Details</h2>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Name</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">{project.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">{project.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleDateString()
                    : 'No deadline set'}
                </p>
              </div>
            </div>
          </div>

          {/* Submission Form */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {project.latestSubmission ? 'Update Submission' : 'Submit Project'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  defaultValue={project.latestSubmission?.title}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows="4"
                  required
                  defaultValue={project.latestSubmission?.description}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="githubUrl"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  GitHub URL
                </label>
                <input
                  type="url"
                  name="githubUrl"
                  id="githubUrl"
                  required
                  defaultValue={project.latestSubmission?.githubUrl}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="deployedUrl"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Deployed URL (if applicable)
                </label>
                <input
                  type="url"
                  name="deployedUrl"
                  id="deployedUrl"
                  defaultValue={project.latestSubmission?.deployedUrl}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows="3"
                  defaultValue={project.latestSubmission?.notes}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitProject.isLoading || updateSubmission.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submitProject.isLoading || updateSubmission.isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : project.latestSubmission ? (
                    'Update Submission'
                  ) : (
                    'Submit Project'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Submission History */}
          {project.submissions?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Submission History
              </h2>
              <div className="space-y-4">
                {project.submissions.map((submission, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {submission.title}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {submission.description}
                    </p>
                    <div className="flex space-x-4">
                      <a
                        href={submission.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                      >
                        View on GitHub
                      </a>
                      {submission.deployedUrl && (
                        <a
                          href={submission.deployedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                          View Deployment
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSubmission;
