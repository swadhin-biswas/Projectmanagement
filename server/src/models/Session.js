/* Session model implementation */
import mongoose from "mongoose";

const deadlineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "team_formation",
        "proposal_submission",
        "progress_report",
        "mid_evaluation",
        "final_submission",
        "presentation",
        "demo",
        "peer_review",
        "supervisor_feedback",
        "other",
      ],
      required: true,
    },
    forRoles: [
      {
        type: String,
        enum: ["student", "supervisor", "admin"],
        default: ["student"],
      },
    ],
    notificationSent: {
      type: Boolean,
      default: false,
    },
    reminderDays: {
      type: Number,
      default: 7,
      min: 1,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    submissionType: {
      type: String,
      enum: [
        "document",
        "presentation",
        "code",
        "prototype",
        "video",
        "combination",
        "other",
        "none",
      ],
      default: "document",
    },
    submissionOptions: {
      allowLateSubmission: {
        type: Boolean,
        default: false,
      },
      latePenaltyPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      maxSubmissionAttempts: {
        type: Number,
        min: 1,
        default: 1,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "extended"],
      default: "upcoming",
    },
  },
  { _id: true }
);

const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Session name is required"],
      trim: true,
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    term: {
      type: String,
      enum: ["fall", "spring", "summer", "winter", "year_long"],
      required: [true, "Term is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (endDate) {
          // End date must be at least 2 months after start date
          const minEndDate = new Date(this.startDate);
          minEndDate.setMonth(minEndDate.getMonth() + 2);
          return endDate >= minEndDate;
        },
        message: "Session duration must be at least 2 months",
      },
    },
    registrationStartDate: {
      type: Date,
      required: [true, "Registration start date is required"],
    },
    registrationEndDate: {
      type: Date,
      required: [true, "Registration end date is required"],
    },
    teamFormationStartDate: {
      type: Date,
      required: [true, "Team formation start date is required"],
    },
    teamFormationEndDate: {
      type: Date,
      required: [true, "Team formation end date is required"],
    },
    minTeamSize: {
      type: Number,
      required: [true, "Minimum team size is required"],
      default: 2,
      min: 2,
      max: 4,
    },
    maxTeamSize: {
      type: Number,
      required: [true, "Maximum team size is required"],
      default: 4,
      min: 2,
      max: 4,
      validate: {
        validator: function (maxTeamSize) {
          return maxTeamSize >= this.minTeamSize && maxTeamSize <= 4;
        },
        message:
          "Maximum team size must be between 2 and 4 and greater than or equal to minimum team size",
      },
    },
    allowStudentInitiatedTeams: {
      type: Boolean,
      default: true,
    },
    allowSupervisorInitiatedProjects: {
      type: Boolean,
      default: true,
    },
    autoAssignTeamsWithoutSupervisors: {
      type: Boolean,
      default: false,
    },
    deadlines: [deadlineSchema],
    status: {
      type: String,
      enum: [
        "upcoming",
        "registration",
        "team_formation",
        "active",
        "evaluation",
        "completed",
        "archived",
      ],
      default: "upcoming",
    },
    description: {
      type: String,
      trim: true,
    },
    academicPrograms: [
      {
        type: String,
        trim: true,
      },
    ],
    departments: [
      {
        type: String,
        trim: true,
      },
    ],
    projectCategories: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    researchDomains: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    supervisorCapacity: {
      type: Number,
      min: 1,
      default: 5,
    },
    supervisorMinimumLoad: {
      type: Number,
      min: 0,
      default: 1,
    },
    projectsPerStudent: {
      type: Number,
      min: 1,
      default: 1,
    },
    // New fields for enhanced admin functionality
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timelineDefinitions: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: String,
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        color: {
          type: String,
          default: "#3498db",
        },
        tasks: [
          {
            title: {
              type: String,
              required: true,
            },
            description: String,
            dueDate: {
              type: Date,
              required: true,
            },
            assignedTo: {
              type: String,
              enum: ["students", "supervisors", "admins", "all"],
              default: "all",
            },
            priority: {
              type: String,
              enum: ["low", "medium", "high", "critical"],
              default: "medium",
            },
            status: {
              type: String,
              enum: ["pending", "in_progress", "completed", "delayed"],
              default: "pending",
            },
          },
        ],
        // Track overall progress
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
      },
    ],
    // Analytics configurations
    analyticsSettings: {
      enableRealTimeTracking: {
        type: Boolean,
        default: true,
      },
      trackingMetrics: {
        studentProgress: {
          type: Boolean,
          default: true,
        },
        supervisorPerformance: {
          type: Boolean,
          default: true,
        },
        teamCollaboration: {
          type: Boolean,
          default: true,
        },
        projectQuality: {
          type: Boolean,
          default: true,
        },
      },
      reportingFrequency: {
        type: String,
        enum: ["daily", "weekly", "biweekly", "monthly"],
        default: "weekly",
      },
    },
    // Admin configurable thresholds
    performanceThresholds: {
      studentActivityMinimum: {
        type: Number,
        default: 3, // activities per week
      },
      supervisorResponseTime: {
        type: Number,
        default: 48, // hours
      },
      criticalDeadlineWarningDays: {
        type: Number,
        default: 7, // days before deadline
      },
    },
    notificationSettings: {
      sendDeadlineReminders: {
        type: Boolean,
        default: true,
      },
      reminderDaysBeforeDeadline: {
        type: Number,
        min: 1,
        default: 7,
      },
      sendWeeklySummaries: {
        type: Boolean,
        default: true,
      },
      notifyAdminsOnTeamChanges: {
        type: Boolean,
        default: true,
      },
      notifySupervisorsOnSubmissions: {
        type: Boolean,
        default: true,
      },
    },
    evaluationScheme: {
      proposalWeight: {
        type: Number,
        min: 0,
        max: 100,
        default: 15,
      },
      progressWeight: {
        type: Number,
        min: 0,
        max: 100,
        default: 20,
      },
      finalSubmissionWeight: {
        type: Number,
        min: 0,
        max: 100,
        default: 40,
      },
      presentationWeight: {
        type: Number,
        min: 0,
        max: 100,
        default: 25,
      },
      customEvaluationCriteria: [
        {
          name: String,
          description: String,
          weight: {
            type: Number,
            min: 0,
            max: 100,
          },
        },
      ],
    },
    peerReviewSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      anonymous: {
        type: Boolean,
        default: true,
      },
      reviewDeadlineWeeks: {
        type: Number,
        min: 1,
        max: 4,
        default: 2,
      },
      categories: [
        {
          name: {
            type: String,
            required: true,
          },
          description: String,
          weight: {
            type: Number,
            min: 0,
            max: 100,
            default: 20,
          },
        },
      ],
    },
    milestoneTemplate: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        dueDateOffset: {
          type: Number,
          required: true,
        }, // Days from session start
        required: {
          type: Boolean,
          default: true,
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

// Middleware to validate team size
sessionSchema.pre("save", function (next) {
  if (this.maxTeamSize < this.minTeamSize) {
    this.maxTeamSize = this.minTeamSize;
  }

  // Autocalculate status based on current date
  const now = new Date();

  if (now < this.registrationStartDate) {
    this.status = "upcoming";
  } else if (
    now >= this.registrationStartDate &&
    now <= this.registrationEndDate
  ) {
    this.status = "registration";
  } else if (
    now > this.registrationEndDate &&
    now <= this.teamFormationEndDate
  ) {
    this.status = "team_formation";
  } else if (now > this.teamFormationEndDate && now <= this.endDate) {
    this.status = "active";
  } else if (now > this.endDate) {
    // If there are any remaining deadlines
    const pendingDeadlines = this.deadlines.filter((d) => d.dueDate > now);
    if (pendingDeadlines.length > 0) {
      this.status = "evaluation";
    } else {
      this.status = "completed";
    }
  }

  next();
});

sessionSchema.pre("validate", function (next) {
  // Check registration dates
  if (this.registrationStartDate >= this.registrationEndDate) {
    throw new Error(
      "Registration end date must be after registration start date"
    );
  }
  if (this.registrationEndDate > this.startDate) {
    throw new Error("Registration must end before session starts");
  }

  // Check team formation dates
  if (this.teamFormationStartDate >= this.teamFormationEndDate) {
    throw new Error(
      "Team formation end date must be after team formation start date"
    );
  }
  if (this.teamFormationEndDate > this.startDate) {
    throw new Error("Team formation must end before session starts");
  }

  // Check session duration
  const durationInMonths =
    (this.endDate - this.startDate) / (1000 * 60 * 60 * 24 * 30);
  if (durationInMonths < 4 || durationInMonths > 5) {
    throw new Error("Session duration must be between 4 and 5 months");
  }

  // Validate deadline dates are within session period
  if (this.deadlines && this.deadlines.length > 0) {
    this.deadlines.forEach((deadline) => {
      if (
        deadline.dueDate < this.startDate ||
        deadline.dueDate > this.endDate
      ) {
        throw new Error("All deadlines must be within the session period");
      }
    });
  }

  next();
});

// Virtual for duration in months
sessionSchema.virtual("durationMonths").get(function () {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.round(diffDays / 30);
});

// Virtual for registration status
sessionSchema.virtual("registrationStatus").get(function () {
  const now = new Date();
  if (now < this.registrationStartDate) {
    return "not_started";
  } else if (now > this.registrationEndDate) {
    return "closed";
  } else {
    return "open";
  }
});

// Virtual for team formation status
sessionSchema.virtual("teamFormationStatus").get(function () {
  const now = new Date();
  if (now < this.teamFormationStartDate) {
    return "not_started";
  } else if (now > this.teamFormationEndDate) {
    return "closed";
  } else {
    return "open";
  }
});

// Virtual for active status - Renamed to avoid conflict
sessionSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

// Virtual for upcoming status
sessionSchema.virtual("isUpcoming").get(function () {
  const now = new Date();
  return now < this.startDate;
});

// Virtual for completed status
sessionSchema.virtual("isCompleted").get(function () {
  const now = new Date();
  return now > this.endDate;
});

// Virtual for progress percentage
sessionSchema.virtual("progressPercentage").get(function () {
  const now = new Date();
  if (now < this.startDate) {
    return 0;
  } else if (now > this.endDate) {
    return 100;
  } else {
    const totalDuration = this.endDate - this.startDate;
    const elapsed = now - this.startDate;
    return Math.round((elapsed / totalDuration) * 100);
  }
});

// Method to add a deadline
sessionSchema.methods.addDeadline = function (deadline) {
  this.deadlines.push(deadline);
  return this;
};

// Method to remove a deadline
sessionSchema.methods.removeDeadline = function (deadlineId) {
  const deadlineIndex = this.deadlines.findIndex(
    (d) => d._id.toString() === deadlineId.toString()
  );

  if (deadlineIndex !== -1) {
    this.deadlines.splice(deadlineIndex, 1);
    return true;
  }

  return false;
};

// Method to get upcoming deadlines
sessionSchema.methods.getUpcomingDeadlines = function (
  days = 30,
  roles = null
) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  let filteredDeadlines = this.deadlines.filter(
    (d) => d.dueDate >= now && d.dueDate <= futureDate
  );

  if (roles) {
    filteredDeadlines = filteredDeadlines.filter((d) =>
      d.forRoles.some((role) => roles.includes(role))
    );
  }

  return filteredDeadlines.sort((a, b) => a.dueDate - b.dueDate);
};

