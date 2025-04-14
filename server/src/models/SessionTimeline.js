import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ["deadline", "administrative", "review", "milestone", "other"],
    default: "administrative",
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "delayed", "cancelled"],
    default: "pending",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
  assignedTo: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  completedDate: Date,
  notes: String,
  relatedDeadline: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Deadline",
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const sessionTimelineSchema = new mongoose.Schema(
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
    tasks: [taskSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
sessionTimelineSchema.index({ session: 1 }, { unique: true });
sessionTimelineSchema.index({ "tasks.dueDate": 1 });
sessionTimelineSchema.index({ "tasks.status": 1 });
sessionTimelineSchema.index({ "tasks.category": 1 });

// Virtual to calculate overall progress
sessionTimelineSchema.virtual("progress").get(function () {
  if (!this.tasks || this.tasks.length === 0) return 0;

  const completedTasks = this.tasks.filter(
    (task) => task.status === "completed"
  ).length;
  return Math.round((completedTasks / this.tasks.length) * 100);
});

// Virtual to get upcoming tasks
sessionTimelineSchema.virtual("upcomingTasks").get(function () {
  const now = new Date();
  return this.tasks
    .filter(
      (task) =>
        task.dueDate > now &&
        task.status !== "completed" &&
        task.status !== "cancelled"
    )
    .sort((a, b) => a.dueDate - b.dueDate);
});

// Virtual to get overdue tasks
sessionTimelineSchema.virtual("overdueTasks").get(function () {
  const now = new Date();
  return this.tasks
    .filter(
      (task) =>
        task.dueDate < now &&
        task.status !== "completed" &&
        task.status !== "cancelled"
    )
    .sort((a, b) => a.dueDate - b.dueDate);
});

// Pre-save middleware to update lastModified
sessionTimelineSchema.pre("save", function (next) {
  this.lastModified = new Date();
  next();
});

// Create model from schema
export const SessionTimeline = mongoose.model(
  "SessionTimeline",
  sessionTimelineSchema
);
