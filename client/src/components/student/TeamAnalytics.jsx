import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '../../lib/api';
import { format, subDays } from 'date-fns';

export const TeamAnalytics = ({ projectId }) => {
  const [stats, setStats] = useState(null);
  const [activityTrends, setActivityTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [statsResponse, activitiesResponse] = await Promise.all([
          api.get(`/api/projects/${projectId}/activities/stats`),
          api.get(`/api/projects/${projectId}/activities/trends`)
        ]);

        setStats(statsResponse.data);
        setActivityTrends(activitiesResponse.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [projectId]);

  if (isLoading) {
    return <div className="text-center">Loading analytics...</div>;
  }

  // Prepare data for activity type distribution chart
  const activityTypeData = stats?.activityTypes.map(type => ({
    type: type._id.replace('_', ' '),
    count: type.count
  })) || [];

  // Prepare data for member contribution chart
  const memberContributions = stats?.memberContributions.map(member => ({
    name: member.user.fullName,
    contributions: member.activityCount
  })) || [];

  // Calculate completion trends
  const completionTrends = activityTrends.map(day => ({
    date: format(new Date(day.date), 'MMM d'),
    completed: day.completedCount,
    total: day.totalCount,
    rate: ((day.completedCount / day.totalCount) * 100).toFixed(1)
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Activity Distribution</CardTitle>
            <CardDescription>Types of team activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityTypeData}>
                  <XAxis
                    dataKey="type"
                    tickFormatter={(value) => value.charAt(0).toUpperCase()}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Contributions</CardTitle>
            <CardDescription>Activity by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberContributions}>
                  <XAxis
                    dataKey="name"
                    tickFormatter={(value) => value.split(' ')[0]}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="contributions"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>Task completion trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionTrends}>
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="currentColor"
                    className="stroke-primary"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Details</CardTitle>
          <CardDescription>Last 30 days of team activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {stats?.recentActivities.map((activity) => (
              <div key={activity._id} className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium">
                    {activity.user.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.createdAt), 'PPp')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const getActivityIcon = (type) => {
  const icons = {
    milestone_created: '🎯',
    milestone_completed: '✅',
    milestone_updated: '📝',
    submission_created: '📤',
    feedback_received: '💬',
    member_joined: '👋',
    member_left: '👋',
    chat_message: '💭',
    file_uploaded: '📎'
  };

  return icons[type] || '📋';
};