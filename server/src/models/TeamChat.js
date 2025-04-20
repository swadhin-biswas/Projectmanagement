import { Schema, model } from "mongoose";

const teamChatSchema = new Schema({
  team: {
    type: Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  teamId: {
    type: String, // Changed from Schema.Types.ObjectId to String
    required: false, // Optional to align with studentController.js
    match: /^[A-Za-z0-9]{6,8}$/, // Validate format (6-8 alphanumeric characters)
  },
  content: {
    type: String,
    required: false,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "Student",
    required: false,
  },
  messages: [
    {
      type: {
        type: String,
        enum: ["system", "user"],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const TeamChat = model("TeamChat", teamChatSchema);