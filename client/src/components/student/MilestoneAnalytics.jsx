import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import React from 'react';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export const MilestoneAnalytics = ({ milestones = [] }) => {
  // Calculate overall project progress
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const progressPercentage = totalMilestones ? (completedMilestones / totalMilestones) * 100 : 0;

  // Calculate milestone status distribution
  const statusCounts = {
    completed: completedMilestones,
    in_progress: milestones.filter(m => m.status === 'in_progress').length,
    pending: milestones.filter(m => m.status === 'pending').length,
  };

  // Analyze milestone deadlines
  const now = new Date();
  const deadlineStatus = {
    upcoming: milestones.filter(m => isBefore(now, new Date(m.dueDate))).length,
    dueToday: milestones.filter(m => isToday(new Date(m.dueDate))).length,
    overdue: milestones.filter(m =>
      isAfter(now, new Date(m.dueDate)) && m.status !== 'completed'
    ).length,
  };

  // Chart data for milestone completion over time
  const weeklyProgress = milestones
    .filter(m => m.status === 'completed')
    .reduce((acc, milestone) => {
      const week = format(new Date(milestone.completedAt), 'yyyy-ww');
      acc[week] = (acc[week] || 0) + 1;
      return acc;
    }, {});

  const progressChartData = Object.entries(weeklyProgress).map(([week, count]) => ({
    week: `Week ${week.split('-')[1]}`,
    completed: count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              {completedMilestones} of {totalMilestones} milestones completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {progressPercentage.toFixed(0)}% complete
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestone Status</CardTitle>
            <CardDescription>Current distribution of milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deadline Overview</CardTitle>
            <CardDescription>Status of milestone deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Upcoming</span>
                <span className="text-sm font-medium">{deadlineStatus.upcoming}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Due Today</span>
                <span className="text-sm font-medium text-orange-500">
                  {deadlineStatus.dueToday}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Overdue</span>
                <span className="text-sm font-medium text-red-500">
                  {deadlineStatus.overdue}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completion Trend</CardTitle>
          <CardDescription>Weekly milestone completion rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressChartData}>
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="completed"
                  fill="currentColor"
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};