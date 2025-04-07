import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Bell } from 'lucide-react';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext.jsx';

export const CalendarNotifications = ({ projectId }) => {
  const { socket } = useWebSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    // Listen for calendar event reminders
    socket.on('reminder:event', (data) => {
      const { event, minutesBefore } = data;

      toast({
        title: `Event Reminder: ${event.title}`,
        description: `Starting in ${minutesBefore} minutes - ${format(new Date(event.date), 'h:mm a')}`,
        action: {
          label: 'View',
          onClick: () => navigate(`/projects/${projectId}/calendar`),
        },
        icon: <Bell className="h-4 w-4" />,
        duration: 10000
      });
    });

    // Listen for event responses
    socket.on('calendar:response', (data) => {
      const { event, user, status } = data;

      toast({
        title: 'Event Response',
        description: `${user.fullName} has ${status} the event`,
        duration: 5000
      });
    });

    return () => {
      socket.off('reminder:event');
      socket.off('calendar:response');
    };
  }, [socket, projectId, toast, navigate]);

  // This is a headless component that only handles notifications
  return null;
};