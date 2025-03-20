import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data;
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Users</h3>
          <p className="text-2xl font-bold mt-2 dark:text-white">{stats?.totalUsers || 0}</p>
        </div>

        {/* Students Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Students</h3>
          <p className="text-2xl font-bold mt-2 dark:text-white">{stats?.totalStudents || 0}</p>
        </div>

        {/* Supervisors Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Supervisors</h3>
          <p className="text-2xl font-bold mt-2 dark:text-white">{stats?.totalSupervisors || 0}</p>
        </div>

        {/* Projects Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Projects</h3>
          <p className="text-2xl font-bold mt-2 dark:text-white">{stats?.activeProjects || 0}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Recent Activity</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats?.recentActivity?.map((activity, index) => (
              <div key={index} className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">{activity.description}</p>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
