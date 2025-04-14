// filepath: /home/swadhin/r/server/src/models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  recipientType: {
    type: String,
    enum: ["student", "supervisor", "team", "admin"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    default: "",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  attachments: [
    {
      url: String,
      name: String,
      type: {
        type: String,
        enum: ["image", "document", "video", "link"],
        default: "document",
      },
    },
  ],
  importance: {
    type: String,
    enum: ["low", "normal", "high"],
    default: "normal",
  },
  category: {
    type: String,
    enum: ["general", "team", "project", "deadline", "system"],
    default: "general",
  },
});

// Export the Message model, reusing it if already defined
export const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
