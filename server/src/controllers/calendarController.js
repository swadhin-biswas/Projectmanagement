import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarEvent } from '../models/CalendarEvent.js';
import { Project } from '../models/Project.js';
import logger from '../utils/logger.js';

export const calendarController = {
  // Get events for a project
  async getEvents(req, res) {
    try {
      const { projectId } = req.params;
      const { view, start, end } = req.query;

      // Validate project access
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { members: req.user._id }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      let dateQuery = {};
      if (start && end) {
        dateQuery.date = {
          $gte: new Date(start),
          $lte: new Date(end)
        };
      } else if (view) {
        const now = new Date();
        switch (view) {
          case 'week':
            dateQuery.date = {
              $gte: startOfWeek(now),
              $lte: endOfWeek(now)
            };
            break;
          case 'month':
            dateQuery.date = {
              $gte: startOfMonth(now),
              $lte: endOfMonth(now)
            };
            break;
          case 'upcoming':
            dateQuery.date = {
              $gte: now,
              $lte: addMonths(now, 3)
            };
            break;
        }
      }

      const events = await CalendarEvent.find({
        project: projectId,
        archived: { $ne: true },
        ...dateQuery
      })
      .populate('attendees.user', 'fullName email')
      .populate('createdBy', 'fullName')
      .sort('date');

      res.json({
        success: true,
        events
      });
    } catch (error) {
      logger.error('Failed to fetch calendar events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch calendar events'
      });
    }
  },

  // Create a new event
  async createEvent(req, res) {
    try {
      const { projectId } = req.params;
      const eventData = {
        ...req.body,
        project: projectId,
        createdBy: req.user._id
      };

      // Validate project access
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { members: req.user._id }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      const event = await CalendarEvent.createWithNotification(eventData);

      // Notify project members about the new event
      if (global.io) {
        global.io.to(`project:${projectId}:calendar`).emit('calendar:event_added', event);
      }

      res.status(201).json({
        success: true,
        event
      });
    } catch (error) {
      logger.error('Failed to create calendar event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create calendar event'
      });
    }
  },

  // Update event attendance
  async updateAttendance(req, res) {
    try {
      const { projectId, eventId } = req.params;
      const { status } = req.body;

      const event = await CalendarEvent.findOne({
        _id: eventId,
        project: projectId,
        'attendees.user': req.user._id
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found or user not invited'
        });
      }

      await event.updateAttendance(req.user._id, status);

      res.json({
        success: true,
        event
      });
    } catch (error) {
      logger.error('Failed to update attendance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update attendance'
      });
    }
  },

  // Invite members to an event
  async inviteMembers(req, res) {
    try {
      const { projectId, eventId } = req.params;
      const { members } = req.body;

      const event = await CalendarEvent.findOne({
        _id: eventId,
        project: projectId
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }

      // Add new attendees
      const newAttendees = members.map(userId => ({
        user: userId,
        status: 'pending'
      }));

      event.attendees.push(...newAttendees);
      await event.save();

      // Create notifications for new attendees
      const notifications = members.map(userId => ({
        user: userId,
        type: 'event_invitation',
        title: 'New Event Invitation',
        message: `You've been invited to "${event.title}"`,
        link: `/projects/${projectId}/calendar`,
        metadata: {
          eventId: event._id,
          projectId
        }
      }));

      await Notification.insertMany(notifications);

      // Send real-time notifications
      if (global.io) {
        notifications.forEach(notification => {
          global.io.to(`user:${notification.user}`).emit('notification:new', notification);
        });
      }

      res.json({
        success: true,
        event
      });
    } catch (error) {
      logger.error('Failed to invite members:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invite members'
      });
    }
  }
};