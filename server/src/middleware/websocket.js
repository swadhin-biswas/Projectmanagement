import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import WebSocket from "ws";
import { config } from "../config/auth.js";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";

class WebSocketMiddleware {
  constructor() {
    this.clients = new Map();
    this.teamRooms = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on("connection", async (ws, req) => {
      try {
        // Extract token from query or headers
        const token = this.extractToken(req);
        if (!token) {
          ws.close(4001, "Unauthorized");
          return;
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);
        if (!decoded.userId) {
          ws.close(4002, "Invalid token");
          return;
        }
        ws.userId = decoded.userId;

        // Store client connection
        this.clients.set(decoded.userId, ws);

        // Handle incoming messages
        ws.on("message", async (data) => {
          try {
            const message = JSON.parse(data);
            await this.handleMessage(ws, message);
          } catch (error) {
            console.error("WebSocket message error:", error);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Failed to process message",
              })
            );
          }
        });

        // Handle client disconnect
        ws.on("close", () => {
          this.clients.delete(ws.userId);
          this.leaveAllTeamRooms(ws);
        });
      } catch (error) {
        console.error("WebSocket connection error:", error);
        ws.close(4002, "Connection error");
      }
    });
  }

  extractToken(req) {
    // Try to get token from query string
    const url = new URL(req.url, "ws://localhost");
    const queryToken = url.searchParams.get("token");
    if (queryToken) return queryToken;

    // Try to get token from protocol array (Sec-WebSocket-Protocol header)
    // Access headers safely to work in different environments
    const protocols =
      req.headers &&
      (req.headers["sec-websocket-protocol"] ||
        (typeof req.headers.get === "function"
          ? req.headers.get("sec-websocket-protocol")
          : null));

    if (protocols) {
      const tokens = protocols.split(",").map((p) => p.trim());
      return tokens[0]; // First protocol is the token
    }

    return null;
  }

  async handleMessage(ws, message) {
    switch (message.type) {
      case "join_team":
        this.joinTeamRoom(ws, message.teamId);
        break;

      case "leave_team":
        this.leaveTeamRoom(ws, message.teamId);
        break;

      case "chat":
        await this.handleChatMessage(ws, message);
        break;

      default:
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Unknown message type",
          })
        );
    }
  }

  joinTeamRoom(ws, teamId) {
    if (!this.teamRooms.has(teamId)) {
      this.teamRooms.set(teamId, new Set());
    }
    this.teamRooms.get(teamId).add(ws);
    ws.teamRooms = ws.teamRooms || new Set();
    ws.teamRooms.add(teamId);
  }

  leaveTeamRoom(ws, teamId) {
    const room = this.teamRooms.get(teamId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.teamRooms.delete(teamId);
      }
    }
    if (ws.teamRooms) {
      ws.teamRooms.delete(teamId);
    }
  }

  leaveAllTeamRooms(ws) {
    if (ws.teamRooms) {
      for (const teamId of ws.teamRooms) {
        this.leaveTeamRoom(ws, teamId);
      }
    }
  }

  // Send message to specific user
  sendToUser(userId, data) {
    const client = this.clients.get(userId);
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  // Broadcast to team
  broadcastToTeam(teamId, data, excludeUserId = null) {
    const room = this.teamRooms.get(teamId);
    if (room) {
      const message = JSON.stringify(data);
      room.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          client.userId !== excludeUserId
        ) {
          client.send(message);
        }
      });
    }
  }

  // Broadcast to all connected clients
  broadcast(data) {
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async handleChatMessage(ws, message) {
    try {
      // Validate message
      if (!message.teamId || !message.content?.trim()) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
        return;
      }

      // Get team and verify membership
      const team = await Team.findById(message.teamId);
      if (!team) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Team not found'
        }));
        return;
      }

      const student = await Student.findOne({ user: ws.userId }).populate('user', 'fullName');
      if (!student || !team.members.some(m => m.user.toString() === student._id.toString())) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authorized to send messages to this team'
        }));
        return;
      }

      // Create chat message
      const chatMessage = {
        _id: new ObjectId(),  // Generate new ObjectId for the message
        sender: {
          _id: student._id,
          fullName: student.user.fullName
        },
        content: message.content.trim(),
        timestamp: new Date(),
        readBy: [student._id]
      };

      // Add message to team chat
      team.chatMessages.push(chatMessage);
      await team.save();

      // Broadcast to team members
      this.broadcastToTeam(message.teamId, {
        type: 'chat',
        teamId: message.teamId,
        message: chatMessage
      });
    } catch (error) {
      console.error('Chat message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process chat message'
      }));
    }
  }
}

export const webSocketMiddleware = new WebSocketMiddleware();
