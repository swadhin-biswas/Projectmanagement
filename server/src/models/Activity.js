import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'milestone_created',
      'milestone_updated',
      'milestone_completed',
      'milestone_deleted',
      'submission_created',
      'submission_updated',
      'feedback_received',
      'member_joined',
      'member_left',
      'chat_message',
      'file_uploaded',
      'project_updated'
    ]
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Ensure text search on description
activitySchema.index({ description: 'text' });

// Method to format activity for client
activitySchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static method to create activity with notification
activitySchema.statics.createWithNotification = async function(data) {
  const activity = await this.create(data);

  // Broadcast to project room if socket.io is available
  if (global.io) {
    global.io.to(`project:${data.project}:activities`).emit('activity:new', activity);
  }

  return activity;
};

// Prevent model recompilation
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

export { Activity };
