import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Submission title is required"],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    description: {
      type: String,
      trim: true,
    },
    submissionType: {
      type: String,
      enum: [
        "proposal",
        "progress_report",
        "final_report",
        "code",
        "presentation",
        "other",
      ],
      default: "other",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session.deadlines",
    },
    feedback: {
      content: String,
      givenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supervisor",
      },
      givenAt: Date,
    },
    marks: {
      score: {
        type: Number,
        min: 0,
        max: 100,
      },
      outOf: {
        type: Number,
        default: 100,
      },
      givenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supervisor",
      },
      givenAt: Date,
      comments: String,
    },
    version: {
      type: Number,
      default: 1,
    },
    attachments: [
      {
        name: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["research", "project", "hybrid"],
      required: [true, "Project type is required"],
    },
    category: {
      type: String,
      required: [true, "Project category is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
    },
    objectives: [String],
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    supervisors: [
      {
        supervisor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supervisor",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        respondedAt: Date,
        isMainSupervisor: {
          type: Boolean,
          default: false,
        },
        role: {
          type: String,
          enum: ["primary", "co_supervisor", "advisor", "industry_mentor"],
          default: "co_supervisor",
        },
        responsibilities: [String],
        notes: String,
      },
    ],
    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "completed",
        "in_progress",
        "on_hold",
        "cancelled",
      ],
      default: "draft",
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    submissions: [submissionSchema],
    technologies: [String],
    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supervisor",
    },
    approvedAt: Date,
    approvalComments: String,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supervisor",
    },
    rejectedAt: Date,
    rejectionReason: String,
    timeline: {
      milestones: [
        {
          title: String,
          description: String,
          dueDate: Date,
          status: {
            type: String,
            enum: ["pending", "in_progress", "completed", "overdue"],
            default: "pending",
          },
          completedAt: Date,
          completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
          },
          weight: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
          attachments: [
            {
              name: String,
              fileUrl: String,
              fileType: String,
              uploadedAt: {
                type: Date,
                default: Date.now,
              },
            },
          ],
        },
      ],
      currentPhase: {
        type: String,
        enum: [
          "planning",
          "development",
          "testing",
          "deployment",
          "completion",
          "other",
        ],
        default: "planning",
      },
      startDate: Date,
      endDate: Date,
    },
    finalGrade: {
      score: {
        type: Number,
        min: 0,
        max: 100,
      },
      outOf: {
        type: Number,
        default: 100,
      },
      givenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supervisor",
      },
      givenAt: Date,
      comments: String,
      breakdownComponents: [
        {
          name: String,
          score: Number,
          weight: Number,
          outOf: {
            type: Number,
            default: 100,
          },
          comments: String,
        },
      ],
    },
    researchComponents: {
      literature: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      methodology: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      results: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      analysis: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      contribution: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
      },
    },
    projectComponents: {
      design: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      implementation: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      testing: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      deployment: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
      documentation: {
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        notes: String,
        updatedAt: Date,
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
    },
    meetings: [
      {
        date: Date,
        duration: Number, // minutes
        agenda: String,
        notes: String,
        attendees: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            attended: {
              type: Boolean,
              default: false,
            },
            role: String,
          },
        ],
        actionItems: [
          {
            description: String,
            assignedTo: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            dueDate: Date,
            status: {
              type: String,
              enum: ["pending", "in_progress", "completed"],
              default: "pending",
            },
            completedAt: Date,
          },
        ],
        attachments: [
          {
            name: String,
            fileUrl: String,
            fileType: String,
            uploadedAt: Date,
          },
        ],
      },
    ],
    repository: {
      url: String,
      type: {
        type: String,
        enum: ["github", "gitlab", "bitbucket", "other"],
        default: "github",
      },
      lastCommitDate: Date,
      accessType: {
        type: String,
        enum: ["public", "private", "protected"],
        default: "private",
      },
    },
    presentations: [
      {
        date: Date,
        title: String,
        description: String,
        presenters: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Student",
            },
            role: String,
          },
        ],
        slideUrl: String,
        recordingUrl: String,
        feedback: {
          content: String,
          givenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supervisor",
          },
          givenAt: Date,
        },
        marks: {
          score: Number,
          outOf: {
            type: Number,
            default: 100,
          },
          givenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supervisor",
          },
          givenAt: Date,
          comments: String,
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

