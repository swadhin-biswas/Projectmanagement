// server/src/models/User.js
import argon2 from '@node-rs/argon2';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [50, 'Full name cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9\s\-\.,']+$/, 'Full name can contain letters, numbers, spaces, and basic punctuation']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
    validate: {
      validator: function(v) {
        // Skip validation if password is already hashed
        if (this.isModified('password')) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        }
        return true;
      },
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'supervisor', 'admin', 'superadmin'],
      message: 'Role must be either student, supervisor, admin, or superadmin'
    },
    required: [true, 'Role is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    minlength: [2, 'Department must be at least 2 characters'],
    maxlength: [50, 'Department cannot exceed 50 characters'],
    match: [/^[a-zA-Z\s&',.]+$/, 'Department can only contain letters, spaces, and basic punctuation']
  },
  isApproved: {
    type: Boolean,
    default: function() {
      return this.role === 'student' || this.role === 'admin';
    }
  },
  profilePicture: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/[^\s/$.?#].[^\s]*\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?$/i.test(v);
      },
      message: 'Profile picture must be a valid image URL (jpg, jpeg, png, gif, or webp)'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'blocked'],
    default: 'pending'
  },
  contactNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-]{8,}$/, 'Please enter a valid contact number']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  // System fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  passwordChangedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Hash password before saving (only one middleware)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    this.password = await argon2.hash(this.password);
    this.passwordChangedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) return false;
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Static method to check if superadmin exists
userSchema.statics.superadminExists = async function() {
  return await this.exists({ role: 'superadmin' });
};

// Instance method to check if user is superadmin
userSchema.methods.isSuperAdmin = function() {
  return this.role === 'superadmin';
};

// Prevent superadmin deletion
userSchema.pre('remove', async function(next) {
  if (this.role === 'superadmin') {
    throw new Error('Super Admin account cannot be deleted');
  }
  next();
});

// Prevent superadmin role change
userSchema.pre('save', function(next) {
  if (this.isModified('role') && this._previousRole === 'superadmin') {
    throw new Error('Super Admin role cannot be changed');
  }
  this._previousRole = this.role;
  next();
});

// Remove duplicate index (index is already defined in email field options)
// userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Student schema
const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  semester: Number,
  batch: String,
  skills: [String],
  achievements: [{
    title: String,
    value: Number,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Supervisor specific schema
const supervisorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supervisorId: {
    type: String,
    required: true,
    unique: true
  },
  specialization: String,
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }]
});

// Message schema
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  subject: String,
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Project schema
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  submissionLink: String,
  submittedAt: Date
});

// Notification schema
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  message: String,
  type: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create model (prevent recompilation)
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Supervisor = mongoose.models.Supervisor || mongoose.model('Supervisor', supervisorSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// Export as named export only
export { Message, Notification, Project, Student, Supervisor, User };
