import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'system',
      'supervisor_message',
      'team_invite',
      'submission_feedback',
      'deadline_reminder',
      'grade_assigned'
    ],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Notifications expire after 30 days by default
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });

// Add method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  return this.save();
};

// Create static method to mark multiple notifications as read
notificationSchema.statics.markManyAsRead = async function(userId, notificationIds) {
  return this.updateMany(
    {
      user: userId,
      _id: { $in: notificationIds }
    },
    {
      $set: { isRead: true }
    }
  );
};

// Get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export { Notification };