// Method to get overdue deadlines
sessionSchema.methods.getOverdueDeadlines = function (roles = null) {
  const now = new Date();

  let filteredDeadlines = this.deadlines.filter(
    (d) => d.dueDate < now && d.status !== "completed"
  );

  if (roles) {
    filteredDeadlines = filteredDeadlines.filter((d) =>
      d.forRoles.some((role) => roles.includes(role))
    );
  }

  return filteredDeadlines.sort((a, b) => b.dueDate - a.dueDate);
};

// Method to add a project category
sessionSchema.methods.addProjectCategory = function (category) {
  // Check if category already exists
  const categoryExists = this.projectCategories.some(
    (c) => c.name.toLowerCase() === category.name.toLowerCase()
  );

  if (!categoryExists) {
    this.projectCategories.push(category);
  }

  return this;
};

// Method to add a research domain
sessionSchema.methods.addResearchDomain = function (domain) {
  // Check if domain already exists
  const domainExists = this.researchDomains.some(
    (d) => d.name.toLowerCase() === domain.name.toLowerCase()
  );

  if (!domainExists) {
    this.researchDomains.push(domain);
  }

  return this;
};

// Method to generate team formation deadlines
sessionSchema.methods.generateTeamFormationDeadlines = function () {
  // Clear existing team formation deadlines
  this.deadlines = this.deadlines.filter((d) => d.type !== "team_formation");

  // Add team formation start deadline
  this.deadlines.push({
    title: "Team Formation Begins",
    description: "Students can begin forming teams for projects",
    dueDate: this.teamFormationStartDate,
    type: "team_formation",
    forRoles: ["student", "supervisor", "admin"],
    status: "upcoming",
  });

  // Add team formation end deadline
  this.deadlines.push({
    title: "Team Formation Deadline",
    description: "Final deadline for students to form or join teams",
    dueDate: this.teamFormationEndDate,
    type: "team_formation",
    forRoles: ["student", "supervisor", "admin"],
    reminderDays: 3,
    status: "upcoming",
  });

  return this;
};

