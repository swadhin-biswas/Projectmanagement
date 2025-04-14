import {
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Elysia } from "elysia";
import { CalendarEvent } from "../models/CalendarEvent.js";
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { requireAuth } from "../utils/authUtils.js";
import logger from "../utils/logger.js";

// Create an Elysia router for calendar operations
export const calendarRoutes = new Elysia({ prefix: "/api/calendar" })
  // Remove custom auth implementation - global authMiddleware will handle this
  .get("/projects/:id/events", async (context) => {
    try {
      // Use the standard auth utility to ensure user is authenticated
      const user = requireAuth(context);

      const { id } = context.params;
      const { view, start, end } = context.query;

      // Validate project access
      const project = await Project.findOne({
        _id: id,
        $or: [{ owner: user.id }, { members: user.id }],
      });

      if (!project) {
        context.set.status = 404;
        return {
          success: false,
          error: "Project not found or access denied",
        };
      }

      let dateQuery = {};
      if (start && end) {
        dateQuery.date = {
          $gte: new Date(start),
          $lte: new Date(end),
        };
      } else if (view) {
        const now = new Date();
        switch (view) {
          case "week":
            dateQuery.date = {
              $gte: startOfWeek(now),
              $lte: endOfWeek(now),
            };
            break;
          case "month":
            dateQuery.date = {
              $gte: startOfMonth(now),
              $lte: endOfMonth(now),
            };
            break;
          case "upcoming":
            dateQuery.date = {
              $gte: now,
              $lte: addMonths(now, 3),
            };
            break;
        }
      }

      const events = await CalendarEvent.find({
        project: id,
        archived: { $ne: true },
        ...dateQuery,
      })
        .populate("attendees.user", "fullName email")
        .populate("createdBy", "fullName")
        .sort("date");

      return {
        success: true,
        events,
      };
    } catch (error) {
      logger.error("Failed to fetch calendar events:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to fetch calendar events",
      };
    }
  })

  // Create a new event
  .post("/projects/:id/events", async (context) => {
    try {
      // Use the standard auth utility to ensure user is authenticated
      const user = requireAuth(context);

      const { id } = context.params;
      const body = context.body;

      const eventData = {
        ...body,
        project: id,
        createdBy: user.id,
      };

      // Validate project access
      const project = await Project.findOne({
        _id: id,
        $or: [{ owner: user.id }, { members: user.id }],
      });

      if (!project) {
        context.set.status = 404;
        return {
          success: false,
          error: "Project not found or access denied",
        };
      }

      const event = await CalendarEvent.createWithNotification(eventData);

      // Notify project members about the new event
      if (global.io) {
        global.io
          .to(`project:${id}:calendar`)
          .emit("calendar:event_added", event);
      }

      context.set.status = 201;
      return {
        success: true,
        event,
      };
    } catch (error) {
      logger.error("Failed to create calendar event:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to create calendar event",
      };
    }
  })

  // Update event attendance
  .patch("/projects/:id/events/:eventId/attendance", async (context) => {
    try {
      // Use the standard auth utility to ensure user is authenticated
      const user = requireAuth(context);

      const { id, eventId } = context.params;
      const { status } = context.body;

      const event = await CalendarEvent.findOne({
        _id: eventId,
        project: id,
        "attendees.user": user.id,
      });

      if (!event) {
        context.set.status = 404;
        return {
          success: false,
          error: "Event not found or user not invited",
        };
      }

      await event.updateAttendance(user.id, status);

      return {
        success: true,
        event,
      };
    } catch (error) {
      logger.error("Failed to update attendance:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to update attendance",
      };
    }
  })

  // Invite members to an event
  .post("/projects/:id/events/:eventId/invites", async (context) => {
    try {
      // Use the standard auth utility to ensure user is authenticated
      const user = requireAuth(context);

      const { id, eventId } = context.params;
      const { members } = context.body;

      const event = await CalendarEvent.findOne({
        _id: eventId,
        project: id,
      });

      if (!event) {
        context.set.status = 404;
        return {
          success: false,
          error: "Event not found",
        };
      }

      // Add new attendees
      const newAttendees = members.map((userId) => ({
        user: userId,
        status: "pending",
      }));

      event.attendees.push(...newAttendees);
      await event.save();

      // Create notifications for new attendees
      const notifications = members.map((userId) => ({
        user: userId,
        type: "event_invitation",
        title: "New Event Invitation",
        message: `You've been invited to "${event.title}"`,
        link: `/projects/${id}/calendar`,
        metadata: {
          eventId: event._id,
          projectId: id,
        },
      }));

      await Notification.insertMany(notifications);

      // Send real-time notifications
      if (global.io) {
        notifications.forEach((notification) => {
          global.io
            .to(`user:${notification.user}`)
            .emit("notification:new", notification);
        });
      }

      return {
        success: true,
        event,
      };
    } catch (error) {
      logger.error("Failed to invite members:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to invite members",
      };
    }
  });

export default calendarRoutes;
