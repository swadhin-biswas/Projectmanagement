import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ProjectManagement = () => {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/admin/projects');
      return response.data;
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (projectData) => {
      const response = await api.put(`/admin/projects/${projectData.id}`, projectData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project updated successfully');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update project');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      const response = await api.delete(`/admin/projects/${projectId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Project Management</h1>
        <button
          onClick={() => {
            setSelectedProject(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Add New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold dark:text-white">
                  {project.title}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setIsModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this project?')) {
                        deleteProjectMutation.mutate(project.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {project.description}
                </p>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      project.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Team</p>
                  <p className="text-sm font-medium dark:text-white">
                    {project.team?.name || 'Not assigned'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Deadline</p>
                  <p className="text-sm font-medium dark:text-white">
                    {project.deadline
                      ? new Date(project.deadline).toLocaleDateString()
                      : 'No deadline set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Progress: {project.progress || 0}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              {selectedProject ? 'Edit Project' : 'Create Project'}
            </h2>
            {/* Add your form here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
