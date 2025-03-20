import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const TeamEvaluation = () => {
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['supervisor-teams'],
    queryFn: async () => {
      const response = await api.get('/supervisor/teams');
      return response.data;
    },
  });

  const updateTeamScore = useMutation({
    mutationFn: async ({ teamId, score, feedback }) => {
      const response = await api.post(`/supervisor/teams/${teamId}/evaluate`, {
        score,
        feedback,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supervisor-teams']);
      toast.success('Team evaluation updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update team evaluation');
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Evaluation</h1>

      <div className="grid grid-cols-1 gap-6">
        {teams?.map((team) => (
          <div
            key={team.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{team.name}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    team.score >= 80
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : team.score >= 60
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  }`}
                >
                  Score: {team.score || 'Not evaluated'}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Members</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {team.members?.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      >
                        {member.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Feedback
                  </h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{team.feedback || 'No feedback provided'}</p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    updateTeamScore.mutate({
                      teamId: team.id,
                      score: parseInt(formData.get('score')),
                      feedback: formData.get('feedback'),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor={`score-${team.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Score
                    </label>
                    <input
                      type="number"
                      name="score"
                      id={`score-${team.id}`}
                      min="0"
                      max="100"
                      defaultValue={team.score}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`feedback-${team.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Feedback
                    </label>
                    <textarea
                      name="feedback"
                      id={`feedback-${team.id}`}
                      rows="3"
                      defaultValue={team.feedback}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updateTeamScore.isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {updateTeamScore.isLoading ? 'Updating...' : 'Update Evaluation'}
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

export default TeamEvaluation;
