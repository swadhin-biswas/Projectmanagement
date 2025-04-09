import mongoose from "mongoose";

// Schema for Tasks within a Timeline segment
const taskSchema = new mongoose.Schema(
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
    startDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          return date >= this.startDate;
        },
        message: "Due date must be after start date",
      },
    },
    assignedTo: {
      type: String,
      enum: ["students", "supervisors", "admins", "all"],
      default: "all",
    },
    targetUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    targetTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "delayed", "canceled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    reminderSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      daysBeforeDue: {
        type: Number,
        default: 3,
      },
      reminderSent: {
        type: Boolean,
        default: false,
      },
    },
    completionCriteria: {
      type: String,
      enum: ["manual", "auto_submission", "auto_review"],
      default: "manual",
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Schema for Timeline periods/segments
const segmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          return date > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    color: {
      type: String,
      default: "#3498db",
    },
    tasks: [taskSchema],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    importance: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
  },
  { timestamps: true }
);

// Main Timeline schema
const timelineSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          return date > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    segments: [segmentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scope: {
      type: String,
      enum: ["global", "department", "team", "user"],
      default: "global",
    },
    targetDepartments: [
      {
        type: String,
        trim: true,
      },
    ],
    targetTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    targetUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "private", "restricted"],
      default: "public",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Pre-save hook to update task status based on dates
taskSchema.pre("save", function (next) {
  const now = new Date();

  // Auto-update status based on dates
  if (now < this.startDate) {
    this.status = "pending";
  } else if (now >= this.startDate && now <= this.dueDate) {
    if (this.status === "pending") {
      this.status = "in_progress";
    }
  } else if (now > this.dueDate && this.status !== "completed") {
    this.status = "delayed";
  }

  // Update last updated timestamp
  this.lastUpdated = now;

  next();
});

// Method to calculate segment progress
segmentSchema.methods.calculateProgress = function () {
  if (!this.tasks || this.tasks.length === 0) {
    this.progress = 0;
    return 0;
  }

  let totalProgress = 0;
  let completedTasks = 0;

  for (const task of this.tasks) {
    totalProgress += task.progress;
    if (task.status === "completed") {
      completedTasks++;
    }
  }

  this.progress = Math.round(totalProgress / this.tasks.length);
  return this.progress;
};

// Method to calculate overall timeline progress
timelineSchema.methods.calculateProgress = function () {
  if (!this.segments || this.segments.length === 0) {
    return 0;
  }

  let totalProgress = 0;
  let weightSum = 0;

  for (const segment of this.segments) {
    // Calculate each segment's progress first
    segment.calculateProgress();

    // Weight by importance
    totalProgress += segment.progress * segment.importance;
    weightSum += segment.importance;
  }

  return Math.round(totalProgress / weightSum);
};

// Method to get upcoming tasks
timelineSchema.methods.getUpcomingTasks = function (days = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  const upcomingTasks = [];

  for (const segment of this.segments) {
    for (const task of segment.tasks) {
      if (
        task.status !== "completed" &&
        task.status !== "canceled" &&
        task.dueDate >= now &&
        task.dueDate <= futureDate
      ) {
        upcomingTasks.push({
          ...task.toObject(),
          segmentName: segment.name,
        });
      }
    }
  }

  return upcomingTasks.sort((a, b) => a.dueDate - b.dueDate);
};

// Method to get delayed tasks
timelineSchema.methods.getDelayedTasks = function () {
  const now = new Date();
  const delayedTasks = [];

  for (const segment of this.segments) {
    for (const task of segment.tasks) {
      if (
        task.status !== "completed" &&
        task.status !== "canceled" &&
        task.dueDate < now
      ) {
        delayedTasks.push({
          ...task.toObject(),
          segmentName: segment.name,
          daysOverdue: Math.floor((now - task.dueDate) / (1000 * 60 * 60 * 24)),
        });
      }
    }
  }

  return delayedTasks.sort((a, b) => b.daysOverdue - a.daysOverdue);
};

// Create and export the model
const Timeline =
  mongoose.models.Timeline || mongoose.model("Timeline", timelineSchema);

export { Timeline };
