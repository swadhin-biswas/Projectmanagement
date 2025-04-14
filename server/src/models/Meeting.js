import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      default: 60,
    },
    location: {
      type: String,
      default: "Online",
    },
    meetingLink: String,
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supervisor",
      required: true,
    },
    attendees: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["student", "supervisor", "admin"],
          default: "student",
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined", "attended"],
          default: "pending",
        },
        joinedAt: Date,
        leftAt: Date,
      },
    ],
    agenda: [String],
    notes: String,
    outcomes: [String],
    nextSteps: [String],
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
    meetingType: {
      type: String,
      enum: ["regular", "emergency", "review", "milestone", "other"],
      default: "regular",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      default: "scheduled",
    },
    recurrence: {
      isRecurring: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "biweekly", "monthly"],
        default: "weekly",
      },
      endDate: Date,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notificationsSent: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster queries
meetingSchema.index({ supervisor: 1, date: 1 });
meetingSchema.index({ team: 1, date: 1 });
meetingSchema.index({ session: 1 });
meetingSchema.index({ "attendees.user": 1 });
meetingSchema.index({ status: 1, date: 1 });

// Virtual property for calculating if the meeting is past due
meetingSchema.virtual("isPastDue").get(function () {
  return new Date() > this.date;
});

// Pre-save hook to ensure end time is after start time
meetingSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    const start = new Date(`1970-01-01T${this.startTime}:00`);
    const end = new Date(`1970-01-01T${this.endTime}:00`);

    if (end <= start) {
      return next(new Error("End time must be after start time"));
    }

    // Calculate duration in minutes
    this.duration = Math.round((end - start) / 60000);
  }
  next();
});

export const Meeting = mongoose.model("Meeting", meetingSchema);
