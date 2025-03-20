import mongoose from 'mongoose';

const deadlineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Deadline name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Deadline date is required']
  },
  type: {
    type: String,
    enum: ['project_submission', 'report_submission', 'presentation', 'other'],
    required: [true, 'Deadline type is required']
  },
  description: String,
  notifyBefore: {
    type: Number,
    default: 7, // Days before deadline to send notification
    min: 1,
    max: 30
  }
});

const sessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    unique: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'upcoming'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  deadlines: [deadlineSchema],
  description: {
    type: String,
    trim: true
  },
  academicYear: String,
  semester: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validate session duration (4-5 months)
sessionSchema.pre('save', function(next) {
  const durationInMonths = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24 * 30);
  if (durationInMonths < 4 || durationInMonths > 5) {
    return next(new Error('Session duration must be between 4 and 5 months'));
  }
  return next();
});

// Validate deadlines are within session period
sessionSchema.pre('save', function(next) {
  if (this.deadlines?.length > 0) {
    const invalidDeadlines = this.deadlines.filter(
      deadline => deadline.date < this.startDate || deadline.date > this.endDate
    );
    if (invalidDeadlines.length > 0) {
      return next(new Error('All deadlines must be within the session period'));
    }
  }
  return next();
});

// Update status based on dates
sessionSchema.pre('save', function(next) {
  const now = new Date();
  if (now < this.startDate) {
    this.status = 'upcoming';
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = 'active';
  } else {
    this.status = 'completed';
  }
  return next();
});

// Virtual for duration in months
sessionSchema.virtual('durationMonths').get(function() {
  return Math.round((this.endDate - this.startDate) / (1000 * 60 * 60 * 24 * 30));
});

// Virtual for progress percentage
sessionSchema.virtual('progress').get(function() {
  const now = new Date();
  if (now < this.startDate) return 0;
  if (now > this.endDate) return 100;
  const total = this.endDate - this.startDate;
  const current = now - this.startDate;
  return Math.round((current / total) * 100);
});

// Method to check if a date is within the session period
sessionSchema.methods.isDateWithinSession = function(date) {
  return date >= this.startDate && date <= this.endDate;
};

// Method to get upcoming deadlines
sessionSchema.methods.getUpcomingDeadlines = function() {
  const now = new Date();
  return this.deadlines
    .filter(deadline => deadline.date > now)
    .sort((a, b) => a.date - b.date);
};

// Method to validate if session can be activated
sessionSchema.methods.canActivate = function() {
  return this.status === 'draft' && this.deadlines.length > 0;
};

// Check if model exists already to prevent overwrite error
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

// Export as named export only
export { Session };