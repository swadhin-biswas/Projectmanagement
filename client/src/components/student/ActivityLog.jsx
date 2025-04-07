import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { api } from '../../lib/api';

export const ActivityLog = ({ projectId }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { socket } = useWebSocket();

  const fetchActivities = async (pageNum) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/projects/${projectId}/activities`, {
        params: { page: pageNum, limit: 20 }
      });

      const newActivities = response.data.activities;
      setActivities(prev => [...prev, ...newActivities]);
      setHasMore(newActivities.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { containerRef } = useInfiniteScroll({
    onLoadMore: () => {
      if (!isLoading && hasMore) {
        fetchActivities(page + 1);
      }
    },
    hasMore,
    isLoading
  });

  useEffect(() => {
    fetchActivities(1);
  }, [projectId]);

  useEffect(() => {
    if (socket) {
      socket.emit('join', `project:${projectId}:activities`);

      socket.on('activity:new', (activity) => {
        setActivities(prev => [activity, ...prev]);
      });

      return () => {
        socket.emit('leave', `project:${projectId}:activities`);
        socket.off('activity:new');
      };
    }
  }, [socket, projectId]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'milestone_created':
        return '🎯';
      case 'milestone_completed':
        return '✅';
      case 'milestone_updated':
        return '📝';
      case 'submission_created':
        return '📤';
      case 'feedback_received':
        return '💬';
      case 'member_joined':
        return '👋';
      case 'chat_message':
        return '💭';
      default:
        return '📋';
    }
  };

  return (
    <div className="bg-background border rounded-lg">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Activity Log</h3>
      </div>
      <ScrollArea ref={containerRef} className="h-[400px]">
        <div className="p-4 space-y-4">
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="flex items-start gap-3 text-sm"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user?.profilePicture} />
                <AvatarFallback>
                  {getActivityIcon(activity.type)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {activity.user?.fullName}
                  </span>{' '}
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={activity.createdAt}>
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true
                    })}
                  </time>
                  <span>•</span>
                  <span>
                    {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading more activities...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};