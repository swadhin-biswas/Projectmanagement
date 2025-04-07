import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { reminderService } from "../services/ReminderService.js";
import logger from "../utils/logger.js";

export const initWebSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      logger.error("WebSocket authentication failed:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    logger.info("Client connected:", socket.userId);

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Calendar event handlers
    socket.on("calendar:join", (projectId) => {
      socket.join(`project:${projectId}:calendar`);
      logger.info("Joined calendar room:", {
        projectId,
        userId: socket.userId,
      });
    });

    socket.on("calendar:leave", (projectId) => {
      socket.leave(`project:${projectId}:calendar`);
      logger.info("Left calendar room:", { projectId, userId: socket.userId });
    });

    // Project milestone collaboration events
    socket.on("milestone:update", async (data) => {
      try {
        const { projectId, milestoneId } = data;
        const room = `project:${projectId}`;
        socket.to(room).emit("milestone:updated", data);
        logger.info("Milestone update broadcast:", { projectId, milestoneId });
      } catch (error) {
        logger.error("Milestone update broadcast failed:", error);
      }
    });

    socket.on("milestone:create", async (data) => {
      try {
        const { projectId } = data;
        const room = `project:${projectId}`;
        socket.to(room).emit("milestone:created", data);
        logger.info("New milestone broadcast:", { projectId });
      } catch (error) {
        logger.error("Milestone creation broadcast failed:", error);
      }
    });

    socket.on("milestone:delete", async (data) => {
      try {
        const { projectId, milestoneId } = data;
        const room = `project:${projectId}`;
        socket.to(room).emit("milestone:deleted", data);
        logger.info("Milestone deletion broadcast:", {
          projectId,
          milestoneId,
        });
      } catch (error) {
        logger.error("Milestone deletion broadcast failed:", error);
      }
    });

    socket.on("milestone:assign", async (data) => {
      try {
        const { projectId, milestoneId, memberId } = data;
        const room = `project:${projectId}`;
        socket.to(room).emit("milestone:assigned", data);
        // Also notify the assigned member
        socket.to(`user:${memberId}`).emit("milestone:assigned_to_you", data);
        logger.info("Milestone assignment broadcast:", {
          projectId,
          milestoneId,
          memberId,
        });
      } catch (error) {
        logger.error("Milestone assignment broadcast failed:", error);
      }
    });

    socket.on("milestone:complete", async (data) => {
      try {
        const { projectId, milestoneId } = data;
        const room = `project:${projectId}`;
        socket.to(room).emit("milestone:completed", data);
        logger.info("Milestone completion broadcast:", {
          projectId,
          milestoneId,
        });
      } catch (error) {
        logger.error("Milestone completion broadcast failed:", error);
      }
    });

    socket.on("join", (room) => {
      socket.join(room);
      logger.info(`User ${socket.userId} joined room: ${room}`);
    });

    socket.on("leave", (room) => {
      socket.leave(room);
      logger.info(`User ${socket.userId} left room: ${room}`);
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected:", socket.userId);
    });
  });

  // Start reminder service after socket initialization
  reminderService.start();

  // Store io instance globally for use in other parts of the application
  global.io = io;

  return io;
};
