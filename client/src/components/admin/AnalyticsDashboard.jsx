import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  PieChart
} from 'recharts';
import { api } from '../../lib/api';
import LoadingSpinner from '../LoadingSpinner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard = () => {
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/overview');
      return response.data;
    },
  });

  const { data: teamStats, isLoading: isTeamLoading } = useQuery({
    queryKey: ['team-stats'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/teams');
      return response.data;
    },
  });

  const { data: submissionStats, isLoading: isSubmissionLoading } = useQuery({
    queryKey: ['submission-stats'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/submissions');
      return response.data;
    },
  });

  const { data: performanceMetrics, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/performance');
      return response.data;
    },
  });

  if (isOverviewLoading || isTeamLoading || isSubmissionLoading || isPerformanceLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const userDistribution = overviewData?.userStats?.roles
    ? Object.entries(overviewData.userStats.roles).map(([role, count]) => ({
        name: role.charAt(0).toUpperCase() + role.slice(1),
        value: count,
      }))
    : [];

  const sessionProgress = overviewData?.currentSession
    ? [
        {
          name: 'Completed',
          value: overviewData.currentSession.progress,
        },
        {
          name: 'Remaining',
          value: 100 - overviewData.currentSession.progress,
        },
      ]
    : [];

  const projectStatusData = teamStats?.projectStats
    ? Object.entries(teamStats.projectStats).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        count,
      }))
    : [];

  const submissionTimeline = submissionStats?.timeline
    ? Object.entries(submissionStats.timeline).map(([date, count]) => ({
        date,
        submissions: count,
      }))
    : [];

  const renderSupervisorMetrics = () => (
    <Card className="bg-white dark:bg-gray-800 p-6">
      <h3 className="text-lg font-semibold mb-4">Supervisor Management</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Active Supervisors</h4>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold">{data.supervisors.active}</p>
              <p className="text-sm text-gray-500">Total Active</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-yellow-500">{data.supervisors.pending}</p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
          <ProgressBar
            value={data.supervisors.workloadDistribution.averageLoad}
            max={data.session?.supervisorCapacity || 5}
            className="mb-2"
          />
          <p className="text-sm text-gray-500">Average Workload</p>
        </div>
        <div>
          <h4 className="font-medium mb-2">Workload Distribution</h4>
          <div className="space-y-2">
            {data.supervisors.workloadDistribution.summary.map((item) => (
              <div key={item.range} className="flex justify-between items-center">
                <span className="text-sm">{item.range} Teams</span>
                <span className="text-sm font-medium">{item.count} supervisors</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderDeadlineProgress = () => (
    <Card className="bg-white dark:bg-gray-800 p-6">
      <h3 className="text-lg font-semibold mb-4">Session Progress & Deadlines</h3>
      <div className="space-y-4">
        {data.deadlines.map((deadline) => (
          <div key={deadline._id} className="border-b pb-4 last:border-0">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="font-medium">{deadline.title}</h4>
                <p className="text-sm text-gray-500">
                  {new Date(deadline.dueDate).toLocaleDateString()}
                </p>
              </div>
              <Badge
                variant={deadline.isPast ? "destructive" : "success"}
                className="ml-2"
              >
                {deadline.isPast ? "Past Due" : `${deadline.daysRemaining} days left`}
              </Badge>
            </div>
            <ProgressBar
              value={deadline.isPast ? 100 : 100 - (deadline.daysRemaining / deadline.totalDays) * 100}
              className="h-2"
            />
          </div>
        ))}
      </div>
    </Card>
  );

  const renderProjectStats = () => (
    <Card className="bg-white dark:bg-gray-800 p-6">
      <h3 className="text-lg font-semibold mb-4">Project Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-2">Project Types</h4>
          <PieChart
            data={Object.entries(data.projects.typeDistribution).map(([type, count]) => ({
              name: type,
              value: count
            }))}
            width={200}
            height={200}
          />
        </div>
        <div>
          <h4 className="font-medium mb-2">Status Distribution</h4>
          <div className="space-y-4">
            {Object.entries(data.projects.statusDistribution).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{status}</span>
                  <span>{count}</span>
                </div>
                <ProgressBar
                  value={(count / data.projects.total) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderTeamAnalytics = () => (
    <Card className="bg-white dark:bg-gray-800 p-6">
      <h3 className="text-lg font-semibold mb-4">Team Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-2">Team Size Distribution</h4>
          <BarChart
            data={[
              { size: "1 Member", count: data.teams.sizeDistribution.size1 },
              { size: "2 Members", count: data.teams.sizeDistribution.size2 },
              { size: "3 Members", count: data.teams.sizeDistribution.size3 },
              { size: "4 Members", count: data.teams.sizeDistribution.size4 }
            ]}
            width={300}
            height={200}
          />
        </div>
        <div>
          <h4 className="font-medium mb-2">Supervisor Assignment</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>With Supervisor</span>
                <span>{data.teams.withSupervisor}</span>
              </div>
              <ProgressBar
                value={(data.teams.withSupervisor / data.teams.total) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Without Supervisor</span>
                <span>{data.teams.withoutSupervisor}</span>
              </div>
              <ProgressBar
                value={(data.teams.withoutSupervisor / data.teams.total) * 100}
                className="h-2 bg-yellow-200"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSupervisorMetrics()}
        {renderDeadlineProgress()}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderProjectStats()}
        {renderTeamAnalytics()}
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-full text-white text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
