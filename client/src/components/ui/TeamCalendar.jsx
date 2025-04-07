import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { calendarApi } from '../../api/calendar';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select } from './select';
import { toast } from './toast';

const localizer = momentLocalizer(moment);

const eventTypeColors = {
  milestone: 'bg-blue-500',
  deadline: 'bg-red-500',
  meeting: 'bg-green-500',
  submission: 'bg-purple-500',
  other: 'bg-gray-500'
};

export const TeamCalendar = ({ projectId }) => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('month');

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data } = await calendarApi.getEvents(projectId, { view });
      setEvents(data.events.map(event => ({
        ...event,
        start: new Date(event.date),
        end: event.endDate ? new Date(event.endDate) : new Date(event.date),
        title: event.title
      })));
    } catch (error) {
      toast.error('Failed to fetch calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [projectId, view]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleCreateEvent = async (formData) => {
    try {
      await calendarApi.createEvent(projectId, {
        ...formData,
        date: new Date(formData.date),
        endDate: formData.endDate ? new Date(formData.endDate) : null
      });
      toast.success('Event created successfully');
      setIsCreateDialogOpen(false);
      fetchEvents();
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const handleUpdateAttendance = async (eventId, status) => {
    try {
      await calendarApi.updateAttendance(projectId, eventId, status);
      toast.success('Attendance updated');
      fetchEvents();
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const handleInviteMembers = async (eventId, members) => {
    try {
      await calendarApi.inviteMembers(projectId, eventId, members);
      toast.success('Invitations sent successfully');
      fetchEvents();
    } catch (error) {
      toast.error('Failed to send invitations');
    }
  };

  const eventStyleGetter = (event) => {
    return {
      className: `${eventTypeColors[event.type] || 'bg-gray-500'} text-white rounded px-2 py-1`,
      style: {
        border: 'none'
      }
    };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('month')}
            className={view === 'month' ? 'bg-primary text-white' : ''}
          >
            Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('week')}
            className={view === 'week' ? 'bg-primary text-white' : ''}
          >
            Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('day')}
            className={view === 'day' ? 'bg-primary text-white' : ''}
          >
            Day
          </Button>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Create Event
        </Button>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleEventClick}
          eventPropGetter={eventStyleGetter}
          view={view}
          onView={setView}
          loading={isLoading}
        />
      </div>

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleCreateEvent(Object.fromEntries(formData));
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select id="type" name="type" required>
                  <option value="milestone">Milestone</option>
                  <option value="deadline">Deadline</option>
                  <option value="meeting">Meeting</option>
                  <option value="submission">Submission</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="datetime-local" required />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input id="endDate" name="endDate" type="datetime-local" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <p className="capitalize">{selectedEvent.type}</p>
              </div>
              <div>
                <Label>Date</Label>
                <p>{moment(selectedEvent.start).format('MMMM D, YYYY h:mm A')}</p>
              </div>
              {selectedEvent.end && selectedEvent.end !== selectedEvent.start && (
                <div>
                  <Label>End Date</Label>
                  <p>{moment(selectedEvent.end).format('MMMM D, YYYY h:mm A')}</p>
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <Label>Description</Label>
                  <p>{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.attendees?.length > 0 && (
                <div>
                  <Label>Attendees</Label>
                  <ul className="list-disc pl-5">
                    {selectedEvent.attendees.map((attendee) => (
                      <li key={attendee.user._id}>
                        {attendee.user.fullName} - {attendee.status}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedEvent.attendees?.some(a => a.user._id === user._id) && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleUpdateAttendance(selectedEvent._id, 'accepted')}
                    variant="success"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleUpdateAttendance(selectedEvent._id, 'declined')}
                    variant="destructive"
                  >
                    Decline
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};