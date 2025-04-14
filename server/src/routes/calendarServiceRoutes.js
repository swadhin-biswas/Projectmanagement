import { Elysia } from "elysia";
import { CalendarEvent } from "../models/CalendarEvent.js";
import { Session } from "../models/Session.js";
import { Team } from "../models/Team.js";
import { authorize } from "../utils/authUtils.js";
import logger from "../utils/logger.js";

// Create an Elysia router for calendar service operations
export const calendarServiceRoutes = new Elysia({
  prefix: "/api/calendar-service",
})
  // Get calendar service status
  .get("/status", async (context) => {
    try {
      // Ensure only admin/superadmin can access these endpoints
      await authorize(["admin", "superadmin"])(context);

      return {
        success: true,
        status: {
          isRunning: global.calendarCronService?.isRunning || false,
          nextCheck: global.calendarCronService?.nextCheckTime || null,
          lastProcessed: global.calendarCronService?.lastProcessedTime || null,
        },
      };
    } catch (error) {
      logger.error("Failed to get calendar service status:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to get calendar service status",
      };
    }
  })

  // Start the calendar service
  .post("/start", async (context) => {
    try {
      // Ensure only admin/superadmin can access these endpoints
      await authorize(["admin", "superadmin"])(context);

      if (global.calendarCronService?.isRunning) {
        return {
          success: true,
          message: "Calendar service is already running",
          status: {
            isRunning: true,
            nextCheck: global.calendarCronService.nextCheckTime,
          },
        };
      }

      // Start the service
      global.calendarCronService.start();

      return {
        success: true,
        message: "Calendar service started successfully",
        status: {
          isRunning: true,
          nextCheck: global.calendarCronService.nextCheckTime,
        },
      };
    } catch (error) {
      logger.error("Failed to start calendar service:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to start calendar service",
      };
    }
  })

  // Stop the calendar service
  .post("/stop", async (context) => {
    try {
      // Ensure only admin/superadmin can access these endpoints
      await authorize(["admin", "superadmin"])(context);

      if (!global.calendarCronService?.isRunning) {
        return {
          success: true,
          message: "Calendar service is already stopped",
          status: {
            isRunning: false,
          },
        };
      }

      // Stop the service
      global.calendarCronService.stop();

      return {
        success: true,
        message: "Calendar service stopped successfully",
        status: {
          isRunning: false,
        },
      };
    } catch (error) {
      logger.error("Failed to stop calendar service:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to stop calendar service",
      };
    }
  })

  // Force run calendar events processing
  .post("/process", async (context) => {
    try {
      // Ensure only admin/superadmin can access these endpoints
      await authorize(["admin", "superadmin"])(context);

      if (!global.calendarCronService) {
        context.set.status = 500;
        return {
          success: false,
          error: "Calendar service is not initialized",
        };
      }

      // Process events manually
      await global.calendarCronService.processCalendarEvents();

      return {
        success: true,
        message: "Calendar events processed successfully",
        processedAt: new Date(),
      };
    } catch (error) {
      logger.error("Failed to process calendar events:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to process calendar events",
      };
    }
  })

  // Get all upcoming deadlines across sessions
  .get("/deadlines", async (context) => {
    try {
      // Ensure only admin/superadmin can access these endpoints
      await authorize(["admin", "superadmin"])(context);

      const { days = 30, role } = context.query;

      // Find active sessions
      const activeSessions = await Session.find({ status: "active" });

      if (activeSessions.length === 0) {
        return {
          success: true,
          deadlines: [],
        };
      }

      // Collect deadlines from all active sessions
      let allDeadlines = [];

      for (const session of activeSessions) {
        const deadlines = role
          ? session.getDeadlinesByRole(role, Number(days))
          : session.getUpcomingDeadlines(Number(days));

        allDeadlines = [
          ...allDeadlines,
          ...deadlines.map((d) => ({
            ...d.toObject(),
            sessionId: session._id,
            sessionName: session.name,
          })),
        ];
      }

      // Sort deadlines by due date (closest first)
      allDeadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      return {
        success: true,
        deadlines: allDeadlines,
      };
    } catch (error) {
      logger.error("Failed to fetch upcoming deadlines:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to fetch upcoming deadlines",
      };
    }
  })

  // Get upcoming meetings for teams
  .get("/team-meetings", async (context) => {
    try {
      // Ensure only admin/superadmin can access these endpoints
      await authorize(["admin", "superadmin"])(context);

      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Find teams with upcoming meetings
      const teams = await Team.find({
        "meetingSchedule.nextMeeting": { $gte: now, $lte: nextWeek },
      })
        .select("name meetingSchedule members")
        .populate("members.user", "fullName email");

      // Extract meeting information
      const upcomingMeetings = teams.map((team) => ({
        teamId: team._id,
        teamName: team.name,
        meetingDate: team.meetingSchedule.nextMeeting,
        location: team.meetingSchedule.location || "Online",
        meetingLink: team.meetingSchedule.meetingLink,
        frequency: team.meetingSchedule.frequency,
        members: team.members
          .filter((m) => m.status === "active")
          .map((m) => ({
            userId: m.user._id,
            name: m.user.fullName,
            email: m.user.email,
          })),
      }));

      // Sort by meeting date
      upcomingMeetings.sort((a, b) => a.meetingDate - b.meetingDate);

      return {
        success: true,
        meetings: upcomingMeetings,
      };
    } catch (error) {
      logger.error("Failed to fetch upcoming team meetings:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to fetch upcoming team meetings",
      };
    }
  })

  // Get calendar events statistics
  .get("/stats", async (context) => {
    try {
      // Ensure only admin/superadmin can access these endpoints
      await authorize(["admin", "superadmin"])(context);

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Count events for today
      const todayEvents = await CalendarEvent.countDocuments({
        date: { $gte: startOfToday, $lte: endOfToday },
      });

      // Count upcoming events (next 30 days)
      const upcomingEvents = await CalendarEvent.countDocuments({
        date: { $gt: now, $lte: nextMonth },
      });

      // Count events by attendance status
      const pendingResponseEvents = await CalendarEvent.countDocuments({
        "attendees.status": "pending",
        date: { $gt: now },
      });

      const confirmedEvents = await CalendarEvent.countDocuments({
        "attendees.status": "confirmed",
        date: { $gt: now },
      });

      // Get session deadline stats
      const activeSessions = await Session.find({ status: "active" });

      let deadlineStats = {
        upcoming: 0,
        past: 0,
        total: 0,
        byType: {},
      };

      activeSessions.forEach((session) => {
        session.deadlines.forEach((deadline) => {
          deadlineStats.total++;

          // Count by status
          if (new Date(deadline.dueDate) < now) {
            deadlineStats.past++;
          } else {
            deadlineStats.upcoming++;
          }

          // Count by type
          const type = deadline.type || "other";
          deadlineStats.byType[type] = (deadlineStats.byType[type] || 0) + 1;
        });
      });

      return {
        success: true,
        stats: {
          events: {
            today: todayEvents,
            upcoming: upcomingEvents,
            pendingResponse: pendingResponseEvents,
            confirmed: confirmedEvents,
          },
          deadlines: deadlineStats,
        },
      };
    } catch (error) {
      logger.error("Failed to fetch calendar stats:", error);
      context.set.status = error.status || 500;
      return {
        success: false,
        error: error.message || "Failed to fetch calendar stats",
      };
    }
  });

export default calendarServiceRoutes;