// Pre-save middleware to validate project data
projectSchema.pre("validate", async function (next) {
  // Validate dates
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    throw new Error("End date must be after start date");
  }

  // Validate progress
  if (this.progress < 0 || this.progress > 100) {
    throw new Error("Progress must be between 0 and 100");
  }

  // Validate milestones
  if (this.milestones && this.milestones.length > 0) {
    this.milestones.forEach((milestone) => {
      if (
        milestone.dueDate &&
        (milestone.dueDate < this.startDate || milestone.dueDate > this.endDate)
      ) {
        throw new Error("Milestone dates must be within project duration");
      }
    });
  }

  // Ensure at least one active supervisor
  const activeSupervisors = this.supervisors.filter(
    (s) => s.status === "accepted"
  );
  if (!activeSupervisors.length) {
    throw new Error("Project must have at least one accepted supervisor");
  }

  next();
});

// Pre-save hook to update project status
projectSchema.pre("save", function (next) {
  if (this.submissions.length > 0 && this.status === "draft") {
    this.status = "pending_approval";
  }

  // Update milestones status
  if (this.timeline && this.timeline.milestones) {
    const now = new Date();
    this.timeline.milestones.forEach((milestone) => {
      if (milestone.status !== "completed" && milestone.dueDate < now) {
        milestone.status = "overdue";
      }
    });
  }

  next();
});

// Virtual for project progress percentage
projectSchema.virtual("progress").get(function () {
  if (
    !this.timeline ||
    !this.timeline.milestones ||
    this.timeline.milestones.length === 0
  ) {
    return 0;
  }

  const totalMilestones = this.timeline.milestones.length;
  let completedMilestonesWeight = 0;
  let totalWeight = 0;

  this.timeline.milestones.forEach((milestone) => {
    const weight = milestone.weight || 1; // Default weight of 1 if not specified
    totalWeight += weight;

    if (milestone.status === "completed") {
      completedMilestonesWeight += weight;
    }
  });

  return totalWeight > 0
    ? Math.round((completedMilestonesWeight / totalWeight) * 100)
    : 0;
});

// Virtual for average score
projectSchema.virtual("averageScore").get(function () {
  if (!this.submissions || this.submissions.length === 0) {
    return null;
  }

  const scoredSubmissions = this.submissions.filter(
    (submission) => submission.marks && submission.marks.score !== undefined
  );

  if (scoredSubmissions.length === 0) {
    return null;
  }

  const totalScore = scoredSubmissions.reduce(
    (sum, submission) => sum + submission.marks.score,
    0
  );

  return Math.round((totalScore / scoredSubmissions.length) * 100) / 100;
});

// Virtual for number of active supervisors
projectSchema.virtual("activeSupervisorsCount").get(function () {
  return this.supervisors.filter((s) => s.status === "accepted").length;
});

// Virtual for days since last activity
projectSchema.virtual("daysSinceLastActivity").get(function () {
  const activities = [];

  // Add submission dates
  if (this.submissions && this.submissions.length > 0) {
    activities.push(...this.submissions.map((s) => new Date(s.submittedAt)));
  }

  // Add milestone completion dates
  if (this.timeline && this.timeline.milestones) {
    activities.push(
      ...this.timeline.milestones
        .filter((m) => m.completedAt)
        .map((m) => new Date(m.completedAt))
    );
  }

  // Add meeting dates
  if (this.meetings && this.meetings.length > 0) {
    activities.push(...this.meetings.map((m) => new Date(m.date)));
  }

  // Add updatedAt
  activities.push(new Date(this.updatedAt));

  // Get the most recent activity
  const mostRecent = new Date(Math.max(...activities.map((a) => a.getTime())));
  const now = new Date();

  // Calculate difference in days
  return Math.floor((now - mostRecent) / (1000 * 60 * 60 * 24));
});

