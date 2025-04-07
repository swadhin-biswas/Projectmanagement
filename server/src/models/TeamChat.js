import mongoose from "mongoose";

const teamChatSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  attachments: [{
    url: String,
    type: String, // file type/mimetype
    name: String
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isAnnouncement: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
teamChatSchema.index({ teamId: 1, createdAt: -1 });
teamChatSchema.index({ sender: 1 });
teamChatSchema.index({ "readBy.user": 1 });

// Method to mark message as read by a user
teamChatSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.some(read => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId });
    await this.save();
  }
  return this;
};

// Static method to get unread messages count
teamChatSchema.statics.getUnreadCount = async function(teamId, userId) {
  return this.countDocuments({
    teamId,
    "readBy.user": { $ne: userId },
    sender: { $ne: userId }
  });
};

export const TeamChat = mongoose.model("TeamChat", teamChatSchema);