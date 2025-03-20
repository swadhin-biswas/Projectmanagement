// server/src/models/Student.js
import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^STU\d{3,6}$/.test(v);
      },
      message: 'Student ID must start with STU followed by 3-6 digits'
    }
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  isTeamLeader: {
    type: Boolean,
    default: false
  },
  academicYear: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: 'Academic year must be in format YYYY-YYYY'
    }
  },
  semester: {
    type: String,
    enum: ['Spring', 'Summer', 'Fall', 'Winter']
  },
  graduationYear: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes are automatically created by the unique: true in the schema fields

// Prevent model recompilation
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

// Export as named export only
export { Student };