// Method to check if project has a specific supervisor
projectSchema.methods.hasSupervisor = function (supervisorId) {
  return this.supervisors.some(
    (s) =>
      s.supervisor.toString() === supervisorId.toString() &&
      s.status === "accepted"
  );
};

// Method to add a supervisor request
projectSchema.methods.requestSupervisor = function (
  supervisorId,
  options = {}
) {
  const {
    isMainSupervisor = false,
    role = "co_supervisor",
    responsibilities = [],
    notes = "",
  } = options;

  // Check if supervisor already exists
  const existingSupervisor = this.supervisors.find(
    (s) => s.supervisor.toString() === supervisorId.toString()
  );

  if (existingSupervisor) {
    // If rejected, change to pending
    if (existingSupervisor.status === "rejected") {
      existingSupervisor.status = "pending";
      existingSupervisor.requestedAt = new Date();
      existingSupervisor.respondedAt = null;
      existingSupervisor.isMainSupervisor = isMainSupervisor;
      existingSupervisor.role = role;
      existingSupervisor.responsibilities = responsibilities;
      existingSupervisor.notes = notes;
    }
  } else {
    // Add new supervisor request
    this.supervisors.push({
      supervisor: supervisorId,
      status: "pending",
      requestedAt: new Date(),
      isMainSupervisor,
      role,
      responsibilities,
      notes,
    });
  }

  // If setting as main supervisor, ensure other supervisors are not main
  if (isMainSupervisor) {
    this.supervisors.forEach((s) => {
      if (s.supervisor.toString() !== supervisorId.toString()) {
        s.isMainSupervisor = false;
      }
    });
  }

  return this;
};

// Method to respond to supervisor request
projectSchema.methods.respondToSupervisorRequest = function (
  supervisorId,
  status,
  notes = ""
) {
  const supervisorRequest = this.supervisors.find(
    (s) =>
      s.supervisor.toString() === supervisorId.toString() &&
      s.status === "pending"
  );

  if (supervisorRequest) {
    supervisorRequest.status = status;
    supervisorRequest.respondedAt = new Date();

    if (notes) {
      supervisorRequest.notes = notes;
    }

    return true;
  }

  return false;
};

// Method to remove supervisor
projectSchema.methods.removeSupervisor = function (supervisorId) {
  const supervisorIndex = this.supervisors.findIndex(
    (s) => s.supervisor.toString() === supervisorId.toString()
  );

  if (supervisorIndex !== -1) {
    // Remove the supervisor
    this.supervisors.splice(supervisorIndex, 1);
    return true;
  }

  return false;
};

// Method to get main supervisor
projectSchema.methods.getMainSupervisor = function () {
  return this.supervisors.find(
    (s) => s.isMainSupervisor && s.status === "accepted"
  );
};

// Method to get accepted supervisors
projectSchema.methods.getAcceptedSupervisors = function () {
  return this.supervisors.filter((s) => s.status === "accepted");
};

// Method to add submission
projectSchema.methods.addSubmission = function (submission) {
  this.submissions.push(submission);

  // Update status if in draft
  if (this.status === "draft") {
    this.status = "pending_approval";
  }

  return this;
};

// Method to get latest submission
projectSchema.methods.getLatestSubmission = function () {
  if (!this.submissions || this.submissions.length === 0) {
    return null;
  }

  return this.submissions.sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  )[0];
};

// Method to get submissions by type
projectSchema.methods.getSubmissionsByType = function (type) {
  if (!this.submissions || this.submissions.length === 0) {
    return [];
  }

  return this.submissions
    .filter((submission) => submission.submissionType === type)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
};

// Method to add meeting
projectSchema.methods.addMeeting = function (meeting) {
  if (!this.meetings) {
    this.meetings = [];
  }

  this.meetings.push(meeting);
  return this;
};

