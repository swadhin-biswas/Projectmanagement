import { jwtVerify } from "jose";
import { Server } from "socket.io";
import { TextEncoder } from "util";
import logger from "../utils/logger.js";
import { socketEventSchema } from "../validators/teamValidator.js";

const activeUsers = new Map();
const typingUsers = new Map();

export const initializeWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error("Authentication token required");
      }

      // Remove "Bearer " prefix if present
      const actualToken = token.startsWith("Bearer ") ? token.slice(7) : token;

      // Verify token using jose
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "fallback-secret"
      );
      const { payload } = await jwtVerify(actualToken, secret);

      if (!payload || !payload.userId) {
        throw new Error("Invalid token");
      }

      // Attach payload to socket.user (or create a specific property)
      socket.user = payload; // Assuming payload contains { userId, role, email, etc. }
      next();
    } catch (error) {
      logger.error("WebSocket auth error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    activeUsers.set(userId, socket.id);

    logger.info(`User connected: ${userId}`);

    // Handle joining team chat
    socket.on("team:join", (teamId) => {
      socket.join(`team:${teamId}`);
      logger.info(`User ${userId} joined team chat: ${teamId}`);
    });

    // Handle leaving team chat
    socket.on("team:leave", (teamId) => {
      socket.leave(`team:${teamId}`);
      logger.info(`User ${userId} left team chat: ${teamId}`);
    });

    // Handle chat messages
    socket.on("team:message", async (data) => {
      try {
        const validatedData = socketEventSchema.parse({
          type: "team:message",
          ...data,
        });

        // Remove user from typing list when they send a message
        removeTypingUser(validatedData.teamId, userId);

        // Broadcast message to team
        socket.to(`team:${validatedData.teamId}`).emit("team:message", {
          ...validatedData,
          sender: {
            _id: userId,
            fullName: socket.user.fullName,
          },
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error("Message validation error:", error);
        socket.emit("error", {
          message: "Invalid message format",
        });
      }
    });

    // Handle typing indicators
    socket.on("team:typing", async (data) => {
      try {
        const validatedData = socketEventSchema.parse({
          type: "team:typing",
          ...data,
        });

        if (validatedData.isTyping) {
          addTypingUser(validatedData.teamId, userId, socket.user.fullName);
        } else {
          removeTypingUser(validatedData.teamId, userId);
        }

        // Broadcast typing status to team
        socket.to(`team:${validatedData.teamId}`).emit("team:userTyping", {
          users: getTypingUsers(validatedData.teamId),
        });
      } catch (error) {
        logger.error("Typing event validation error:", error);
      }
    });

    // Handle read receipts
    socket.on("team:markRead", async (data) => {
      try {
        const validatedData = socketEventSchema.parse({
          type: "team:markRead",
          ...data,
        });

        socket.to(`team:${validatedData.teamId}`).emit("team:messageRead", {
          messageId: validatedData.messageId,
          userId,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error("Read receipt validation error:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      activeUsers.delete(userId);
      // Remove user from all typing lists
      for (const [teamId, users] of typingUsers.entries()) {
        if (users.has(userId)) {
          removeTypingUser(teamId, userId);
          socket.to(`team:${teamId}`).emit("team:userTyping", {
            users: getTypingUsers(teamId),
          });
        }
      }
      logger.info(`User disconnected: ${userId}`);
    });
  });

  return io;
};

// Typing indicator helpers
function addTypingUser(teamId, userId, fullName) {
  if (!typingUsers.has(teamId)) {
    typingUsers.set(teamId, new Map());
  }
  typingUsers.get(teamId).set(userId, {
    fullName,
    timestamp: Date.now(),
  });

  // Clean up typing indicators after 5 seconds of inactivity
  setTimeout(() => {
    const teamTyping = typingUsers.get(teamId);
    if (teamTyping?.has(userId)) {
      const userData = teamTyping.get(userId);
      if (Date.now() - userData.timestamp > 5000) {
        removeTypingUser(teamId, userId);
      }
    }
  }, 5000);
}

function removeTypingUser(teamId, userId) {
  const teamTyping = typingUsers.get(teamId);
  if (teamTyping) {
    teamTyping.delete(userId);
    if (teamTyping.size === 0) {
      typingUsers.delete(teamId);
    }
  }
}

function getTypingUsers(teamId) {
  const teamTyping = typingUsers.get(teamId);
  if (!teamTyping) return [];

  return Array.from(teamTyping.entries()).map(([id, data]) => ({
    _id: id,
    fullName: data.fullName,
  }));
}
