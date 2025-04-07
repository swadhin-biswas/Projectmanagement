// server/src/models/Supervisor.js
import mongoose from "mongoose";

const supervisorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    supervisorId: {
      type: String,
      required: [true, "Supervisor ID is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^SUP\d{3,6}$/.test(v);
        },
        message: "Supervisor ID must start with SUP followed by 3-6 digits",
      },
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    researchInterests: [String],
    officeHours: String,
    contactInformation: {
      officeLocation: String,
      phoneNumber: String,
      alternateEmail: String,
    },
    assignedTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    assignedProjects: [
      {
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
        role: {
          type: String,
          enum: ["primary", "secondary"],
          default: "primary",
        },
      },
    ],
    marksGiven: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
        marks: [
          {
            type: {
              type: String,
              enum: [
                "proposal",
                "progress",
                "final",
                "presentation",
                "overall",
              ],
              required: true,
            },
            score: {
              type: Number,
              required: true,
              min: 0,
              max: 100,
            },
            feedback: String,
            breakdown: {
              methodology: Number,
              implementation: Number,
              documentation: Number,
              presentation: Number,
              innovation: Number,
            },
            strengths: [String],
            improvements: [String],
            date: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    notifications: [
      {
        title: String,
        message: String,
        type: {
          type: String,
          enum: ["submission", "invitation", "deadline", "system"],
          required: true,
        },
        relatedTo: {
          model: {
            type: String,
            enum: ["Project", "Team", "Student", "Session"],
          },
          id: mongoose.Schema.Types.ObjectId,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    evaluations: [
      {
        team: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Team",
        },
        type: {
          type: String,
          enum: ["proposal", "progress", "final"],
        },
        submittedAt: Date,
        status: {
          type: String,
          enum: ["pending", "completed"],
          default: "pending",
        },
      },
    ],
    recentActivity: [
      {
        type: {
          type: String,
          enum: [
            "mark_added",
            "feedback_given",
            "notification_sent",
            "progress_update",
            "meeting_scheduled",
          ],
        },
        relatedTo: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "recentActivity.relatedModel",
        },
        relatedModel: {
          type: String,
          enum: ["Student", "Team", "Project"],
        },
        description: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    progressTracking: {
      trackedStudents: [
        {
          student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
          },
          progressNotes: [
            {
              note: String,
              date: {
                type: Date,
                default: Date.now,
              },
              progressPercentage: {
                type: Number,
                min: 0,
                max: 100,
              },
              status: {
                type: String,
                enum: ["on_track", "at_risk", "behind", "ahead"],
                default: "on_track",
              },
              milestones: [
                {
                  title: String,
                  completed: Boolean,
                  dueDate: Date,
                },
              ],
            },
          ],
          lastUpdated: Date,
        },
      ],
      trackedTeams: [
        {
          team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
          },
          progressNotes: [
            {
              note: String,
              date: {
                type: Date,
                default: Date.now,
              },
              overallProgress: {
                type: Number,
                min: 0,
                max: 100,
              },
              teamDynamics: {
                type: String,
                enum: [
                  "excellent",
                  "good",
                  "satisfactory",
                  "needs_improvement",
                  "poor",
                ],
              },
              concerns: [String],
              achievements: [String],
            },
          ],
          lastUpdated: Date,
        },
      ],
    },
    scheduledMeetings: [
      {
        title: String,
        description: String,
        withEntity: {
          type: String,
          enum: ["team", "student", "admin"],
          required: true,
        },
        entityId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "scheduledMeetings.entityType",
        },
        entityType: {
          type: String,
          enum: ["Team", "Student", "User"],
          required: true,
        },
        date: {
          type: Date,
          required: true,
        },
        duration: Number, // in minutes
        location: String,
        meetingLink: String,
        agenda: [String],
        isRecurring: {
          type: Boolean,
          default: false,
        },
        recurringPattern: {
          frequency: {
            type: String,
            enum: ["daily", "weekly", "biweekly", "monthly"],
          },
          endDate: Date,
        },
        reminderSent: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for better query performance
supervisorSchema.index({ "assignedTeams": 1 });
supervisorSchema.index({ "marksGiven.student": 1 });
supervisorSchema.index({ "scheduledMeetings.date": 1 });
supervisorSchema.index({ "progressTracking.trackedStudents.student": 1 });
supervisorSchema.index({ "progressTracking.trackedTeams.team": 1 });

// Virtual for full profile
supervisorSchema.virtual("fullProfile", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true,
});

// Add virtual for current workload
supervisorSchema.virtual('currentWorkload').get(function() {
  return {
    teams: this.assignedTeams?.length || 0,
    students: this.marksGiven?.length || 0,
    pendingMeetings: this.scheduledMeetings?.filter(m =>
      new Date(m.date) > new Date()
    ).length || 0
  };
});

// Pre-find middleware to populate user data
supervisorSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "fullName email department",
  });
  next();
});

