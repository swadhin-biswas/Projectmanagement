import { Notification } from "../models/Notification.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { sendEmail } from "../services/emailService.js";
import logger from "../utils/logger.js";

/**
 * Calendar service for managing scheduled tasks related to calendar events
 * Designed to work with Elysia's server architecture
 */
class CalendarCronService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Start the calendar service
   */
  start() {
    if (this.isRunning) return;

    logger.info("🗓️ Calendar cron service starting...");
    this.isRunning = true;

    // Run immediately on start
    this.processCalendarEvents();

    // Then schedule regular interval
    this.intervalId = setInterval(() => {
      this.processCalendarEvents();
    }, this.checkInterval);

    logger.info("🗓️ Calendar cron service started");
  }

  /**
   * Stop the calendar service
   */
  stop() {
    if (!this.isRunning) return;

    logger.info("🗓️ Calendar cron service stopping...");
    clearInterval(this.intervalId);
    this.isRunning = false;
    logger.info("🗓️ Calendar cron service stopped");
  }

  /**
   * Process all calendar-related events
   */
  async processCalendarEvents() {
    try {
      const now = new Date();
      logger.info(`🗓️ Processing calendar events at ${now.toISOString()}`);

      await Promise.all([
        this.processSessionDeadlines(),
        this.processTeamMeetings(),
        this.processSupervisorMeetings(),
        this.processExpiredInvites(),
      ]);

      logger.info("🗓️ Calendar events processing completed");
    } catch (error) {
      logger.error("🗓️ Error processing calendar events:", error);
    }
  }

  /**
   * Process session deadlines and send notifications
   */
  async processSessionDeadlines() {
    try {
      // Get active session
      const activeSession = await Session.findOne({ status: "active" });
      if (!activeSession) return;

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get upcoming deadlines within reminder window
      const upcomingDeadlines = activeSession.deadlines.filter((deadline) => {
        if (deadline.notificationSent) return false;

        const deadlineDate = new Date(deadline.dueDate);
        const reminderDate = new Date(deadlineDate);
        reminderDate.setDate(
          reminderDate.getDate() - (deadline.reminderDays || 3)
        );

        return now >= reminderDate && now < deadlineDate;
      });

      if (upcomingDeadlines.length === 0) return;

      // Process each deadline
      for (const deadline of upcomingDeadlines) {
        // Find users who should receive this notification
        const userRoles = deadline.forRoles || ["student", "supervisor"];
        const users = await User.find({
          role: { $in: userRoles },
          status: "active",
        });

        // Create notifications
        const notifications = users.map((user) => ({
          user: user._id,
          title: `Upcoming Deadline: ${deadline.title}`,
          message: `${deadline.title} is due on ${new Date(
            deadline.dueDate
          ).toDateString()}. ${deadline.description || ""}`,
          type: "deadline_reminder",
          isRead: false,
          createdAt: now,
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        // Send emails to users who have email notifications enabled
        for (const user of users) {
          try {
            if (user.emailNotifications) {
              await sendEmail({
                to: user.email,
                subject: `Upcoming Deadline: ${deadline.title}`,
                template: "deadlineReminder",
                context: {
                  userName: user.fullName,
                  deadlineTitle: deadline.title,
                  deadlineDate: new Date(deadline.dueDate).toDateString(),
                  deadlineDescription: deadline.description,
                  daysRemaining: Math.ceil(
                    (new Date(deadline.dueDate) - now) / (1000 * 60 * 60 * 24)
                  ),
                },
              });
            }
          } catch (emailError) {
            logger.error(`Failed to send email to ${user.email}:`, emailError);
          }
        }

        // Mark deadline as notified
        deadline.notificationSent = true;
      }

      await activeSession.save();
      logger.info(`🗓️ Processed ${upcomingDeadlines.length} session deadlines`);
    } catch (error) {
      logger.error("🗓️ Error processing session deadlines:", error);
    }
  }

  /**
   * Process team meetings and send notifications
   */
  async processTeamMeetings() {
    try {
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);

      // Find teams with meetings today
      const teams = await Team.find({
        "meetingSchedule.nextMeeting": { $gte: dayStart, $lte: dayEnd },
      });

      for (const team of teams) {
        // Get all active team members
        const memberIds = team.members
          .filter((m) => m.status === "active")
          .map((m) => m.user);

        const students = await Student.find({
          _id: { $in: memberIds },
        }).populate("user", "fullName email notificationPreferences");

        // Create notifications for each student
        for (const student of students) {
          // Create a notification
          const notification = new Notification({
            user: student.user._id,
            title: `Team Meeting Today`,
            message: `Your team '${
              team.name
            }' has a meeting scheduled for ${new Date(
              team.meetingSchedule.nextMeeting
            ).toLocaleTimeString()}`,
            type: "meeting_reminder",
            relatedModel: "Team",
            relatedId: team._id,
            isRead: false,
          });

          await notification.save();

          // Send email if the student has email notifications enabled
          if (student.user.notificationPreferences?.emailNotifications) {
            try {
              await sendEmail({
                to: student.user.email,
                subject: `Team Meeting Reminder: ${team.name}`,
                template: "meetingReminder",
                context: {
                  userName: student.user.fullName,
                  teamName: team.name,
                  meetingTime: new Date(
                    team.meetingSchedule.nextMeeting
                  ).toLocaleTimeString(),
                  meetingLink:
                    team.meetingSchedule.meetingLink || "No link provided",
                },
              });
            } catch (emailError) {
              logger.error(
                `Failed to send meeting reminder email to ${student.user.email}:`,
                emailError
              );
            }
          }
        }

        logger.info(
          `🗓️ Sent meeting notifications for team ${team.name} (${team._id})`
        );
      }

      logger.info(`🗓️ Processed team meetings for ${teams.length} teams`);
    } catch (error) {
      logger.error("🗓️ Error processing team meetings:", error);
    }
  }

  /**
   * Process supervisor meetings and send notifications
   */
  async processSupervisorMeetings() {
    // Implementation will go here
    logger.info("🗓️ Processed supervisor meetings");
  }

  /**
   * Process expired team invites
   */
  async processExpiredInvites() {
    // Implementation will go here
    logger.info("🗓️ Processed expired invites");
  }
}

export default new CalendarCronService();