// Method to generate standard milestones
sessionSchema.methods.generateStandardMilestones = function () {
  // Calculate duration and distribute milestones
  const totalDuration = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24); // duration in days

  // Clear existing milestone templates
  this.milestoneTemplate = [];

  // Add proposal milestone (15% into the session)
  const proposalOffset = Math.floor(totalDuration * 0.15);
  this.milestoneTemplate.push({
    title: "Project Proposal",
    description: "Submit initial project proposal and plan",
    dueDateOffset: proposalOffset,
    required: true,
  });

  // Add first progress report (30% into the session)
  const progress1Offset = Math.floor(totalDuration * 0.3);
  this.milestoneTemplate.push({
    title: "First Progress Report",
    description: "Submit first progress report with initial implementation",
    dueDateOffset: progress1Offset,
    required: true,
  });

  // Add midterm evaluation (50% into the session)
  const midtermOffset = Math.floor(totalDuration * 0.5);
  this.milestoneTemplate.push({
    title: "Midterm Evaluation",
    description: "Midterm project evaluation and progress assessment",
    dueDateOffset: midtermOffset,
    required: true,
  });

  // Add second progress report (70% into the session)
  const progress2Offset = Math.floor(totalDuration * 0.7);
  this.milestoneTemplate.push({
    title: "Second Progress Report",
    description: "Submit second progress report with advanced implementation",
    dueDateOffset: progress2Offset,
    required: true,
  });

  // Add final report (95% into the session)
  const finalOffset = Math.floor(totalDuration * 0.95);
  this.milestoneTemplate.push({
    title: "Final Project Submission",
    description: "Submit final project report, code, and documentation",
    dueDateOffset: finalOffset,
    required: true,
  });

  return this;
};

