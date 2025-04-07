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
import logger from "../utils/logger.js";

// Create an Elysia router for calendar operations
export const calendarRoutes = new Elysia({ prefix: "/api/calendar" })
  .guard({
    beforeHandle: [
      // Auth middleware will be performed here
      async ({ set, request, jwt, secret }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            set.status = 401;
            return {
              success: false,
              error: "Unauthorized - No token provided",
            };
          }

          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, secret);

          return { user: decoded };
        } catch (error) {
          set.status = 401;
          return { success: false, error: "Unauthorized - Invalid token" };
        }
      },
    ],
  })
  // Get events for a project
  .get("/projects/:id/events", async ({ params, query, store }) => {
    try {
      const { id } = params;
      const { view, start, end } = query;
      const { user } = store;

      // Validate project access
      const project = await Project.findOne({
        _id: id,
        $or: [{ owner: user._id }, { members: user._id }],
      });

      if (!project) {
        return {
          success: false,
          error: "Project not found or access denied",
          status: 404,
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
      return {
        success: false,
        error: "Failed to fetch calendar events",
        status: 500,
      };
    }
  })

  // Create a new event
  .post("/projects/:id/events", async ({ params, body, store }) => {
    try {
      const { id } = params;
      const { user } = store;

      const eventData = {
        ...body,
        project: id,
        createdBy: user._id,
      };

      // Validate project access
      const project = await Project.findOne({
        _id: id,
        $or: [{ owner: user._id }, { members: user._id }],
      });

      if (!project) {
        return {
          success: false,
          error: "Project not found or access denied",
          status: 404,
        };
      }

      const event = await CalendarEvent.createWithNotification(eventData);

      // Notify project members about the new event
      if (global.io) {
        global.io
          .to(`project:${id}:calendar`)
          .emit("calendar:event_added", event);
      }

      return {
        success: true,
        event,
        status: 201,
      };
    } catch (error) {
      logger.error("Failed to create calendar event:", error);
      return {
        success: false,
        error: "Failed to create calendar event",
        status: 500,
      };
    }
  })

  // Update event attendance
  .patch(
    "/projects/:id/events/:eventId/attendance",
    async ({ params, body, store }) => {
      try {
        const { id, eventId } = params;
        const { status } = body;
        const { user } = store;

        const event = await CalendarEvent.findOne({
          _id: eventId,
          project: id,
          "attendees.user": user._id,
        });

        if (!event) {
          return {
            success: false,
            error: "Event not found or user not invited",
            status: 404,
          };
        }

        await event.updateAttendance(user._id, status);

        return {
          success: true,
          event,
        };
      } catch (error) {
        logger.error("Failed to update attendance:", error);
        return {
          success: false,
          error: "Failed to update attendance",
          status: 500,
        };
      }
    }
  )

  // Invite members to an event
  .post(
    "/projects/:id/events/:eventId/invites",
    async ({ params, body, store }) => {
      try {
        const { id, eventId } = params;
        const { members } = body;
        const { user } = store;

        const event = await CalendarEvent.findOne({
          _id: eventId,
          project: id,
        });

        if (!event) {
          return {
            success: false,
            error: "Event not found",
            status: 404,
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
        return {
          success: false,
          error: "Failed to invite members",
          status: 500,
        };
      }
    }
  );

export default calendarRoutes;
