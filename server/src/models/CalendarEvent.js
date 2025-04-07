import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { Notification } from './Notification.js';
import { User } from './User.js';

const attendeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  respondedAt: Date
});

const reminderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['notification', 'email'],
    required: true
  },
  minutes: {
    type: Number,
    required: true
  }
});

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['milestone', 'deadline', 'meeting', 'submission', 'other'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  endDate: Date,
  isAllDay: {
    type: Boolean,
    default: false
  },
  location: String,
  link: String,
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [attendeeSchema],
  reminders: [reminderSchema],
  recurrence: {
    type: String,
    enum: [null, 'daily', 'weekly', 'monthly']
  },
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
calendarEventSchema.index({ project: 1, date: 1 });
calendarEventSchema.index({ date: 1, 'reminders.0': 1 });

// Static method to create event with notifications
calendarEventSchema.statics.createWithNotification = async function(eventData) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create the event
    const event = await this.create([eventData], { session });

    // Create notifications for attendees
    if (eventData.attendees?.length > 0) {
      const notifications = eventData.attendees.map(attendeeId => ({
        user: attendeeId,
        type: 'event_invitation',
        title: 'New Event Invitation',
        message: `You've been invited to "${eventData.title}"`,
        link: `/projects/${eventData.project}/calendar`,
        metadata: {
          eventId: event[0]._id,
          projectId: eventData.project
        }
      }));

      await Notification.insertMany(notifications, { session });

      // Send real-time notifications
      if (global.io) {
        notifications.forEach(notification => {
          global.io.to(`user:${notification.user}`).emit('notification:new', notification);
        });
      }
    }

    await session.commitTransaction();
    return event[0];
  } catch (error) {
    await session.abortTransaction();
    logger.error('Failed to create event with notifications:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Method to update attendance status
calendarEventSchema.methods.updateAttendance = async function(userId, status) {
  const attendee = this.attendees.find(a => a.user.toString() === userId);
  if (!attendee) {
    throw new Error('User is not an attendee of this event');
  }

  attendee.status = status;
  attendee.respondedAt = new Date();

  await this.save();

  // Notify event creator
  if (global.io) {
    global.io.to(`user:${this.createdBy}`).emit('calendar:response', {
      event: {
        _id: this._id,
        title: this.title
      },
      user: await User.findById(userId).select('fullName'),
      status
    });
  }

  return this;
};

// Pre-save middleware to handle date validation
calendarEventSchema.pre('save', function(next) {
  if (this.endDate && this.endDate < this.date) {
    next(new Error('End date cannot be before start date'));
  }
  next();
});

export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);