// Method to generate standard deadlines
sessionSchema.methods.generateStandardDeadlines = function () {
  // Generate both team formation deadlines and standard milestones
  this.generateTeamFormationDeadlines();

  const milestones = this.generateStandardMilestones().milestoneTemplate;

  // Convert milestone templates to deadlines
  milestones.forEach((milestone) => {
    const deadlineDate = new Date(this.startDate);
    deadlineDate.setDate(deadlineDate.getDate() + milestone.dueDateOffset);

    this.deadlines.push({
      title: milestone.title,
      description: milestone.description,
      dueDate: deadlineDate,
      type: milestone.title.toLowerCase().includes("proposal")
        ? "proposal_submission"
        : milestone.title.toLowerCase().includes("progress")
        ? "progress_report"
        : milestone.title.toLowerCase().includes("midterm")
        ? "mid_evaluation"
        : milestone.title.toLowerCase().includes("final")
        ? "final_submission"
        : "other",
      forRoles: ["student", "supervisor", "admin"],
      status: "upcoming",
      submissionType: "document",
      submissionOptions: {
        allowLateSubmission: true,
        latePenaltyPercentage: 10,
        maxSubmissionAttempts: 3,
        requireApproval: true,
      },
    });
  });

  // Add presentation deadline (at the very end)
  const presentationDate = new Date(this.endDate);
  presentationDate.setDate(presentationDate.getDate() - 3); // 3 days before end

  this.deadlines.push({
    title: "Project Presentation",
    description: "Final project presentation and demonstration",
    dueDate: presentationDate,
    type: "presentation",
    forRoles: ["student", "supervisor", "admin"],
    status: "upcoming",
    submissionType: "presentation",
  });

  // Add peer review deadline (1 week before end)
  const peerReviewDate = new Date(this.endDate);
  peerReviewDate.setDate(peerReviewDate.getDate() - 7); // 1 week before end

  this.deadlines.push({
    title: "Peer Review Submission",
    description: "Submit peer reviews for team members",
    dueDate: peerReviewDate,
    type: "peer_review",
    forRoles: ["student"],
    status: "upcoming",
    reminderDays: 2,
  });

  // Add supervisor feedback deadline (1 week before end)
  const supervisorFeedbackDate = new Date(this.endDate);
  supervisorFeedbackDate.setDate(supervisorFeedbackDate.getDate() - 7); // 1 week before end

  this.deadlines.push({
    title: "Supervisor Feedback Submission",
    description: "Submit feedback for assigned teams",
    dueDate: supervisorFeedbackDate,
    type: "supervisor_feedback",
    forRoles: ["supervisor"],
    status: "upcoming",
    reminderDays: 3,
  });

  return this;
};

