/* Team model implementation */
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
      sparse: true, // Allows null values without duplicate key errors
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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

// Middleware to validate team size and status
teamSchema.pre("save", async function (next) {
  // Validate team size
  const activeMembers = this.members.filter((m) => m.status === "active");
  if (activeMembers.length > this.maxMembers) {
    throw new Error(
      `Team cannot have more than ${this.maxMembers} active members`
    );
  }

  // Auto-update status based on active member count
  if (this.status === "forming" && activeMembers.length >= this.minMembers) {
    this.status = "active";
  } else if (
    this.status === "active" &&
    activeMembers.length < this.minMembers
  ) {
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

// Add method to check if team is full
teamSchema.methods.isFull = function () {
  return this.members.length >= this.maxMembers;
};

// Method to get team leader
teamSchema.methods.getLeader = function () {
  return this.members.find((member) => member.role === "leader");
};

// Method to get team co-leaders
teamSchema.methods.getCoLeaders = function () {
  return this.members.filter((member) => member.role === "co_leader");
};

// Method to get all leadership (leader and co-leaders)
teamSchema.methods.getLeadership = function () {
  return this.members.filter(
    (member) => member.role === "leader" || member.role === "co_leader"
  );
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
    // If adding as leader, ensure there's no existing leader
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

  // If updating to leader, ensure there's no other leader
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

  // Remove the member
  this.members.splice(memberIndex, 1);

  // If removed member was the leader, promote a co-leader if available
  if (this.members.length > 0) {
    const wasLeader = this.members[memberIndex]?.role === "leader";
    if (wasLeader) {
      const coLeader = this.members.find((m) => m.role === "co_leader");
      if (coLeader) {
        coLeader.role = "leader";
      } else if (this.members.length > 0) {
        // Promote the longest-serving member
        this.members.sort((a, b) => a.joinedAt - b.joinedAt);
        this.members[0].role = "leader";
      }
    }
  }

  return true;
};

// Add method to add chat message
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

// Method to pin/unpin message
teamSchema.methods.togglePinMessage = function (messageId, pinStatus) {
  const message = this.chatMessages.id(messageId);
  if (message) {
    message.isPinned = pinStatus;
    return true;
  }
  return false;
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

// Method to find teams by supervisor
teamSchema.statics.findBySupervisor = function (supervisorId, options = {}) {
  const query = {
    "supervisors.supervisor": supervisorId,
    "supervisors.status": "active",
  };

  if (options.sessionId) {
    query.session = options.sessionId;
  }

  if (options.status) {
    query.status = options.status;
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

// Method to check if a user is the leader
teamSchema.methods.isLeader = function (userId) {
  const leader = this.getLeader();
  return leader && leader.user.toString() === userId.toString();
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

// Virtual for active supervisors count
teamSchema.virtual("activeSupervisorsCount").get(function () {
  return this.supervisors.filter((s) => s.status === "active").length;
});

// Virtual for team formation progress
teamSchema.virtual("formationProgress").get(function () {
  if (this.members.length >= this.minMembers) {
    return 100;
  }
  return Math.round((this.members.length / this.minMembers) * 100);
});

// Virtual for team fullness percentage
teamSchema.virtual("fullnessPercentage").get(function () {
  return Math.round((this.members.length / this.maxMembers) * 100);
});

// Method to get unread messages
teamSchema.methods.getUnreadMessages = function (userId) {
  return this.chatMessages.filter(
    (msg) => !msg.readBy.some((r) => r.user.toString() === userId.toString())
  );
};

// Method to get unread count
teamSchema.methods.getUnreadCount = function (userId) {
  return this.getUnreadMessages(userId).length;
};

// Method to get messages after a certain date
teamSchema.methods.getMessagesAfter = function (date) {
  return this.chatMessages
    .filter((msg) => msg.timestamp > date)
    .sort((a, b) => a.timestamp - b.timestamp);
};

// Method to get pinned messages
teamSchema.methods.getPinnedMessages = function () {
  return this.chatMessages.filter((msg) => msg.isPinned);
};

// Method to add supervisor
teamSchema.methods.addSupervisor = function (supervisorId, options = {}) {
  const { assignedBy = null, role = "co_supervisor" } = options;

  // Check if supervisor already exists
  const existingSupervisor = this.supervisors.find(
    (s) => s.supervisor.toString() === supervisorId.toString()
  );

  if (existingSupervisor) {
    // If inactive, reactivate
    if (existingSupervisor.status === "inactive") {
      existingSupervisor.status = "active";
      existingSupervisor.assignedAt = new Date();

      if (assignedBy) {
        existingSupervisor.assignedBy = assignedBy;
      }

      if (role) {
        existingSupervisor.role = role;
      }
    }
  } else {
    // Add new supervisor
    this.supervisors.push({
      supervisor: supervisorId,
      assignedAt: new Date(),
      assignedBy: assignedBy,
      status: "active",
      role,
    });
  }

  return this;
};

// Method to update supervisor role
teamSchema.methods.updateSupervisorRole = function (supervisorId, role) {
  const supervisorIndex = this.supervisors.findIndex(
    (s) =>
      s.supervisor.toString() === supervisorId.toString() &&
      s.status === "active"
  );

  if (supervisorIndex === -1) {
    return false;
  }

  this.supervisors[supervisorIndex].role = role;
  return true;
};

// Method to remove supervisor
teamSchema.methods.removeSupervisor = function (supervisorId) {
  const supervisorIndex = this.supervisors.findIndex(
    (s) => s.supervisor.toString() === supervisorId.toString()
  );

  if (supervisorIndex !== -1) {
    // Set to inactive instead of removing
    this.supervisors[supervisorIndex].status = "inactive";
    return true;
  }

  return false;
};

// Method to get active supervisors
teamSchema.methods.getActiveSupervisors = function () {
  return this.supervisors.filter((s) => s.status === "active");
};

// Method to get primary supervisor
teamSchema.methods.getPrimarySupervisor = function () {
  return this.supervisors.find(
    (s) => s.status === "active" && s.role === "primary"
  );
};

// Method to add a milestone
teamSchema.methods.addMilestone = function (milestone) {
  if (!this.milestones) {
    this.milestones = [];
  }

  this.milestones.push(milestone);
  return this;
};

// Method to update milestone status
teamSchema.methods.updateMilestoneStatus = function (
  milestoneId,
  status,
  completedBy = null
) {
  const milestone = this.milestones.id(milestoneId);

  if (!milestone) {
    return false;
  }

  milestone.status = status;

  if (status === "completed") {
    milestone.completedAt = new Date();
    if (completedBy) {
      milestone.completedBy = completedBy;
    }
  }

  return true;
};

// Method to add a team file
teamSchema.methods.addFile = function (file) {
  if (!this.teamFiles) {
    this.teamFiles = [];
  }

  this.teamFiles.push({
    ...file,
    uploadedAt: new Date(),
  });

  return this;
};

// Method to add a peer review
teamSchema.methods.addPeerReview = function (review) {
  if (!this.peerReviews) {
    this.peerReviews = [];
  }

  // Check if reviewer has already reviewed this person
  const existingReviewIndex = this.peerReviews.findIndex(
    (r) =>
      r.reviewer.toString() === review.reviewer.toString() &&
      r.reviewee.toString() === review.reviewee.toString()
  );

  if (existingReviewIndex !== -1) {
    // Update existing review
    this.peerReviews[existingReviewIndex] = {
      ...this.peerReviews[existingReviewIndex],
      ...review,
      submittedAt: new Date(),
    };
  } else {
    // Add new review
    this.peerReviews.push({
      ...review,
      submittedAt: new Date(),
    });
  }

  return this;
};

// Method to process invites that have expired
teamSchema.statics.processExpiredInvites = async function () {
  const now = new Date();

  // Find teams with expired invites
  const teams = await this.find({
    "invites.expiresAt": { $lt: now },
    "invites.status": "pending",
  });

  // Update expired invites
  let processedCount = 0;
  for (const team of teams) {
    team.invites.forEach((invite) => {
      if (invite.expiresAt < now && invite.status === "pending") {
        invite.status = "cancelled";
        invite.respondedAt = now;
        processedCount++;
      }
    });

    await team.save();
  }

  return processedCount;
};

// Method to generate team statistics
teamSchema.methods.getStatistics = function () {
  return {
    memberCount: this.activeMembersCount,
    totalMembers: this.totalMemberCount,
    fullnessPercentage: this.fullnessPercentage,
    formationProgress: this.formationProgress,
    activeSupervisorsCount: this.activeSupervisorsCount,
    hasProject: !!this.project,
    pendingInvites: this.pendingInvitesCount,
    messageCount: this.chatMessages.length,
    announcementCount: this.chatMessages.filter((m) => m.isAnnouncement).length,
    fileCount: this.teamFiles ? this.teamFiles.length : 0,
    milestoneCount: this.milestones ? this.milestones.length : 0,
    completedMilestones: this.milestones
      ? this.milestones.filter((m) => m.status === "completed").length
      : 0,
    peerReviewCount: this.peerReviews ? this.peerReviews.length : 0,
    memberRoles: this.members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {}),
    memberSpecializations: this.members.reduce((acc, member) => {
      if (member.specialization !== "none") {
        acc[member.specialization] = (acc[member.specialization] || 0) + 1;
      }
      return acc;
    }, {}),
  };
};

// Method to generate a unique team ID
teamSchema.statics.generateUniqueTeamId = async function (prefix = "TEAM") {
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  const candidateId = `${prefix}-${randomPart}`;

  // Check if this ID already exists
  const existingTeam = await this.findOne({ teamId: candidateId });

  if (existingTeam) {
    // If exists, try again recursively
    return this.generateUniqueTeamId(prefix);
  }

  return candidateId;
};

// Method to get peer review summary for a member
teamSchema.methods.getPeerReviewSummary = function (studentId) {
  if (!this.peerReviews || this.peerReviews.length === 0) {
    return null;
  }

  const reviews = this.peerReviews.filter(
    (r) => r.reviewee.toString() === studentId.toString()
  );

  if (reviews.length === 0) {
    return null;
  }

  // Calculate average overall score
  const overallAvg =
    reviews.reduce((sum, review) => sum + review.overallScore, 0) /
    reviews.length;

  // Calculate category averages
  const categories = {};
  reviews.forEach((review) => {
    review.categories.forEach((cat) => {
      if (!categories[cat.name]) {
        categories[cat.name] = { sum: 0, count: 0 };
      }
      categories[cat.name].sum += cat.score;
      categories[cat.name].count++;
    });
  });

  const categoryAverages = Object.entries(categories).reduce(
    (acc, [name, data]) => {
      acc[name] = data.sum / data.count;
      return acc;
    },
    {}
  );

  return {
    reviewCount: reviews.length,
    overallScore: Math.round(overallAvg * 10) / 10,
    categoryScores: categoryAverages,
    reviewers: reviews.map((r) => ({
      reviewerId: r.isAnonymous ? null : r.reviewer,
      overallScore: r.overallScore,
      submittedAt: r.submittedAt,
    })),
  };
};

// Create index for faster lookups
teamSchema.index({ leader: 1 });
teamSchema.index({ "members.user": 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ session: 1 });

// Team Model
const Team = mongoose.model("Team", teamSchema);

// Export as both default and named export
export default Team;
export { Team };
