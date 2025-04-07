import { Elysia } from "elysia";
import { Message } from "../models/Message.js";
import { Notification } from "../models/Notification.js";
import { Team } from "../models/Team.js";
import logger from "../utils/logger.js";

// Create an Elysia router for messaging operations
export const messageRoutes = new Elysia({ prefix: "/api/messages" })
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
  // Get messages for a team
  .get("/teams/:teamId", async ({ params, query, store }) => {
    try {
      const { teamId } = params;
      const { limit = 50, before, after } = query;
      const { user } = store;

      // Verify team membership
      const team = await Team.findOne({
        _id: teamId,
        "members.user": user._id,
        "members.status": "active",
      });

      if (!team) {
        return {
          success: false,
          error: "Team not found or user is not a member",
          status: 404,
        };
      }

      // Query parameters
      const queryOptions = {
        team: teamId,
        isDeleted: { $ne: true },
      };

      if (before) {
        queryOptions._id = { $lt: before };
      } else if (after) {
        queryOptions._id = { $gt: after };
      }

      // Get messages
      const messages = await Message.find(queryOptions)
        .sort({ createdAt: before ? -1 : 1 })
        .limit(Number(limit))
        .populate("sender", "fullName profilePicture")
        .populate("readBy", "fullName profilePicture");

      // Mark messages as read by this user
      const unreadMessages = messages.filter(
        (msg) =>
          !msg.readBy.some((rb) => rb._id.toString() === user._id.toString())
      );

      if (unreadMessages.length > 0) {
        await Message.updateMany(
          {
            _id: { $in: unreadMessages.map((msg) => msg._id) },
            readBy: { $ne: user._id },
          },
          { $addToSet: { readBy: user._id } }
        );
      }

      // Send response
      return {
        success: true,
        messages: before ? messages.reverse() : messages,
        meta: {
          limit: Number(limit),
          hasMore: messages.length === Number(limit),
        },
      };
    } catch (error) {
      logger.error("Failed to fetch team messages:", error);
      return {
        success: false,
        error: "Failed to fetch team messages",
        status: 500,
      };
    }
  })

  // Send a message to a team
  .post("/teams/:teamId", async ({ params, body, store }) => {
    try {
      const { teamId } = params;
      const { content, attachments } = body;
      const { user } = store;

      // Verify team membership
      const team = await Team.findOne({
        _id: teamId,
        "members.user": user._id,
        "members.status": "active",
      });

      if (!team) {
        return {
          success: false,
          error: "Team not found or user is not a member",
          status: 404,
        };
      }

      // Create message
      const message = new Message({
        team: teamId,
        sender: user._id,
        content,
        attachments: attachments || [],
        readBy: [user._id], // Sender has read the message
        createdAt: new Date(),
      });

      await message.save();

      // Populate sender information for the response
      await message.populate("sender", "fullName profilePicture");

      // Get active team members except the sender
      const teamMembers = team.members
        .filter(
          (member) =>
            member.status === "active" &&
            member.user.toString() !== user._id.toString()
        )
        .map((member) => member.user);

      // Create notifications for team members
      if (teamMembers.length > 0) {
        const notifications = teamMembers.map((memberId) => ({
          user: memberId,
          type: "new_message",
          title: "New Team Message",
          message: `${user.fullName} sent a message to ${team.name}`,
          link: `/teams/${teamId}/chat`,
          isRead: false,
          createdAt: new Date(),
          metadata: {
            teamId,
            messageId: message._id,
          },
        }));

        await Notification.insertMany(notifications);

        // Send real-time notifications
        if (global.io) {
          // Broadcast message to team channel
          global.io.to(`team:${teamId}`).emit("message:new", message);

          // Send individual notifications
          teamMembers.forEach((memberId) => {
            global.io.to(`user:${memberId}`).emit("notification:new", {
              type: "new_message",
              teamId,
              messageId: message._id,
            });
          });
        }
      }

      return {
        success: true,
        message,
      };
    } catch (error) {
      logger.error("Failed to send team message:", error);
      return {
        success: false,
        error: "Failed to send team message",
        status: 500,
      };
    }
  })

  // Delete a message
  .delete("/:messageId", async ({ params, store }) => {
    try {
      const { messageId } = params;
      const { user } = store;

      // Find message and verify ownership
      const message = await Message.findOne({
        _id: messageId,
        sender: user._id,
        isDeleted: { $ne: true },
      });

      if (!message) {
        return {
          success: false,
          error: "Message not found or you do not have permission to delete it",
          status: 404,
        };
      }

      // Soft delete the message
      message.isDeleted = true;
      message.content = "[This message was deleted]";
      message.attachments = [];
      message.updatedAt = new Date();

      await message.save();

      // Notify team channel about deleted message
      if (global.io) {
        global.io.to(`team:${message.team}`).emit("message:deleted", {
          messageId: message._id,
        });
      }

      return {
        success: true,
        message: "Message deleted successfully",
      };
    } catch (error) {
      logger.error("Failed to delete message:", error);
      return {
        success: false,
        error: "Failed to delete message",
        status: 500,
      };
    }
  })

  // Edit a message
  .patch("/:messageId", async ({ params, body, store }) => {
    try {
      const { messageId } = params;
      const { content } = body;
      const { user } = store;

      // Find message and verify ownership
      const message = await Message.findOne({
        _id: messageId,
        sender: user._id,
        isDeleted: { $ne: true },
      });

      if (!message) {
        return {
          success: false,
          error: "Message not found or you do not have permission to edit it",
          status: 404,
        };
      }

      // Update message content
      message.content = content;
      message.isEdited = true;
      message.updatedAt = new Date();

      await message.save();

      // Notify team channel about edited message
      if (global.io) {
        global.io.to(`team:${message.team}`).emit("message:edited", message);
      }

      return {
        success: true,
        message,
      };
    } catch (error) {
      logger.error("Failed to edit message:", error);
      return {
        success: false,
        error: "Failed to edit message",
        status: 500,
      };
    }
  })

  // React to a message
  .post("/:messageId/reactions", async ({ params, body, store }) => {
    try {
      const { messageId } = params;
      const { reaction } = body;
      const { user } = store;

      const message = await Message.findById(messageId);

      if (!message) {
        return {
          success: false,
          error: "Message not found",
          status: 404,
        };
      }

      // Check if user already reacted with this emoji
      const existingReactionIndex = message.reactions.findIndex(
        (r) =>
          r.user.toString() === user._id.toString() && r.reaction === reaction
      );

      if (existingReactionIndex !== -1) {
        // Remove existing reaction (toggle off)
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Add new reaction
        message.reactions.push({
          user: user._id,
          reaction,
          createdAt: new Date(),
        });
      }

      await message.save();

      // Notify team channel about reaction update
      if (global.io) {
        global.io.to(`team:${message.team}`).emit("message:reaction", {
          messageId: message._id,
          reactions: message.reactions,
        });
      }

      return {
        success: true,
        reactions: message.reactions,
      };
    } catch (error) {
      logger.error("Failed to react to message:", error);
      return {
        success: false,
        error: "Failed to react to message",
        status: 500,
      };
    }
  });

export default messageRoutes;
