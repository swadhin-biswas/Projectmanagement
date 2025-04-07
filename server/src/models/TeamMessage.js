import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'document', 'video', 'link'],
    default: 'link'
  },
  name: String
});

const teamMessageSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [attachmentSchema],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const TeamMessage = mongoose.model('TeamMessage', teamMessageSchema);
