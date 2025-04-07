import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map(); // Map of userId -> WebSocket
    this.teamRooms = new Map(); // Map of teamId -> Set of WebSocket

    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Authenticate connection
        const token = req.headers['sec-websocket-protocol'];
        if (!token) {
          ws.close(4001, 'Authentication required');
          return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
          ws.close(4002, 'User not found');
          return;
        }

        // Store client connection
        this.clients.set(user._id.toString(), ws);
        ws.userId = user._id.toString();

        // If user is a student, join their team room
        if (user.role === 'student') {
          const student = await Student.findOne({ user: user._id });
          if (student?.team) {
            this.joinTeamRoom(ws, student.team.toString());
          }
        }

        // Handle incoming messages
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data);
            switch (message.type) {
              case 'chat':
                await this.handleChatMessage(ws, message);
                break;
              case 'notification':
                await this.handleNotification(ws, message);
                break;
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to process message'
            }));
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.clients.delete(ws.userId);
          this.leaveAllTeamRooms(ws);
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(4000, 'Connection error');
      }
    });
  }

  async handleChatMessage(ws, message) {
    const { teamId, content } = message;

    // Validate team membership
    const team = await Team.findById(teamId);
    if (!team || !team.members.some(m => m.user.toString() === ws.userId)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authorized to send messages to this team'
      }));
      return;
    }

    // Save message to database
    team.chatMessages.push({
      sender: ws.userId,
      content
    });
    await team.save();

    // Broadcast to team members
    const roomClients = this.teamRooms.get(teamId) || new Set();
    const messageData = JSON.stringify({
      type: 'chat',
      teamId,
      message: {
        sender: ws.userId,
        content,
        timestamp: new Date().toISOString()
      }
    });

    for (const client of roomClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageData);
      }
    }
  }

  async handleNotification(ws, data) {
    const { recipients, ...notificationData } = data;

    // Send to specific recipients
    recipients.forEach(userId => {
      const recipientWs = this.clients.get(userId);
      if (recipientWs?.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify({
          type: 'notification',
          ...notificationData
        }));
      }
    });
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

  // Broadcast to all connected clients
  broadcast(data) {
    const message = JSON.stringify(data);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export default WebSocketService;