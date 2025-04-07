import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isSameDay } from 'date-fns';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { api } from '../../lib/api';

export const TeamCalendar = ({ projectId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (socket) {
      socket.emit('join', `project:${projectId}:calendar`);

      socket.on('calendar:event_added', (event) => {
        setEvents(prev => [...prev, event]);
      });

      socket.on('calendar:event_updated', (updatedEvent) => {
        setEvents(prev =>
          prev.map(event =>
            event._id === updatedEvent._id ? updatedEvent : event
          )
        );
      });

      socket.on('calendar:event_deleted', (eventId) => {
        setEvents(prev => prev.filter(event => event._id !== eventId));
      });

      return () => {
        socket.emit('leave', `project:${projectId}:calendar`);
        socket.off('calendar:event_added');
        socket.off('calendar:event_updated');
        socket.off('calendar:event_deleted');
      };
    }
  }, [socket, projectId]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get(`/api/projects/${projectId}/calendar`);
        setEvents(response.data.events);
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      }
    };

    fetchEvents();
  }, [projectId]);

  const getDayEvents = (date) => {
    return events.filter(event =>
      isSameDay(new Date(event.date), date)
    );
  };

  const getEventBadgeColor = (type) => {
    switch (type) {
      case 'milestone':
        return 'bg-blue-500';
      case 'deadline':
        return 'bg-red-500';
      case 'meeting':
        return 'bg-green-500';
      case 'submission':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Calendar</CardTitle>
        <CardDescription>
          Project milestones, deadlines, and team events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-[1fr_300px]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              hasEvent: (date) => getDayEvents(date).length > 0
            }}
            modifiersStyles={{
              hasEvent: {
                fontWeight: 'bold',
                textDecoration: 'underline'
              }
            }}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {format(selectedDate, 'MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getDayEvents(selectedDate).length > 0 ? (
                  getDayEvents(selectedDate).map((event) => (
                    <div
                      key={event._id}
                      className="flex items-center space-x-4"
                    >
                      <Badge
                        className={getEventBadgeColor(event.type)}
                      >
                        {event.type}
                      </Badge>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {event.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No events scheduled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};