// Add standard project types
sessionSchema.methods.addProjectTypes = function () {
  const standardTypes = [
    {
      name: "research_based",
      description:
        "Research-oriented project requiring theoretical study and analysis",
      isActive: true,
    },
    {
      name: "project_based",
      description: "Implementation-focused project with practical deliverables",
      isActive: true,
    },
  ];

  this.projectCategories = standardTypes;
  return this;
};

// Generate all required deadlines for a session
sessionSchema.methods.generateAllDeadlines = function () {
  // Clear existing deadlines
  this.deadlines = [];

  // Calculate total duration in days
  const totalDuration = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24);

  // Validate session duration (4-5 months)
  const minDuration = 120; // 4 months
  const maxDuration = 150; // 5 months
  if (totalDuration < minDuration || totalDuration > maxDuration) {
    throw new Error("Session duration must be between 4 and 5 months");
  }

  // Registration period (2 weeks before session starts)
  const registrationStartDate = new Date(this.startDate);
  registrationStartDate.setDate(registrationStartDate.getDate() - 14);

  this.deadlines.push({
    title: "Registration Deadline",
    description: "Last date for student and supervisor registration",
    dueDate: new Date(this.startDate),
    type: "registration",
    forRoles: ["student", "supervisor"],
    status: "upcoming",
    reminderDays: 7,
    submissionOptions: {
      allowLateSubmission: false,
    },
  });

  // Team formation period (first 2 weeks)
  const teamFormationDate = new Date(this.startDate);
  teamFormationDate.setDate(teamFormationDate.getDate() + 14);

  this.deadlines.push({
    title: "Team Formation Deadline",
    description: "Last date for team formation and supervisor selection",
    dueDate: teamFormationDate,
    type: "team_formation",
    forRoles: ["student"],
    status: "upcoming",
    reminderDays: 3,
    submissionOptions: {
      allowLateSubmission: false,
    },
  });

  // Project proposal (3 weeks after start)
  const proposalDate = new Date(this.startDate);
  proposalDate.setDate(proposalDate.getDate() + 21);

  this.deadlines.push({
    title: "Project Proposal Submission",
    description: "Submit project proposal with objectives and plan",
    dueDate: proposalDate,
    type: "proposal_submission",
    forRoles: ["student"],
    status: "upcoming",
    reminderDays: 5,
    submissionOptions: {
      allowLateSubmission: true,
      latePenaltyPercentage: 10,
      maxLateDays: 3,
    },
  });

  // Progress reports (monthly)
  const monthlyReportCount = Math.floor(totalDuration / 30);
  for (let i = 1; i <= monthlyReportCount - 1; i++) {
    const reportDate = new Date(this.startDate);
    reportDate.setDate(reportDate.getDate() + i * 30);

    this.deadlines.push({
      title: `Monthly Progress Report ${i}`,
      description: `Submit progress report for month ${i}`,
      dueDate: reportDate,
      type: "progress_report",
      forRoles: ["student"],
      status: "upcoming",
      reminderDays: 5,
      submissionOptions: {
        allowLateSubmission: true,
        latePenaltyPercentage: 5,
        maxLateDays: 2,
      },
    });
  }

  // Final submission (90% into session)
  const finalSubmissionDate = new Date(this.startDate);
  finalSubmissionDate.setDate(
    finalSubmissionDate.getDate() + Math.floor(totalDuration * 0.9)
  );

  this.deadlines.push({
    title: "Final Project Submission",
    description: "Submit completed project with all deliverables",
    dueDate: finalSubmissionDate,
    type: "final_submission",
    forRoles: ["student"],
    status: "upcoming",
    reminderDays: 7,
    submissionOptions: {
      allowLateSubmission: false,
      maxSubmissionAttempts: 1,
    },
  });

  // Presentation schedule (last week)
  const presentationDate = new Date(this.startDate);
  presentationDate.setDate(
    presentationDate.getDate() + Math.floor(totalDuration * 0.95)
  );

  this.deadlines.push({
    title: "Project Presentation",
    description: "Final project presentation and demonstration",
    dueDate: presentationDate,
    type: "presentation",
    forRoles: ["student", "supervisor"],
    status: "upcoming",
    reminderDays: 5,
    submissionOptions: {
      allowLateSubmission: false,
    },
  });

  return this;
};

