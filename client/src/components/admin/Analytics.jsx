import React from 'react';
import { Card } from '../ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Analytics = ({ data }) => {
  const {
    teamStats,
    projectStats,
    submissionStats,
    studentStats
  } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Overview Cards */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Total Teams</h3>
          <p className="text-3xl font-bold text-blue-600">{teamStats.total}</p>
          <p className="text-sm text-gray-500 mt-2">
            Active: {teamStats.active} | Inactive: {teamStats.inactive}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Projects</h3>
          <p className="text-3xl font-bold text-green-600">{projectStats.total}</p>
          <p className="text-sm text-gray-500 mt-2">
            Completed: {projectStats.completed}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Submissions</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {submissionStats.total}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            On Time: {submissionStats.onTime}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Students</h3>
          <p className="text-3xl font-bold text-purple-600">
            {studentStats.total}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Active: {studentStats.active}
          </p>
        </Card>
      </div>

      {/* Project Status Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Project Status</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectStats.byStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Submission Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Submission Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={submissionStats.distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {submissionStats.distribution.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
