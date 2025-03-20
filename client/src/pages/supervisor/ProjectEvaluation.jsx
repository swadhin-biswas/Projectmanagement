import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const ProjectEvaluation = () => {
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['supervisor-projects'],
    queryFn: async () => {
      const response = await api.get('/supervisor/projects');
      return response.data;
    },
  });

  const updateProjectScore = useMutation({
    mutationFn: async ({ projectId, score, feedback, status }) => {
      const response = await api.post(`/supervisor/projects/${projectId}/evaluate`, {
        score,
        feedback,
        status,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supervisor-projects']);
      toast.success('Project evaluation updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update project evaluation');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Evaluation</h1>

      <div className="grid grid-cols-1 gap-6">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {project.name}
                </h2>
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      project.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : project.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}
                  >
                    {project.status?.replace('_', ' ').toUpperCase() || 'Not Started'}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      project.score >= 80
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : project.score >= 60
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}
                  >
                    Score: {project.score || 'Not evaluated'}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Team</h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{project.team?.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{project.description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Feedback
                  </h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {project.feedback || 'No feedback provided'}
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    updateProjectScore.mutate({
                      projectId: project.id,
                      score: parseInt(formData.get('score')),
                      feedback: formData.get('feedback'),
                      status: formData.get('status'),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor={`status-${project.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Status
                    </label>
                    <select
                      name="status"
                      id={`status-${project.id}`}
                      defaultValue={project.status}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`score-${project.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Score
                    </label>
                    <input
                      type="number"
                      name="score"
                      id={`score-${project.id}`}
                      min="0"
                      max="100"
                      defaultValue={project.score}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`feedback-${project.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Feedback
                    </label>
                    <textarea
                      name="feedback"
                      id={`feedback-${project.id}`}
                      rows="3"
                      defaultValue={project.feedback}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updateProjectScore.isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {updateProjectScore.isLoading ? 'Updating...' : 'Update Evaluation'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectEvaluation;