// Static method to get active session
sessionSchema.statics.getActiveSession = function () {
  const now = new Date();
  return this.findOne({
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

// Static method to get active or upcoming sessions
sessionSchema.statics.getActiveOrUpcomingSessions = function () {
  const now = new Date();
  return this.find({
    endDate: { $gte: now },
  }).sort({ startDate: 1 });
};

// Static method to get current registration session
sessionSchema.statics.getCurrentRegistrationSession = function () {
  const now = new Date();
  return this.findOne({
    registrationStartDate: { $lte: now },
    registrationEndDate: { $gte: now },
  });
};

// Static method to get current team formation session
sessionSchema.statics.getCurrentTeamFormationSession = function () {
  const now = new Date();
  return this.findOne({
    teamFormationStartDate: { $lte: now },
    teamFormationEndDate: { $gte: now },
  });
};

// Method to check if registration is open
sessionSchema.methods.isRegistrationOpen = function () {
  const now = new Date();
  return now >= this.registrationStartDate && now <= this.registrationEndDate;
};

// Method to check if team formation is open
sessionSchema.methods.isTeamFormationOpen = function () {
  const now = new Date();
  return now >= this.teamFormationStartDate && now <= this.teamFormationEndDate;
};

// Method to update deadline status based on current date
sessionSchema.methods.updateDeadlineStatus = function () {
  const now = new Date();
  let updatedCount = 0;

  this.deadlines.forEach((deadline) => {
    if (deadline.dueDate <= now && deadline.status === "upcoming") {
      deadline.status = "completed";
      updatedCount++;
    }
  });

  return updatedCount;
};

// Method to calculate days until start
sessionSchema.methods.daysUntilStart = function () {
  const now = new Date();
  const diffTime = Math.abs(this.startDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to calculate days until end
sessionSchema.methods.daysUntilEnd = function () {
  const now = new Date();
  const diffTime = Math.abs(this.endDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to calculate days until registration opens
sessionSchema.methods.daysUntilRegistration = function () {
  const now = new Date();
  const diffTime = Math.abs(this.registrationStartDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to calculate days until team formation opens
sessionSchema.methods.daysUntilTeamFormation = function () {
  const now = new Date();
  const diffTime = Math.abs(this.teamFormationStartDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to get deadlines for a specific type
sessionSchema.methods.getDeadlinesByType = function (type) {
  return this.deadlines.filter((d) => d.type === type);
};

// Method to get deadlines for a specific role
sessionSchema.methods.getDeadlinesByRole = function (role) {
  return this.deadlines.filter((d) => d.forRoles.includes(role));
};

// Method to clone a session (for creating a new session based on an existing one)
sessionSchema.methods.cloneForNewYear = function (newStartDate, academicYear) {
  // Calculate the time difference between old and new start dates
  const timeDifference = newStartDate - this.startDate;

  const newSession = {
    name: `${this.name.replace(/\d{4}(-\d{4})?/, "")} ${academicYear}`.trim(),
    academicYear,
    term: this.term,
    startDate: newStartDate,
    endDate: new Date(this.endDate.getTime() + timeDifference),
    registrationStartDate: new Date(
      this.registrationStartDate.getTime() + timeDifference
    ),
    registrationEndDate: new Date(
      this.registrationEndDate.getTime() + timeDifference
    ),
    teamFormationStartDate: new Date(
      this.teamFormationStartDate.getTime() + timeDifference
    ),
    teamFormationEndDate: new Date(
      this.teamFormationEndDate.getTime() + timeDifference
    ),
    minTeamSize: this.minTeamSize,
    maxTeamSize: this.maxTeamSize,
    allowStudentInitiatedTeams: this.allowStudentInitiatedTeams,
    allowSupervisorInitiatedProjects: this.allowSupervisorInitiatedProjects,
    autoAssignTeamsWithoutSupervisors: this.autoAssignTeamsWithoutSupervisors,
    deadlines: this.deadlines.map((d) => ({
      title: d.title,
      description: d.description,
      dueDate: new Date(d.dueDate.getTime() + timeDifference),
      type: d.type,
      forRoles: [...d.forRoles],
      reminderDays: d.reminderDays,
      submissionType: d.submissionType,
      submissionOptions: { ...d.submissionOptions },
      status: "upcoming",
    })),
    status: "upcoming",
    description: this.description,
    academicPrograms: [...this.academicPrograms],
    departments: [...this.departments],
    projectCategories: [...this.projectCategories],
    researchDomains: [...this.researchDomains],
    supervisorCapacity: this.supervisorCapacity,
    supervisorMinimumLoad: this.supervisorMinimumLoad,
    projectsPerStudent: this.projectsPerStudent,
    teamsPerSupervisor: this.teamsPerSupervisor,
    notificationSettings: { ...this.notificationSettings },
    evaluationScheme: {
      proposalWeight: this.evaluationScheme.proposalWeight,
      progressWeight: this.evaluationScheme.progressWeight,
      finalSubmissionWeight: this.evaluationScheme.finalSubmissionWeight,
      presentationWeight: this.evaluationScheme.presentationWeight,
      customEvaluationCriteria:
        this.evaluationScheme.customEvaluationCriteria.map((c) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
        })),
    },
    peerReviewSettings: {
      enabled: this.peerReviewSettings.enabled,
      anonymous: this.peerReviewSettings.anonymous,
      reviewDeadlineWeeks: this.peerReviewSettings.reviewDeadlineWeeks,
      categories: this.peerReviewSettings.categories.map((c) => ({
        name: c.name,
        description: c.description,
        weight: c.weight,
      })),
    },
    milestoneTemplate: this.milestoneTemplate.map((m) => ({
      title: m.title,
      description: m.description,
      dueDateOffset: m.dueDateOffset,
      required: m.required,
    })),
  };

  return newSession;
};

// Method to get statistics
sessionSchema.methods.getStatistics = function () {
  // Count different deadline types
  const deadlinesByType = this.deadlines.reduce((acc, deadline) => {
    acc[deadline.type] = (acc[deadline.type] || 0) + 1;
    return acc;
  }, {});

  // Count deadlines by status
  const deadlinesByStatus = this.deadlines.reduce((acc, deadline) => {
    acc[deadline.status] = (acc[deadline.status] || 0) + 1;
    return acc;
  }, {});

  return {
    durationMonths: this.durationMonths,
    deadlinesCount: this.deadlines.length,
    deadlinesByType,
    deadlinesByStatus,
    projectCategoriesCount: this.projectCategories.length,
    researchDomainsCount: this.researchDomains.length,
    isRegistrationOpen: this.isRegistrationOpen(),
    isTeamFormationOpen: this.isTeamFormationOpen(),
    progressPercentage: this.progressPercentage,
    days: {
      untilStart: this.isUpcoming ? this.daysUntilStart() : 0,
      untilEnd: !this.isCompleted ? this.daysUntilEnd() : 0,
      untilRegistration:
        this.registrationStatus === "not_started"
          ? this.daysUntilRegistration()
          : 0,
      untilTeamFormation:
        this.teamFormationStatus === "not_started"
          ? this.daysUntilTeamFormation()
          : 0,
    },
  };
};

// Add new methods for progress tracking
sessionSchema.methods.getProgressStats = function () {
  const now = new Date();

  // Get deadline completion stats
  const deadlines = this.deadlines.map((deadline) => {
    const isPast = deadline.dueDate < now;
    return {
      ...deadline.toObject(),
      isPast,
      timeRemaining: isPast
        ? 0
        : Math.round((deadline.dueDate - now) / (1000 * 60 * 60 * 24)),
    };
  });

  const deadlineStats = {
    total: deadlines.length,
    completed: deadlines.filter((d) => d.status === "completed").length,
    pending: deadlines.filter((d) => d.status === "upcoming").length,
    overdue: deadlines.filter((d) => d.isPast && d.status !== "completed")
      .length,
  };

  // Get session phase
  let currentPhase = "not_started";
  if (now < this.registrationStartDate) {
    currentPhase = "not_started";
  } else if (now <= this.registrationEndDate) {
    currentPhase = "registration";
  } else if (now <= this.teamFormationEndDate) {
    currentPhase = "team_formation";
  } else if (now <= this.endDate) {
    currentPhase = "project_work";
  } else {
    currentPhase = "completed";
  }

  // Calculate overall progress
  let progressPercentage = 0;
  if (now < this.startDate) {
    progressPercentage = 0;
  } else if (now > this.endDate) {
    progressPercentage = 100;
  } else {
    const totalDuration = this.endDate - this.startDate;
    const elapsed = now - this.startDate;
    progressPercentage = Math.round((elapsed / totalDuration) * 100);
  }

  return {
    phase: currentPhase,
    progress: progressPercentage,
    registrationStatus: this.registrationStatus,
    teamFormationStatus: this.teamFormationStatus,
    deadlineStats,
    daysRemaining: this.daysUntilEnd(),
    timelineProgress: {
      registration:
        this.registrationStartDate > now
          ? 0
          : this.registrationEndDate < now
          ? 100
          : Math.round(
              ((now - this.registrationStartDate) /
                (this.registrationEndDate - this.registrationStartDate)) *
                100
            ),
      teamFormation:
        this.teamFormationStartDate > now
          ? 0
          : this.teamFormationEndDate < now
          ? 100
          : Math.round(
              ((now - this.teamFormationStartDate) /
                (this.teamFormationEndDate - this.teamFormationStartDate)) *
                100
            ),
      projectWork:
        this.startDate > now
          ? 0
          : this.endDate < now
          ? 100
          : Math.round(
              ((now - this.startDate) / (this.endDate - this.startDate)) * 100
            ),
    },
  };
};

// Add method to check deadline conflicts
sessionSchema.methods.checkDeadlineConflicts = function () {
  const deadlines = [...this.deadlines].sort((a, b) => a.dueDate - b.dueDate);
  const conflicts = [];

  for (let i = 0; i < deadlines.length - 1; i++) {
    const current = deadlines[i];
    const next = deadlines[i + 1];

    // Check if deadlines are too close (less than 2 days apart)
    const daysBetween = Math.round(
      (next.dueDate - current.dueDate) / (1000 * 60 * 60 * 24)
    );
    if (daysBetween < 2) {
      conflicts.push({
        type: "too_close",
        deadlines: [current, next],
        daysBetween,
      });
    }
  }

  return conflicts;
};

// Add method to get upcoming deadlines by role
sessionSchema.methods.getDeadlinesByRole = function (role, days = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return this.deadlines
    .filter(
      (d) =>
        d.forRoles.includes(role) && d.dueDate >= now && d.dueDate <= futureDate
    )
    .sort((a, b) => a.dueDate - b.dueDate)
    .map((d) => ({
      ...d.toObject(),
      daysRemaining: Math.ceil((d.dueDate - now) / (1000 * 60 * 60 * 24)),
    }));
};

const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);

export { Session };
