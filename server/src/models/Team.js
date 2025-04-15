import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderType: {
      type: String,
      enum: ["student", "supervisor", "admin"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        fileType: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isAnnouncement: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    teamId: {
      type: String,
      unique: true,
      sparse: true,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }, // Made optional
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["leader", "member"],
          default: "member",
        },
        status: {
          type: String,
          enum: ["active", "inactive", "pending", "removed"],
          default: "active",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    supervisors: [
      {
        supervisor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supervisor",
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["active", "inactive"],
          default: "active",
        },
        role: {
          type: String,
          enum: ["primary", "co_supervisor", "advisor", "industry_mentor"],
          default: "co_supervisor",
        },
      },
    ],
    maxMembers: {
      type: Number,
      default: 4,
    },
    minMembers: {
      type: Number,
      default: 2,
      validate: {
        validator: function (val) {
          return val >= 1 && val <= this.maxMembers;
        },
        message: "Minimum members must be between 1 and maximum members",
      },
    },
    chatMessages: [chatMessageSchema],
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      sparse: true,
    },
    invites: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined", "expired"],
          default: "pending",
        },
        inviteMessage: {
          type: String,
          maxlength: 200,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        respondedAt: {
          type: Date,
        },
      },
    ],
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    status: {
      type: String,
      enum: ["forming", "active", "completed", "archived"],
      default: "forming",
    },
    formationStrategy: {
      type: String,
      enum: ["self_formed", "admin_assigned", "algorithm_matched", "mixed"],
      default: "self_formed",
    },
    meetingSchedule: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "biweekly", "monthly", "ad_hoc"],
        default: "weekly",
      },
      preferredDays: [
        {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
      ],
      preferredTimeSlot: {
        start: String,
        end: String,
      },
    },
    preferredWorkingStyle: {
      type: String,
      enum: ["synchronous", "asynchronous", "mixed"],
      default: "mixed",
    },
    skillsNeeded: [
      {
        type: String,
        trim: true,
      },
    ],
    projectPreferences: [
      {
        type: String,
        trim: true,
      },
    ],
    performanceMetrics: {
      communicationScore: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      progressScore: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      collaborationScore: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      lastUpdated: Date,
    },
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
        assignedTo: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
          },
        ],
        completedAt: Date,
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
      },
    ],
    isOpenToNewMembers: {
      type: Boolean,
      default: true,
    },
    teamFiles: [
      {
        name: String,
        fileUrl: String,
        fileType: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        description: String,
        category: {
          type: String,
          enum: ["document", "presentation", "code", "design", "other"],
          default: "other",
        },
      },
    ],
    peerReviews: [
      {
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        reviewee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        submittedAt: Date,
        categories: [
          {
            name: String,
            score: Number,
            comment: String,
          },
        ],
        overallScore: Number,
        overallComment: String,
        isAnonymous: {
          type: Boolean,
          default: false,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to set leader field
teamSchema.pre("save", async function (next) {
  const leaderMember = this.members.find((m) => m.role === "leader");
  this.leader = leaderMember ? leaderMember.user : null;

  // Validate team size
  const activeMembers = this.members.filter((m) => m.status === "active");
  if (activeMembers.length > this.maxMembers) {
    throw new Error(`Team cannot have more than ${this.maxMembers} active members`);
  }

  // Auto-update status
  if (this.status === "forming" && activeMembers.length >= this.minMembers) {
    this.status = "active";
  } else if (this.status === "active" && activeMembers.length < this.minMembers) {
    this.status = "forming";
  }

  next();
});

// Method to check if team can accept new members
teamSchema.methods.canAcceptMembers = function () {
  return (
    this.members.length < this.maxMembers &&
    this.isOpenToNewMembers &&
    this.status !== "archived" &&
    this.status !== "completed"
  );
};

// Method to check if team is full
teamSchema.methods.isFull = function () {
  return this.members.length >= this.maxMembers;
};

// Method to get team leader
teamSchema.methods.getLeader = function () {
  return this.members.find((member) => member.role === "leader");
};

// Method to add member
teamSchema.methods.addMember = async function (studentId, options = {}) {
  const {
    role = "member",
    specialization = "none",
    responsibilities = [],
  } = options;

  if (!this.canAcceptMembers()) {
    throw new Error("Team is full or not accepting new members");
  }

  if (!this.members.some((m) => m.user.toString() === studentId.toString())) {
    if (role === "leader" && this.getLeader()) {
      throw new Error("Team already has a leader");
    }

    this.members.push({
      user: studentId,
      role,
      joinedAt: new Date(),
      specialization,
      responsibilities,
      status: "active",
    });
  }

  return this;
};

// Method to update member role
teamSchema.methods.updateMemberRole = function (studentId, newRole) {
  const memberIndex = this.members.findIndex(
    (m) => m.user.toString() === studentId.toString()
  );

  if (memberIndex === -1) {
    throw new Error("Member not found in team");
  }

  if (newRole === "leader") {
    const existingLeader = this.getLeader();
    if (
      existingLeader &&
      existingLeader.user.toString() !== studentId.toString()
    ) {
      throw new Error("Team already has a leader");
    }
  }

  this.members[memberIndex].role = newRole;
  return this;
};

// Method to remove member
teamSchema.methods.removeMember = function (studentId) {
  const memberIndex = this.members.findIndex(
    (m) => m.user.toString() === studentId.toString()
  );

  if (memberIndex === -1) {
    return false;
  }

  const wasLeader = this.members[memberIndex].role === "leader";
  this.members.splice(memberIndex, 1);

  if (wasLeader && this.members.length > 0) {
    this.members[0].role = "leader"; // Promote first remaining member
  }

  return true;
};

// Method to add chat message
teamSchema.methods.addMessage = async function (
  senderId,
  content,
  options = {}
) {
  const {
    attachments = [],
    senderType = "student",
    isAnnouncement = false,
    isPinned = false,
  } = options;

  const message = {
    sender: senderId,
    senderType,
    content,
    attachments,
    timestamp: new Date(),
    readBy: [{ user: senderId, readAt: new Date() }],
    isAnnouncement,
    isPinned,
  };

  this.chatMessages.push(message);
  return this;
};

// Method to mark messages as read
teamSchema.methods.markMessagesAsRead = function (userId) {
  this.chatMessages.forEach((message) => {
    if (!message.readBy.some((r) => r.user.toString() === userId.toString())) {
      message.readBy.push({ user: userId, readAt: new Date() });
    }
  });

  return this;
};

// Static method to find teams with space
teamSchema.statics.findTeamsWithSpace = function (sessionId) {
  return this.find({
    session: sessionId,
    $expr: {
      $lt: [{ $size: "$members" }, "$maxMembers"],
    },
    isOpenToNewMembers: true,
    status: { $in: ["forming", "active"] },
  });
};

// Method to find teams by student
teamSchema.statics.findByStudent = function (studentId, sessionId = null) {
  const query = {
    "members.user": studentId,
  };

  if (sessionId) {
    query.session = sessionId;
  }

  return this.find(query);
};

// Method to check if a user is a member
teamSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) =>
      member.user.toString() === userId.toString() && member.status === "active"
  );
};

// Method to check if a user can be invited
teamSchema.methods.canInvite = function (userId) {
  return (
    !this.isFull() &&
    !this.isMember(userId) &&
    this.isOpenToNewMembers &&
    this.status !== "archived" &&
    this.status !== "completed" &&
    !this.invites.some(
      (invite) =>
        invite.student.toString() === userId.toString() &&
        invite.status === "pending"
    )
  );
};

// Virtual for active members count
teamSchema.virtual("activeMembersCount").get(function () {
  return this.members.filter((m) => m.status === "active").length;
});

// Virtual for total members count
teamSchema.virtual("totalMemberCount").get(function () {
  return this.members.length;
});

// Virtual for pending invites count
teamSchema.virtual("pendingInvitesCount").get(function () {
  return this.invites.filter((invite) => invite.status === "pending").length;
});

// Virtual for team fullness percentage
teamSchema.virtual("fullnessPercentage").get(function () {
  return Math.round((this.members.length / this.maxMembers) * 100);
});

// Create index for faster lookups
teamSchema.index({ "members.user": 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ session: 1 });

const Team = mongoose.model("Team", teamSchema);

export default Team;
export { Team };