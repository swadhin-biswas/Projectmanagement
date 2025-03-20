// server/src/models/Supervisor.js
import mongoose from 'mongoose';

const supervisorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  supervisorId: {
    type: String,
    required: [true, 'Supervisor ID is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^SUP\d{3,6}$/.test(v);
      },
      message: 'Supervisor ID must start with SUP followed by 3-6 digits'
    }
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  assignedTeams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full profile
supervisorSchema.virtual('fullProfile', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Pre-find middleware to populate user data
supervisorSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'fullName email department'
  });
  next();
});

// Prevent model recompilation
const Supervisor = mongoose.models.Supervisor || mongoose.model('Supervisor', supervisorSchema);

export { Supervisor };
