import { addMinutes, isWithinInterval, subMinutes } from 'date-fns';
import { CalendarEvent } from '../models/CalendarEvent.js';
import logger from '../utils/logger.js';

class ReminderService {
  constructor() {
    this.checkInterval = 60000; // Check every minute
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkReminders().catch(error => {
        logger.error('Failed to check reminders:', error);
      });
    }, this.checkInterval);

    logger.info('Reminder service started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Reminder service stopped');
    }
  }

  async checkReminders() {
    const now = new Date();

    try {
      // Find events that have reminders set for the next minute
      const events = await CalendarEvent.find({
        date: {
          $gt: now,
          $lt: addMinutes(now, 60) // Look ahead 60 minutes
        },
        'reminders.0': { $exists: true }
      }).populate('attendees.user', 'fullName email');

      for (const event of events) {
        for (const reminder of event.reminders) {
          const reminderTime = subMinutes(new Date(event.date), reminder.minutes);

          // Check if reminder time falls within the current minute
          if (isWithinInterval(now, {
            start: subMinutes(reminderTime, 1),
            end: addMinutes(reminderTime, 1)
          })) {
            await this.sendReminder(event, reminder);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking reminders:', error);
    }
  }

  async sendReminder(event, reminder) {
    try {
      const notifications = [];

      // Prepare notifications for all attendees
      for (const attendee of event.attendees) {
        if (attendee.status === 'accepted' || attendee.status === 'pending') {
          notifications.push({
            user: attendee.user._id,
            type: 'event_reminder',
            title: `Reminder: ${event.title}`,
            message: `Event "${event.title}" starts in ${reminder.minutes} minutes`,
            link: `/projects/${event.project}/calendar`,
            metadata: {
              eventId: event._id,
              reminderType: reminder.type
            }
          });

          // Send real-time notification if user is online
          if (global.io) {
            global.io.to(`user:${attendee.user._id}`).emit('reminder:event', {
              event: {
                _id: event._id,
                title: event.title,
                date: event.date,
                type: event.type
              },
              minutesBefore: reminder.minutes
            });
          }
        }
      }

      // Bulk insert notifications
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      // Handle email reminders if configured
      if (reminder.type === 'email') {
        const emailPromises = event.attendees
          .filter(a => a.status === 'accepted' || a.status === 'pending')
          .map(attendee =>
            sendEventReminderEmail(
              attendee.user.email,
              event,
              reminder.minutes
            )
          );

        await Promise.all(emailPromises);
      }

      logger.info('Reminders sent successfully', {
        eventId: event._id,
        recipientCount: notifications.length
      });
    } catch (error) {
      logger.error('Failed to send reminders', {
        error,
        eventId: event._id
      });
    }
  }
}

// Create a singleton instance
const reminderService = new ReminderService();

export default reminderService;