import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

const TeamView = () => {
  const { data: team, isLoading } = useQuery({
    queryKey: ['student-team'],
    queryFn: async () => {
      const response = await api.get('api/student/team');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Team Assigned</h1>
        <p className="text-gray-600 dark:text-gray-400">
          You haven't been assigned to a team yet. Please contact your supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Details</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6">
          {/* Team Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{team.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Created on {new Date(team.createdAt).toLocaleDateString()}
              </p>
            </div>
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

          {/* Team Members */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {team.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {member.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {member.email}
                    </p>
                  </div>
                  <div
                    className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                      member.role === 'leader'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                    }`}
                  >
                    {member.role?.charAt(0).toUpperCase() + member.role?.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Performance */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Team Performance
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supervisor Feedback
                  </h4>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {team.feedback || 'No feedback provided yet'}
                  </p>
                </div>

                {team.evaluations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Evaluation History
                    </h4>
                    <div className="mt-2 space-y-2">
                      {team.evaluations.map((evaluation, index) => (
                        <div
                          key={index}
                          className="text-sm text-gray-600 dark:text-gray-400 flex justify-between items-center"
                        >
                          <span>{new Date(evaluation.date).toLocaleDateString()}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              evaluation.score >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : evaluation.score >= 60
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                            }`}
                          >
                            Score: {evaluation.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Team Schedule */}
          {team.meetings?.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Upcoming Meetings
              </h3>
              <div className="space-y-2">
                {team.meetings.map((meeting, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {meeting.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{meeting.description}</p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(meeting.date).toLocaleString()}
                    </p>
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

export default TeamView;