// Method to assign marks
supervisorSchema.methods.assignMarks = async function (
  studentId,
  projectId,
  markData
) {
  const markEntry = this.marksGiven.find(
    (m) =>
      m.student.toString() === studentId.toString() &&
      m.project.toString() === projectId.toString()
  );

  if (markEntry) {
    markEntry.marks.push(markData);
  } else {
    this.marksGiven.push({
      student: studentId,
      project: projectId,
      marks: [markData],
    });
  }

  await this.save();
  return this.marksGiven;
};

// Method to get all students under supervision
supervisorSchema.methods.getAllStudents = async function () {
  const Team = mongoose.models.Team || mongoose.model("Team");
  const teams = await Team.find({ _id: { $in: this.assignedTeams } }).populate(
    "members.user"
  );

  const students = new Set();
  teams.forEach((team) => {
    team.members.forEach((member) => {
      students.add(member.user);
    });
  });

  return Array.from(students);
};

// Add a new method to track student progress
supervisorSchema.methods.updateStudentProgress = async function (
  studentId,
  progressData
) {
  const trackedStudentIndex = this.progressTracking.trackedStudents.findIndex(
    (ts) => ts.student.toString() === studentId.toString()
  );

  if (trackedStudentIndex >= 0) {
    // Update existing tracked student
    this.progressTracking.trackedStudents[
      trackedStudentIndex
    ].progressNotes.push(progressData);
    this.progressTracking.trackedStudents[trackedStudentIndex].lastUpdated =
      new Date();
  } else {
    // Add new tracked student
    if (!this.progressTracking.trackedStudents) {
      this.progressTracking.trackedStudents = [];
    }
    this.progressTracking.trackedStudents.push({
      student: studentId,
      progressNotes: [progressData],
      lastUpdated: new Date(),
    });
  }

  // Add to recent activity
  this.recentActivity.push({
    type: "progress_update",
    relatedTo: studentId,
    relatedModel: "Student",
    description: `Updated progress for student: ${progressData.note.substring(
      0,
      30
    )}...`,
    timestamp: new Date(),
  });

  await this.save();
  return this.progressTracking.trackedStudents.find(
    (ts) => ts.student.toString() === studentId.toString()
  );
};

// Add a new method to track team progress
supervisorSchema.methods.updateTeamProgress = async function (
  teamId,
  progressData
) {
  const trackedTeamIndex = this.progressTracking.trackedTeams.findIndex(
    (tt) => tt.team.toString() === teamId.toString()
  );

  if (trackedTeamIndex >= 0) {
    // Update existing tracked team
    this.progressTracking.trackedTeams[trackedTeamIndex].progressNotes.push(
      progressData
    );
    this.progressTracking.trackedTeams[trackedTeamIndex].lastUpdated =
      new Date();
  } else {
    // Add new tracked team
    if (!this.progressTracking.trackedTeams) {
      this.progressTracking.trackedTeams = [];
    }
    this.progressTracking.trackedTeams.push({
      team: teamId,
      progressNotes: [progressData],
      lastUpdated: new Date(),
    });
  }

  // Add to recent activity
  this.recentActivity.push({
    type: "progress_update",
    relatedTo: teamId,
    relatedModel: "Team",
    description: `Updated progress for team: ${progressData.note.substring(
      0,
      30
    )}...`,
    timestamp: new Date(),
  });

  await this.save();
  return this.progressTracking.trackedTeams.find(
    (tt) => tt.team.toString() === teamId.toString()
  );
};

// Method to schedule a meeting
supervisorSchema.methods.scheduleMeeting = async function (meetingData) {
  if (!this.scheduledMeetings) {
    this.scheduledMeetings = [];
  }

  this.scheduledMeetings.push(meetingData);

  // Add to recent activity
  this.recentActivity.push({
    type: "meeting_scheduled",
    relatedTo: meetingData.entityId,
    relatedModel: meetingData.entityType,
    description: `Scheduled meeting: ${meetingData.title}`,
    timestamp: new Date(),
  });

  await this.save();
  return this.scheduledMeetings[this.scheduledMeetings.length - 1];
};

// Method to check if supervisor can take more teams
supervisorSchema.methods.canTakeMoreTeams = function(sessionTeamsLimit) {
  const currentTeams = this.assignedTeams?.length || 0;
  return currentTeams < (sessionTeamsLimit || this.maxTeams);
};

// Method to check workload status
supervisorSchema.methods.getWorkloadStatus = function() {
  const currentTeams = this.assignedTeams?.length || 0;
  const maxTeams = this.maxTeams;

  if (currentTeams >= maxTeams) return 'full';
  if (currentTeams >= maxTeams * 0.8) return 'high';
  if (currentTeams >= maxTeams * 0.5) return 'moderate';
  return 'low';
};

// Prevent model recompilation
const Supervisor =
  mongoose.models.Supervisor || mongoose.model("Supervisor", supervisorSchema);

export { Supervisor };
