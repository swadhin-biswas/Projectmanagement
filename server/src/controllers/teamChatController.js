import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Get team chat messages with filtering and pagination
export const getTeamChatMessages = async ({ params, query, user }) => {
  try {
    // Get pagination parameters
    const { limit = 50, before } = query;

    // Get the team
    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is member of the team
    const isMember = team.members.some(m =>
      m.user.toString() === student._id.toString() && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Get messages based on pagination
    let messages = team.chatMessages;
    if (before) {
      const beforeDate = new Date(before);
      messages = messages.filter(msg => msg.timestamp < beforeDate);
    }

    // Sort messages by timestamp (newest first) and limit
    messages = messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, parseInt(limit));

    // Mark messages as read for this student
    await Team.updateMany(
      { _id: team._id },
      { $addToSet: { "chatMessages.$[].readBy": student._id } }
    );

    return {
      success: true,
      data: messages
    };
  } catch (error) {
    logger.error("Failed to get team chat messages", { error });
    throw error;
  }
};

// Send message in team chat
export const sendTeamMessage = async ({ params, body, user }) => {
  try {
    // Get the team
    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is member of the team
    const isMember = team.members.some(m =>
      m.user.toString() === student._id.toString() && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Validate message content
    if (!body.content || !body.content.trim()) {
      throw new ValidationError("Message content is required");
    }

    // Create message object
    const message = {
      sender: student._id,
      senderType: "student",
      content: body.content.trim(),
      timestamp: new Date(),
      readBy: [student._id],
      attachments: body.attachments || [],
      isAnnouncement: body.isAnnouncement || false
    };

    // If it's an announcement, check if sender is team leader
    if (message.isAnnouncement) {
      const isLeader = team.members.some(m =>
        m.user.toString() === student._id.toString() &&
        (m.role === "leader" || m.role === "co_leader")
      );

      if (!isLeader) {
        throw new ForbiddenError("Only team leaders can send announcements");
      }
    }

    // Add message to team chat
    team.chatMessages.push(message);
    await team.save();

    // Create notifications for other team members
    const notifications = [];
    team.members.forEach(member => {
      if (member.user.toString() !== student._id.toString()) {
        notifications.push({
          user: member.user,
          type: message.isAnnouncement ? "team_announcement" : "team_message",
          message: message.isAnnouncement
            ? `New announcement in team ${team.name}`
            : `New message in team ${team.name}`,
          link: `/team/chat`,
          from: student._id,
          team: team._id
        });
      }
    });

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return {
      success: true,
      data: message,
      message: "Message sent successfully"
    };
  } catch (error) {
    logger.error("Failed to send team message", { error });
    throw error;
  }
};

// Get unread message count
export const getUnreadCount = async ({ params, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Count messages not read by the student
    const unreadCount = team.chatMessages.filter(msg =>
      !msg.readBy.includes(student._id)
    ).length;

    return {
      success: true,
      data: { unreadCount }
    };
  } catch (error) {
    logger.error("Failed to get unread count", { error });
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async ({ params, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Mark all messages as read for this student
    await Team.updateMany(
      { _id: team._id },
      { $addToSet: { "chatMessages.$[].readBy": student._id } }
    );

    return {
      success: true,
      message: "Messages marked as read"
    };
  } catch (error) {
    logger.error("Failed to mark messages as read", { error });
    throw error;
  }
};

// Get team announcements
export const getAnnouncements = async ({ params, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get all announcement messages
    const announcements = team.chatMessages
      .filter(msg => msg.isAnnouncement)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      success: true,
      data: announcements
    };
  } catch (error) {
    logger.error("Failed to get announcements", { error });
    throw error;
  }
};
