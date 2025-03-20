import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const TeamManagement = () => {
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get('/admin/teams');
      return response.data;
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (teamData) => {
      const response = await api.put(`/admin/teams/${teamData._id}`, teamData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      toast.success('Team updated successfully');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update team');
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId) => {
      const response = await api.delete(`/admin/teams/${teamId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      toast.success('Team deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete team');
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Team Management</h1>
        <button
          onClick={() => {
            setSelectedTeam(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Create New Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams?.map((team) => (
          <div
            key={team._id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold dark:text-white">
                {team.name}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedTeam(team);
                    setIsModalOpen(true);
                  }}
                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this team?')) {
                      deleteTeamMutation.mutate(team._id);
                    }
                  }}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Supervisor</p>
                <p className="text-sm font-medium dark:text-white">
                  {team.supervisors && team.supervisors.length > 0 ? team.supervisors[0].name : 'Not assigned'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Members ({team.members?.length || 0})</p>
                <div className="mt-1 space-y-1">
                  {team.members?.map((member) => (
                    <p key={member._id} className="text-sm dark:text-white">
                      {member.name}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                <p className="text-sm font-medium dark:text-white">
                  {team.projects && team.projects.length > 0 ? team.projects[0].title : 'No project assigned'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              {selectedTeam ? 'Edit Team' : 'Create Team'}
            </h2>
            {/* Add your form here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
