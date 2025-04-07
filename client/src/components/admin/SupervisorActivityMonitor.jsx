import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import {
    Badge,
    Card,
    ProgressBar,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '../ui';

export const SupervisorActivityMonitor = ({ supervisorId }) => {
  const [activeTab, setActiveTab] = React.useState('progress');

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['supervisor-activity', supervisorId],
    queryFn: async () => {
      const response = await api.get(`/api/admin/supervisor/${supervisorId}/activity`);
      return response.data;
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to fetch supervisor activity');
    }
  });

  const { data: progressData } = useQuery({
    queryKey: ['supervisor-progress-tracking', supervisorId],
    queryFn: async () => {
      const response = await api.get(`/api/admin/supervisor/${supervisorId}/progress-tracking`);
      return response.data;
    }
  });

  const { data: markingData } = useQuery({
    queryKey: ['supervisor-marking', supervisorId],
    queryFn: async () => {
      const response = await api.get(`/api/admin/supervisor/${supervisorId}/marking`);
      return response.data;
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const renderProgressTracking = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Progress Tracking Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Student Progress Tracking</h4>
            <ProgressBar
              value={progressData?.trackingMetrics.studentTracking.trackingPercentage || 0}
              max={100}
              className="mb-2"
            />
            <p className="text-sm text-gray-500">
              {progressData?.trackingMetrics.studentTracking.tracked} of {progressData?.trackingMetrics.studentTracking.total} students tracked
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Team Progress Tracking</h4>
            <ProgressBar
              value={progressData?.trackingMetrics.teamTracking.trackingPercentage || 0}
              max={100}
              className="mb-2"
            />
            <p className="text-sm text-gray-500">
              {progressData?.trackingMetrics.teamTracking.tracked} of {progressData?.trackingMetrics.teamTracking.total} teams tracked
            </p>
          </div>
        </div>
      </Card>

      {progressData?.gaps?.studentsWithoutTracking.length > 0 && (
        <Card className="p-6 border-l-4 border-yellow-400">
          <h4 className="font-medium mb-2">Students Without Tracking</h4>
          <div className="space-y-2">
            {progressData.gaps.studentsWithoutTracking.map((student) => (
              <div key={student.studentId} className="flex items-center justify-between">
                <span>{student.studentName}</span>
                <Badge variant="outline">{student.team.name}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const renderMarkingActivity = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Marking Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Quality Metrics</h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>With Feedback</span>
                  <span>{Math.round(markingData?.markingMetrics.qualityMetrics.percentWithFeedback || 0)}%</span>
                </div>
                <ProgressBar
                  value={markingData?.markingMetrics.qualityMetrics.percentWithFeedback || 0}
                  max={100}
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>With Breakdown</span>
                  <span>{Math.round(markingData?.markingMetrics.qualityMetrics.percentWithBreakdown || 0)}%</span>
                </div>
                <ProgressBar
                  value={markingData?.markingMetrics.qualityMetrics.percentWithBreakdown || 0}
                  max={100}
                  className="h-2"
                />
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Statistics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Marks Given</span>
                <span className="font-medium">{markingData?.markingMetrics.totalMarks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Marks per Student</span>
                <span className="font-medium">{Math.round(markingData?.markingMetrics.marksPerStudent || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Coverage</span>
                <span className="font-medium">{Math.round(markingData?.markingMetrics.markingCoverage || 0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {markingData?.gaps?.incompleteCategories.length > 0 && (
        <Card className="p-6 border-l-4 border-yellow-400">
          <h4 className="font-medium mb-2">Missing Assessment Categories</h4>
          <div className="space-y-2">
            {markingData.gaps.incompleteCategories.map((item) => (
              <div key={item.studentId} className="flex items-center justify-between">
                <span>{item.studentName}</span>
                <div className="flex gap-2">
                  {item.missingCategories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const renderRecommendations = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Improvement Recommendations</h3>
      <div className="space-y-4">
        {[...(progressData?.recommendations || []), ...(markingData?.recommendations || [])].map((recommendation, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="mt-1">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p>{recommendation}</p>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          <TabsTrigger value="marking">Marking Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="progress">
          {renderProgressTracking()}
        </TabsContent>
        <TabsContent value="marking">
          {renderMarkingActivity()}
        </TabsContent>
      </Tabs>
      {renderRecommendations()}
    </div>
  );
};