// Method to add presentation
projectSchema.methods.addPresentation = function (presentation) {
  if (!this.presentations) {
    this.presentations = [];
  }

  this.presentations.push(presentation);
  return this;
};

// Static method to find projects by supervisor
projectSchema.statics.findBySupervisor = function (supervisorId, options = {}) {
  const query = {
    "supervisors.supervisor": supervisorId,
    "supervisors.status": "accepted",
  };

  // Add optional filters
  if (options.status) {
    query.status = options.status;
  }

  if (options.type) {
    query.type = options.type;
  }

  if (options.session) {
    query.session = options.session;
  }

  return this.find(query);
};

// Static method to find projects by student
projectSchema.statics.findByStudent = function (studentId, options = {}) {
  const query = {};

  // Add optional filters
  if (options.status) {
    query.status = options.status;
  }

  if (options.type) {
    query.type = options.type;
  }

  if (options.session) {
    query.session = options.session;
  }

  return this.find(query)
    .populate({
      path: "team",
      match: { "members.user": studentId },
    })
    .then((projects) => projects.filter((project) => project.team));
};

// Static method to find projects by session
projectSchema.statics.findBySession = function (sessionId, options = {}) {
  const query = { session: sessionId };

  // Add optional filters
  if (options.status) {
    query.status = options.status;
  }

  if (options.type) {
    query.type = options.type;
  }

  return this.find(query);
};

// Static method to find projects by type
projectSchema.statics.findByType = function (projectType, options = {}) {
  const query = { type: projectType };

  // Add optional filters
  if (options.status) {
    query.status = options.status;
  }

  if (options.session) {
    query.session = options.session;
  }

  return this.find(query);
};

// Method to get component progress
projectSchema.methods.getComponentProgress = function () {
  const components =
    this.type === "research"
      ? this.researchComponents
      : this.type === "project"
      ? this.projectComponents
      : { ...this.researchComponents, ...this.projectComponents };

  if (!components) {
    return 0;
  }

  const componentFields = Object.keys(components);
  let completedCount = 0;
  let totalCount = 0;

  componentFields.forEach((field) => {
    if (components[field] && typeof components[field] === "object") {
      totalCount++;
      if (components[field].status === "completed") {
        completedCount++;
      }
    }
  });

  return totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
};

// Method to assign a primary supervisor
projectSchema.methods.assignPrimarySupervisor = function (supervisorId) {
  // Find if supervisor already exists
  const existingSupervisor = this.supervisors.find(
    (s) => s.supervisor.toString() === supervisorId.toString()
  );

  if (existingSupervisor) {
    // Update existing supervisor
    existingSupervisor.isMainSupervisor = true;
    existingSupervisor.role = "primary";

    if (existingSupervisor.status === "pending") {
      existingSupervisor.status = "accepted";
      existingSupervisor.respondedAt = new Date();
    }
  } else {
    // Add new supervisor
    this.supervisors.push({
      supervisor: supervisorId,
      status: "accepted",
      requestedAt: new Date(),
      respondedAt: new Date(),
      isMainSupervisor: true,
      role: "primary",
    });
  }

  // Ensure other supervisors are not main
  this.supervisors.forEach((s) => {
    if (s.supervisor.toString() !== supervisorId.toString()) {
      s.isMainSupervisor = false;
      if (s.role === "primary") {
        s.role = "co_supervisor";
      }
    }
  });

  return this;
};

// Static method to find projects needing supervisor assignment
projectSchema.statics.findProjectsNeedingSupervisors = function (sessionId) {
  return this.find({
    session: sessionId,
    $or: [
      { supervisors: { $size: 0 } },
      {
        $and: [
          { "supervisors.status": { $ne: "accepted" } },
          {
            supervisors: {
              $not: { $elemMatch: { status: "accepted" } },
            },
          },
        ],
      },
    ],
  });
};

const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);

export { Project };
