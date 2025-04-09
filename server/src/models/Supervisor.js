// server/src/models/Supervisor.js
import mongoose from "mongoose";

// Feedback schema for student assessments
const feedbackSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  milestone: {
    type: String,
    required: true,
  },
  marks: {
    type: Number,
    min: 0,
    max: 100,
  },
  comments: String,
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["draft", "submitted", "revised"],
    default: "draft",
  },
  attachments: [
    {
      filename: String,
      path: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  categories: [
    {
      name: String,
      score: Number,
      maxScore: Number,
      comments: String,
    },
  ],
});

// Meeting tracking schema
const meetingSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
  },
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  duration: Number, // in minutes
  attendees: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      attended: {
        type: Boolean,
        default: false,
      },
    },
  ],
  notes: String,
  agenda: [String],
  outcomes: [String],
  nextSteps: [String],
  meetingType: {
    type: String,
    enum: ["regular", "emergency", "review", "other"],
    default: "regular",
  },
  status: {
    type: String,
    enum: ["scheduled", "completed", "cancelled", "rescheduled"],
    default: "scheduled",
  },
  notificationSent: {
    type: Boolean,
    default: false,
  },
});

// Progress tracking
const progressTrackingSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
  },
  lastChecked: {
    type: Date,
    default: Date.now,
  },
  overallProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  milestones: [
    {
      name: String,
      dueDate: Date,
      status: {
        type: String,
        enum: [
          "pending",
          "in_progress",
          "completed",
          "delayed",
          "not_submitted",
        ],
        default: "pending",
      },
      feedback: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feedback",
      },
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      comments: String,
    },
  ],
  riskAssessment: {
    level: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    reasons: [String],
    mitigationPlan: String,
    lastAssessed: {
      type: Date,
      default: Date.now,
    },
  },
  supervisorNotes: [
    {
      note: String,
      date: {
        type: Date,
        default: Date.now,
      },
      visibility: {
        type: String,
        enum: ["private", "team", "admin"],
        default: "private",
      },
    },
  ],
});

// Communication record
const communicationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["email", "notification", "meeting", "feedback", "other"],
    required: true,
  },
  recipients: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
  },
  subject: String,
  content: String,
  sentAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["sent", "delivered", "read", "failed"],
    default: "sent",
  },
  attachments: [
    {
      filename: String,
      path: String,
    },
  ],
  metadata: {
    category: String,
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    responseRequired: {
      type: Boolean,
      default: false,
    },
    responseDeadline: Date,
  },
});

// Analytics metrics
const analyticsSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  teamMetrics: {
    totalTeams: {
      type: Number,
      default: 0,
    },
    teamsByProgress: {
      onTrack: {
        type: Number,
        default: 0,
      },
      atRisk: {
        type: Number,
        default: 0,
      },
      delayed: {
        type: Number,
        default: 0,
      },
    },
    averageProgress: {
      type: Number,
      default: 0,
    },
  },
  studentMetrics: {
    totalStudents: {
      type: Number,
      default: 0,
    },
    activeStudents: {
      type: Number,
      default: 0,
    },
    submittedReports: {
      type: Number,
      default: 0,
    },
    averagePerformance: {
      type: Number,
      default: 0,
    },
  },
  projectMetrics: {
    totalProjects: {
      type: Number,
      default: 0,
    },
    projectsByType: mongoose.Schema.Types.Mixed, // { "research": 5, "development": 3 }
    projectsByStatus: mongoose.Schema.Types.Mixed, // { "onTrack": 6, "delayed": 2 }
  },
  activityMetrics: {
    meetingsHeld: {
      type: Number,
      default: 0,
    },
    feedbacksProvided: {
      type: Number,
      default: 0,
    },
    communicationsSent: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0, // hours
    },
  },
});

