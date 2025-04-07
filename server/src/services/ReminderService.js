import { addMinutes, subMinutes } from 'date-fns';
import { CalendarEvent } from '../models/CalendarEvent.js';
import { Notification } from '../models/Notification.js';
import logger from '../utils/logger.js';

class ReminderService {
  constructor() {
    this.checkInterval = 60000; // Check every minute
    this.intervalId = null;
  }

  start() {
    this.intervalId = setInterval(() => this.checkReminders(), this.checkInterval);
    logger.info('Reminder service started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Reminder service stopped');
  }

  async checkReminders() {
    try {
      const now = new Date();
      const checkWindow = addMinutes(now, 1);

      // Find events with reminders due in the next minute
      const events = await CalendarEvent.find({
        date: { $gt: now },
        'reminders.0': { $exists: true },
        archived: { $ne: true }
      })
      .populate('attendees.user', 'fullName email')
      .populate('project', 'name');

      for (const event of events) {
        for (const reminder of event.reminders) {
          const reminderTime = subMinutes(event.date, reminder.minutes);

          // Check if this reminder should be sent now
          if (reminderTime > now && reminderTime <= checkWindow) {
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
      const attendees = event.attendees.filter(a => a.status !== 'declined');

      // Create notifications for attendees
      const notifications = attendees.map(attendee => ({
        user: attendee.user._id,
        type: 'event_reminder',
        title: 'Upcoming Event Reminder',
        message: `${reminder.minutes} minutes until "${event.title}" in project ${event.project.name}`,
        link: `/projects/${event.project._id}/calendar`,
        metadata: {
          eventId: event._id,
          projectId: event.project._id,
          reminderType: reminder.type
        }
      }));

      if (reminder.type === 'notification') {
        await Notification.insertMany(notifications);

        // Send real-time notifications
        if (global.io) {
          notifications.forEach(notification => {
            global.io.to(`user:${notification.user}`).emit('notification:new', notification);
          });
        }
      }

      if (reminder.type === 'email') {
        // Send email reminders to each attendee
        for (const attendee of attendees) {
          // Email sending logic would go here
          // We'll implement this when we add email functionality
          logger.info(`Would send email reminder to ${attendee.user.email} for event ${event.title}`);
        }
      }

      logger.info(`Sent ${reminder.type} reminders for event ${event.title}`);
    } catch (error) {
      logger.error(`Error sending reminder for event ${event._id}:`, error);
    }
  }
}

export const reminderService = new ReminderService();