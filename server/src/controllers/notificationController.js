import { Notification } from "../models/Notification.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { sendEmail } from "../services/emailService.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Create notification(s)
export const createNotifications = async (notifications) => {
  try {
    const notificationDocs = await Notification.insertMany(
      notifications.map((n) => ({
        ...n,
        createdAt: new Date(),
        status: "unread",
      }))
    );

    // Send emails for urgent notifications
    const urgentNotifications = notifications.filter(
      (n) => n.priority === "high"
    );
    if (urgentNotifications.length > 0) {
      const users = await User.find({
        _id: { $in: urgentNotifications.map((n) => n.userId) },
      });

      for (const notification of urgentNotifications) {
        const user = users.find(
          (u) => u._id.toString() === notification.userId.toString()
        );
        if (user && user.email) {
          await sendEmail({
            to: user.email,
            subject: notification.title,
            text: notification.message,
            priority: "high",
          });
        }
      }
    }

    return notificationDocs;
  } catch (error) {
    logger.error("Failed to create notifications", { error });
    throw error;
  }
};

// Send supervisor feedback
export const sendSupervisorFeedback = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const student = await Student.findById(params.studentId).populate(
      "user",
      "email"
    );
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Verify supervisor is assigned to student's team
    const team = await Team.findOne({
      "members.user": student._id,
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "active",
    });

    if (!team) {
      throw new ForbiddenError(
        "Not authorized to provide feedback to this student"
      );
    }

    // Create feedback notification
    const notification = await Notification.create({
      userId: student.user._id,
      title:
        body.type === "warning"
          ? "Important Feedback from Supervisor"
          : "Supervisor Feedback",
      message: body.message,
      type: "supervisor_feedback",
      priority: body.type === "warning" ? "high" : "normal",
      relatedTo: {
        model: "Project",
        id: team.project,
      },
      from: {
        role: "supervisor",
        user: user.id,
      },
      requiresAction: body.requiresAction || false,
      dueDate: body.dueDate,
      status: "unread",
    });

    // Send email for warnings or if marked as urgent
    if (body.type === "warning" || body.isUrgent) {
      await sendEmail({
        to: student.user.email,
        subject: notification.title,
        text: notification.message,
        priority: "high",
      });
    }

    return {
      success: true,
      message: "Feedback sent successfully",
      data: notification,
    };
  } catch (error) {
    logger.error("Failed to send supervisor feedback", {
      error,
      userId: user.id,
      studentId: params.studentId,
    });
    throw error;
  }
};

// Get notifications
export const getNotifications = async ({ user, query }) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { userId: user.id };
    if (query.status) {
      filter.status = query.status;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.priority) {
      filter.priority = query.priority;
    }

    // Get notifications with pagination
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("from.user", "fullName profilePicture");

    // Get total count for pagination
    const total = await Notification.countDocuments(filter);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      userId: user.id,
      status: "unread",
    });

    return {
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
        unreadCount,
      },
    };
  } catch (error) {
    logger.error("Failed to get notifications", { error, userId: user.id });
    throw error;
  }
};

// Get unread count
export const getUnreadCount = async ({ user }) => {
  try {
    // Ensure we're using the user ID from the context
    const userId = user.id;
    const count = await Notification.countDocuments({
      userId,
      status: "unread",
    });
    return count;
  } catch (error) {
    logger.error("Failed to get unread count", { error, userId: user?.id });
    throw error;
  }
};

// Mark notification as read
export const markAsRead = async ({ params, user }) => {
  try {
    const notification = await Notification.findById(params.notificationId);

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.userId.toString() !== user.id) {
      throw new ForbiddenError("Not authorized to update this notification");
    }

    notification.status = "read";
    notification.readAt = new Date();
    await notification.save();

    return {
      success: true,
      message: "Notification marked as read",
    };
  } catch (error) {
    logger.error("Failed to mark notification as read", {
      error,
      userId: user.id,
      notificationId: params.notificationId,
    });
    throw error;
  }
};

// Mark all notifications as read
export const markAllAsRead = async ({ user }) => {
  try {
    await Notification.updateMany(
      { userId: user.id, status: "unread" },
      { $set: { status: "read", readAt: new Date() } }
    );

    return {
      success: true,
      message: "All notifications marked as read",
    };
  } catch (error) {
    logger.error("Failed to mark all notifications as read", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Delete notification
export const deleteNotification = async ({ params, user }) => {
  try {
    const notification = await Notification.findById(params.notificationId);

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    // Verify ownership
    if (notification.userId.toString() !== user.id) {
      throw new ForbiddenError("Not authorized to delete this notification");
    }

    await notification.deleteOne();

    return {
      success: true,
      message: "Notification deleted successfully",
    };
  } catch (error) {
    logger.error("Failed to delete notification", {
      error,
      notificationId: params.notificationId,
      userId: user.id,
    });
    throw error;
  }
};

// Update notification preferences
export const updatePreferences = async ({ user, body }) => {
  try {
    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      throw new NotFoundError("User not found");
    }

    // Update notification preferences
    userDoc.notificationPreferences = {
      ...userDoc.notificationPreferences,
      ...body,
    };

    await userDoc.save();

    logger.info("Notification preferences updated", {
      userId: user.id,
      preferences: body,
    });

    return {
      success: true,
      message: "Notification preferences updated successfully",
      data: userDoc.notificationPreferences,
    };
  } catch (error) {
    logger.error("Failed to update notification preferences", {
      error,
      userId: user.id,
    });
    throw error;
  }
};