// Main Supervisor schema
const supervisorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    supervisorId: {
      type: String,
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    researchInterests: [String],
    availability: {
      maxTeams: {
        type: Number,
        default: 5,
      },
      preferredProjectTypes: [String],
      restrictedTimes: [
        {
          day: String,
          startTime: String,
          endTime: String,
          reason: String,
        },
      ],
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    feedbacks: [feedbackSchema],
    meetings: [meetingSchema],
    communications: [communicationSchema],
    progressTracking: [progressTrackingSchema],
    analytics: analyticsSchema,
    preferences: {
      notificationSettings: {
        emailNotifications: {
          type: Boolean,
          default: true,
        },
        submissionAlerts: {
          type: Boolean,
          default: true,
        },
        meetingReminders: {
          type: Boolean,
          default: true,
        },
        urgentAlerts: {
          type: Boolean,
          default: true,
        },
      },
      displayPreferences: {
        defaultView: {
          type: String,
          enum: ["teams", "students", "projects", "calendar"],
          default: "teams",
        },
        teamsPerPage: {
          type: Number,
          default: 10,
        },
        showCompletedProjects: {
          type: Boolean,
          default: false,
        },
      },
    },
    expertise: [
      {
        area: String,
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
          default: "intermediate",
        },
      },
    ],
    biography: {
      type: String,
      trim: true,
    },
    contactDetails: {
      officeLocation: String,
      officeHours: String,
      alternateEmail: String,
      phone: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDate: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total number of teams
supervisorSchema.virtual("teamsCount").get(function () {
  return this.teams ? this.teams.length : 0;
});

// Virtual for total number of students
supervisorSchema.virtual("studentsCount").get(function () {
  return this.students ? this.students.length : 0;
});

// Method to add a student to supervisor
supervisorSchema.methods.addStudent = function (studentId) {
  if (!this.students.includes(studentId)) {
    this.students.push(studentId);
  }
  return this.save();
};

// Method to add a team to supervisor
supervisorSchema.methods.addTeam = function (teamId) {
  if (!this.teams.includes(teamId)) {
    this.teams.push(teamId);
  }
  return this.save();
};

// Method to record feedback
supervisorSchema.methods.recordFeedback = async function (feedbackData) {
  this.feedbacks.push(feedbackData);

  // Update analytics
  if (!this.analytics) {
    this.analytics = {};
  }
  if (!this.analytics.activityMetrics) {
    this.analytics.activityMetrics = { feedbacksProvided: 0 };
  }
  this.analytics.activityMetrics.feedbacksProvided =
    (this.analytics.activityMetrics.feedbacksProvided || 0) + 1;
  this.analytics.lastUpdated = new Date();

  await this.save();
  return this.feedbacks[this.feedbacks.length - 1];
};

// Method to record meeting
supervisorSchema.methods.scheduleMeeting = async function (meetingData) {
  this.meetings.push(meetingData);
  await this.save();
  return this.meetings[this.meetings.length - 1];
};

// Method to record communication
supervisorSchema.methods.recordCommunication = async function (
  communicationData
) {
  this.communications.push(communicationData);

  // Update analytics
  if (!this.analytics) {
    this.analytics = {};
  }
  if (!this.analytics.activityMetrics) {
    this.analytics.activityMetrics = { communicationsSent: 0 };
  }
  this.analytics.activityMetrics.communicationsSent =
    (this.analytics.activityMetrics.communicationsSent || 0) + 1;
  this.analytics.lastUpdated = new Date();

  await this.save();
  return this.communications[this.communications.length - 1];
};

// Method to update team progress
supervisorSchema.methods.updateTeamProgress = async function (
  teamId,
  progressData
) {
  const existingTracking = this.progressTracking.find(
    (tracking) => tracking.team.toString() === teamId.toString()
  );

  if (existingTracking) {
    // Update existing progress tracking
    Object.assign(existingTracking, progressData);
    existingTracking.lastChecked = new Date();
  } else {
    // Create new progress tracking
    this.progressTracking.push({
      team: teamId,
      ...progressData,
      lastChecked: new Date(),
    });
  }

  await this.save();
  return this.progressTracking.find(
    (tracking) => tracking.team.toString() === teamId.toString()
  );
};

// Method to calculate analytics
supervisorSchema.methods.calculateAnalytics = async function (sessionId) {
  if (!this.analytics) {
    this.analytics = {};
  }

  const session =
    sessionId || (this.progressTracking[0] && this.progressTracking[0].session);
  if (!session) return null;

  // Calculate team metrics
  const teams = await mongoose.model("Team").find({ _id: { $in: this.teams } });
  const totalTeams = teams.length;

  let teamsByProgress = { onTrack: 0, atRisk: 0, delayed: 0 };
  let totalProgress = 0;

  for (const tracking of this.progressTracking) {
    totalProgress += tracking.overallProgress || 0;

    if (tracking.riskAssessment) {
      if (tracking.riskAssessment.level === "low") {
        teamsByProgress.onTrack++;
      } else if (["medium", "high"].includes(tracking.riskAssessment.level)) {
        teamsByProgress.atRisk++;
      } else if (tracking.riskAssessment.level === "critical") {
        teamsByProgress.delayed++;
      }
    }
  }

  // Calculate student metrics
  const totalStudents = this.students.length;
  // Count unique students in feedback
  const studentsWithFeedback = new Set(
    this.feedbacks.map((f) => f.student.toString())
  );
  const submittedReports = this.feedbacks.length;

  // Calculate project metrics
  const projects = await mongoose
    .model("Project")
    .find({ _id: { $in: this.projects } });
  const totalProjects = projects.length;

  // Project by type distribution
  const projectsByType = projects.reduce((acc, project) => {
    acc[project.type] = (acc[project.type] || 0) + 1;
    return acc;
  }, {});

  // Project by status distribution
  const projectsByStatus = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  // Activity metrics
  const meetingsHeld = this.meetings.filter(
    (m) => m.status === "completed"
  ).length;
  const feedbacksProvided = this.feedbacks.length;
  const communicationsSent = this.communications.length;

  // Update analytics object
  this.analytics = {
    session,
    lastUpdated: new Date(),
    teamMetrics: {
      totalTeams,
      teamsByProgress,
      averageProgress: totalTeams > 0 ? totalProgress / totalTeams : 0,
    },
    studentMetrics: {
      totalStudents,
      activeStudents: studentsWithFeedback.size,
      submittedReports,
      averagePerformance: 0, // Requires additional calculation
    },
    projectMetrics: {
      totalProjects,
      projectsByType,
      projectsByStatus,
    },
    activityMetrics: {
      meetingsHeld,
      feedbacksProvided,
      communicationsSent,
      averageResponseTime: 0, // Requires additional data
    },
  };

  await this.save();
  return this.analytics;
};

// Method to send email
supervisorSchema.methods.sendEmail = async function (emailData) {
  const communication = {
    type: "email",
    recipients: emailData.recipients,
    team: emailData.team,
    subject: emailData.subject,
    content: emailData.content,
    sentAt: new Date(),
    status: "sent",
    attachments: emailData.attachments || [],
    metadata: emailData.metadata || {},
  };

  return this.recordCommunication(communication);
};

// Method to send notification
supervisorSchema.methods.sendNotification = async function (notificationData) {
  const communication = {
    type: "notification",
    recipients: notificationData.recipients,
    team: notificationData.team,
    subject: notificationData.subject,
    content: notificationData.content,
    sentAt: new Date(),
    status: "sent",
    metadata: notificationData.metadata || {},
  };

  // Create notifications in the Notification collection
  const Notification = mongoose.model("Notification");
  const notifications = notificationData.recipients.map((userId) => ({
    user: userId,
    title: notificationData.subject,
    message: notificationData.content,
    type: notificationData.metadata?.category || "supervisor_notification",
    metadata: {
      supervisorId: this._id,
      teamId: notificationData.team,
    },
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return this.recordCommunication(communication);
};

// Method to add expertise
supervisorSchema.methods.addExpertise = function (expertise) {
  if (!this.expertise) {
    this.expertise = [];
  }

  // Check if expertise already exists
  const existingIndex = this.expertise.findIndex(
    (e) => e.area === expertise.area
  );
  if (existingIndex !== -1) {
    this.expertise[existingIndex] = expertise;
  } else {
    this.expertise.push(expertise);
  }

  return this.save();
};

// Method to get team details
supervisorSchema.methods.getTeamDetails = async function (teamId) {
  if (!teamId) {
    return this.populate("teams");
  }

  if (!this.teams.some((t) => t.toString() === teamId.toString())) {
    throw new Error("Team not supervised by this supervisor");
  }

  return mongoose
    .model("Team")
    .findById(teamId)
    .populate({
      path: "members.user",
      select: "fullName email profilePicture",
    })
    .populate("project")
    .populate("session");
};

// Method to get student details
supervisorSchema.methods.getStudentDetails = async function (studentId) {
  if (!studentId) {
    return this.populate("students");
  }

  if (!this.students.some((s) => s.toString() === studentId.toString())) {
    throw new Error("Student not supervised by this supervisor");
  }

  return mongoose.model("User").findById(studentId).select("-password");
};

// Create and export the model
const Supervisor =
  mongoose.models.Supervisor || mongoose.model("Supervisor", supervisorSchema);

export { Supervisor };
