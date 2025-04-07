// client/src/pages/StudentDashboard.jsx
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion } from 'framer-motion';
import { Book, Calendar, FileText, MessageSquare, TrendingUp, Users } from 'lucide-react';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { api } from "../lib/api";

const StudentDashboard = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/student");
      return response.data;
    },
  });

  if (isLoading) return <LoadingOverlay />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">Error</CardTitle>
            <CardDescription>
              {error.message || "Failed to load dashboard. Please try again later."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quickStats = [
    {
      label: 'Due Assignments',
      value: data?.deadlines?.length || '0',
      icon: Book,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    },
    {
      label: 'Team Messages',
      value: data?.unreadMessages || '0',
      icon: MessageSquare,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
      label: 'Project Progress',
      value: data?.projectProgress || '0%',
      icon: TrendingUp,
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    {
      label: 'Team Members',
      value: data?.teamMembers?.length || '0',
      icon: Users,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user.fullName}
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Here's what's happening with your projects
              </p>
            </div>
            <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-700">
              <AvatarImage src={user.profilePicture} alt={user.fullName} />
              <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {stat.label}
                      </p>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Project & Team Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Project Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Project Status
              </CardTitle>
              <CardDescription>
                Track your project milestones and deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.project ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{data.project.name}</h4>
                    <Badge variant={data.project.status === 'active' ? 'success' : 'warning'}>
                      {data.project.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Progress</span>
                      <span className="font-medium">{data.projectProgress}%</span>
                    </div>
                    <Progress value={data.projectProgress} />
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <h5 className="font-medium mb-2">Upcoming Deadlines</h5>
                    {data.deadlines?.length > 0 ? (
                      <ul className="space-y-3">
                        {data.deadlines.map((deadline) => (
                          <li key={deadline._id} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{deadline.name}</span>
                            </div>
                            <Badge variant="outline">{new Date(deadline.date).toLocaleDateString()}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming deadlines</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Project Assigned
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create or join a team to start your project
                  </p>
                  <Button>Create Team</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Team Members
              </CardTitle>
              <CardDescription>
                Your project team and communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.teamMembers?.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {data.teamMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <Avatar>
                          <AvatarImage src={member.profilePicture} alt={member.name} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" className="mr-2">Team Chat</Button>
                    <Button>Manage Team</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Team Members
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Join a team or invite members to your team
                  </p>
                  <Button>Find Team</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;