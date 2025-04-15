import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^STU\d{6}$/.test(v);
        },
        message: "Student ID must start with STU followed by 6 digits",
      },
    },
    profilePicture: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif)(\?.*)?$/i.test(v);
        },
        message:
          "Profile picture must be a valid image URL (jpg, jpeg, png, or gif)",
      },
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    isTeamLeader: {
      type: Boolean,
      default: false,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    academicYear: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{4}$/.test(v);
        },
        message: "Academic year must be in format YYYY-YYYY",
      },
    },
    pendingInvites: [
      {
        team: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Team",
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending",
        },
        expiresAt: {
          type: Date,
          default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    ],
    marks: [
      {
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
        supervisor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supervisor",
        },
        category: {
          type: String,
          enum: ["proposal", "progress", "final", "presentation"],
        },
        score: {
          type: Number,
          min: 0,
          max: 100,
        },
        feedback: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notifications: [
      {
        type: {
          type: String,
          enum: [
            "team_invite",
            "project_feedback",
            "deadline_reminder",
            "supervisor_message",
            "team_update",
            "team_chat_mention",
            "project_submission",
            "team_role_change",
            "team_member_left",
            "team_member_joined",
          ],
        },
        title: String,
        message: String,
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        team: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Team",
        },
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
        link: String,
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
    progress: {
      overallProgress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      lastUpdated: Date,
      milestones: [
        {
          title: String,
          completedAt: Date,
          verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supervisor",
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Method to handle team invitation
studentSchema.methods.sendTeamInvite = async function (teamId) {
  if (this.team) {
    throw new Error("Student is already in a team");
  }

  const existingInvite = this.pendingInvites.find(
    (invite) =>
      invite.team.toString() === teamId.toString() &&
      invite.status === "pending"
  );
  if (existingInvite) {
    throw new Error("Student already has a pending invite from this team");
  }

  this.pendingInvites.push({
    team: teamId,
    invitedBy: this._id,
  });

  await this.save();
  return this.pendingInvites;
};

// Method to respond to team invitation
studentSchema.methods.respondToInvite = async function (teamId, accept) {
  const invite = this.pendingInvites.find(
    (i) => i.team.toString() === teamId.toString() && i.status === "pending"
  );
  if (!invite) {
    throw new Error("No pending invite found from this team");
  }

  invite.status = accept ? "accepted" : "declined";

  if (accept) {
    const team = await mongoose.model("Team").findById(teamId);
    if (!team || !team.canAcceptMembers()) {
      throw new Error("Team is full or not found");
    }

    this.team = teamId;
    await team.addMember(this._id);
    await team.save();
  }

  await this.save();
  return accept ? this.team : null;
};

const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);

export { Student };