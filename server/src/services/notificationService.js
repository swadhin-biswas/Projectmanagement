import { jwtVerify } from "jose";
import { TextEncoder } from "util";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { Notification, User } from "../models/User.js";
import logger from "../utils/logger.js";

class NotificationService {
  constructor() {
    this.connections = new Map(); // userId -> WebSocket[]
  }

  // Add a new WebSocket connection for a user
  addConnection(userId, ws) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId).push(ws);
    logger.info(`New WebSocket connection added for user ${userId}`);
  }

  // Remove a WebSocket connection
  removeConnection(userId, ws) {
    if (this.connections.has(userId)) {
      const connections = this.connections.get(userId);
      const index = connections.indexOf(ws);
      if (index !== -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.connections.delete(userId);
      }
      logger.info(`WebSocket connection removed for user ${userId}`);
    }
  }

  // Verify JWT token and extract user ID
  async verifyToken(token) {
    try {
      // Remove "Bearer " prefix if present
      const actualToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "fallback-secret"
      );
      const { payload } = await jwtVerify(actualToken, secret);
      return payload.userId; // Return userId from the payload
    } catch (error) {
      logger.error("Token verification failed:", error);
      return null;
    }
  }

  // Send notification to a specific user
  async sendNotification(userId, title, message, type) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        user: userId,
        title,
        message,
        type,
      });

      // Send to all connected WebSocket clients for this user
      const connections = this.connections.get(userId);
      if (connections) {
        const payload = JSON.stringify({
          type: "notification",
          data: notification,
        });

        connections.forEach((ws) => {
          if (ws.readyState === 1) {
            // If connection is open
            ws.send(payload);
          }
        });
      }

      return notification;
    } catch (error) {
      logger.error("Failed to send notification:", error);
      throw error;
    }
  }

  // Send notification to multiple users
  async broadcastNotification(userIds, title, message, type) {
    try {
      // Create notifications for all users
      const notifications = await Promise.all(
        userIds.map((userId) =>
          Notification.create({
            user: userId,
            title,
            message,
            type,
          })
        )
      );

      // Send to connected clients
      userIds.forEach((userId, index) => {
        const connections = this.connections.get(userId);
        if (connections) {
          const payload = JSON.stringify({
            type: "notification",
            data: notifications[index],
          });

          connections.forEach((ws) => {
            if (ws.readyState === 1) {
              ws.send(payload);
            }
          });
        }
      });

      return notifications;
    } catch (error) {
      logger.error("Failed to broadcast notification:", error);
      throw error;
    }
  }

  // Send notification to all users with a specific role
  async notifyRole(role, title, message, type) {
    try {
      const users = await User.find({ role });
      const userIds = users.map((user) => user._id);
      return await this.broadcastNotification(userIds, title, message, type);
    } catch (error) {
      logger.error("Failed to notify role:", error);
      throw error;
    }
  }

  // Handle incoming WebSocket messages
  async handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      if (data.type === "subscribe" && data.token) {
        const userId = await this.verifyToken(data.token);
        if (userId) {
          this.addConnection(userId, ws);
          ws.userId = userId; // Store userId for cleanup
          ws.send(JSON.stringify({ type: "subscribed", success: true }));
        } else {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid token",
            })
          );
          ws.close();
        }
      }
    } catch (error) {
      logger.error("WebSocket message handling error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  }

  // Clean up when a WebSocket connection closes
  handleDisconnect(ws) {
    if (ws.userId) {
      this.removeConnection(ws.userId, ws);
    }
  }
}

// Create a singleton instance
const notificationService = new NotificationService();

export default notificationService;

export const createTeamNotification = async (options) => {
  try {
    const {
      type,
      title,
      message,
      fromUserId,
      teamId,
      projectId,
      recipientIds,
      link,
    } = options;

    // Get team members if recipientIds not provided
    let recipients = recipientIds;
    if (!recipients && teamId) {
      const team = await Team.findById(teamId);
      if (team) {
        recipients = team.members.map((m) => m.user.toString());
      }
    }

    if (!recipients || recipients.length === 0) {
      logger.warn("No recipients found for notification", { options });
      return;
    }

    // Create notification for each recipient
    const notifications = recipients.map((userId) => ({
      type,
      title,
      message,
      from: fromUserId,
      team: teamId,
      project: projectId,
      link,
      isRead: false,
      createdAt: new Date(),
    }));

    // Update each student's notifications
    await Promise.all(
      recipients.map(async (userId) => {
        const student = await Student.findOne({ user: userId });
        if (student) {
          student.notifications.push(
            notifications.find((n) => n.from?.toString() !== userId)
          );
          await student.save();
        }
      })
    );

    // If connected to WebSocket, emit real-time notification
    if (global.io) {
      recipients.forEach((userId) => {
        global.io.to(`user:${userId}`).emit("notification", {
          type,
          title,
          message,
          link,
        });
      });
    }

    return notifications;
  } catch (error) {
    logger.error("Failed to create team notification", { error, options });
    throw error;
  }
};

// Mark notifications as read
export const markNotificationsAsRead = async (userId, notificationIds) => {
  try {
    const student = await Student.findOne({ user: userId });
    if (!student) {
      throw new Error("Student not found");
    }

    // Update notification status
    student.notifications = student.notifications.map((notification) => {
      if (notificationIds.includes(notification._id.toString())) {
        notification.isRead = true;
      }
      return notification;
    });

    await student.save();
    return student.notifications;
  } catch (error) {
    logger.error("Failed to mark notifications as read", {
      error,
      userId,
      notificationIds,
    });
    throw error;
  }
};

// Get unread notifications count
export const getUnreadNotificationsCount = async (userId) => {
  try {
    const student = await Student.findOne({ user: userId });
    if (!student) {
      return 0;
    }

    return student.notifications.filter((n) => !n.isRead).length;
  } catch (error) {
    logger.error("Failed to get unread notifications count", { error, userId });
    return 0;
  }
};

// Admin notification service for supervisor monitoring
export const checkSupervisorPerformance = async () => {
  try {
    const supervisors = await Supervisor.find()
      .populate("user", "fullName email department")
      .populate({
        path: "teams",
        populate: {
          path: "members.user",
          select: "fullName",
        },
      });

    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } });
    const notifications = [];

    for (const supervisor of supervisors) {
      const issues = [];

      // Check progress tracking frequency
      const progressTracking = supervisor.progressTracking || {};
      const trackedStudents = progressTracking.trackedStudents || [];
      const trackedTeams = progressTracking.trackedTeams || [];

      const now = new Date();
      const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

      // Check student tracking
      const outdatedStudentTracking = trackedStudents.filter(
        (ts) => !ts.lastUpdated || new Date(ts.lastUpdated) < twoWeeksAgo
      );

      if (outdatedStudentTracking.length > 0) {
        issues.push({
          type: "student_tracking",
          count: outdatedStudentTracking.length,
          message: `${outdatedStudentTracking.length} students not tracked in over 2 weeks`,
        });
      }

      // Check team tracking
      const outdatedTeamTracking = trackedTeams.filter(
        (tt) => !tt.lastUpdated || new Date(tt.lastUpdated) < twoWeeksAgo
      );

      if (outdatedTeamTracking.length > 0) {
        issues.push({
          type: "team_tracking",
          count: outdatedTeamTracking.length,
          message: `${outdatedTeamTracking.length} teams not tracked in over 2 weeks`,
        });
      }

      // Check marking activity
      const marksGiven = supervisor.marksGiven || [];
      const teamsWithoutMarks = supervisor.teams.filter(
        (team) =>
          !marksGiven.some((m) =>
            team.members.some(
              (member) => member.user._id.toString() === m.student.toString()
            )
          )
      );

      if (teamsWithoutMarks.length > 0) {
        issues.push({
          type: "marking",
          count: teamsWithoutMarks.length,
          message: `${teamsWithoutMarks.length} teams have no marks recorded`,
        });
      }

      // If there are issues, create notifications for admins
      if (issues.length > 0) {
        const notification = {
          title: "Supervisor Performance Alert",
          message: `Performance issues detected for supervisor ${supervisor.user.fullName}`,
          type: "supervisor_alert",
          details: {
            supervisorId: supervisor._id,
            supervisorName: supervisor.user.fullName,
            department: supervisor.user.department,
            issues,
          },
          priority: issues.length > 2 ? "high" : "medium",
          createdAt: new Date(),
        };

        // Add notification for each admin
        admins.forEach((admin) => {
          notifications.push({
            ...notification,
            user: admin._id,
            isRead: false,
          });
        });
      }
    }

    // Save all notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return {
      success: true,
      notificationsCreated: notifications.length,
    };
  } catch (error) {
    logger.error("Failed to check supervisor performance", { error });
    throw error;
  }
};

// Schedule regular performance checks
export const schedulePerformanceChecks = () => {
  // Run checks every day at midnight
  schedule.scheduleJob("0 0 * * *", async () => {
    try {
      await checkSupervisorPerformance();
      logger.info("Completed daily supervisor performance check");
    } catch (error) {
      logger.error("Failed to run scheduled supervisor performance check", {
        error,
      });
    }
  });
};
