// TeamInvitation model for handling team invitations
import mongoose from "mongoose";

const teamInvitationSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled", "expired"],
      default: "pending",
    },
    inviteMessage: {
      type: String,
      trim: true,
    },
    responseMessage: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: Date,
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create compound index to prevent duplicate invitations
teamInvitationSchema.index(
  { team: 1, invitee: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

// Method to check if invitation is expired
teamInvitationSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Method to accept invitation
teamInvitationSchema.methods.accept = function () {
  if (this.status !== "pending") {
    throw new Error(
      `Invitation cannot be accepted (current status: ${this.status})`
    );
  }

  if (this.isExpired()) {
    this.status = "expired";
    throw new Error("Invitation has expired");
  }

  this.status = "accepted";
  this.respondedAt = new Date();
  return this;
};

// Method to decline invitation
teamInvitationSchema.methods.decline = function (message = "") {
  if (this.status !== "pending") {
    throw new Error(
      `Invitation cannot be declined (current status: ${this.status})`
    );
  }

  if (this.isExpired()) {
    this.status = "expired";
    throw new Error("Invitation has expired");
  }

  this.status = "declined";
  this.responseMessage = message;
  this.respondedAt = new Date();
  return this;
};

// Method to cancel invitation (by inviter)
teamInvitationSchema.methods.cancel = function () {
  if (this.status !== "pending") {
    throw new Error(
      `Invitation cannot be cancelled (current status: ${this.status})`
    );
  }

  this.status = "cancelled";
  this.respondedAt = new Date();
  return this;
};

// Static method to find pending invitations for a student
teamInvitationSchema.statics.findPendingForStudent = function (studentId) {
  return this.find({
    invitee: studentId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .populate("team")
    .populate({
      path: "inviter",
      populate: {
        path: "user",
        select: "fullName email profilePicture",
      },
    });
};

// Static method to find pending invitations for a team
teamInvitationSchema.statics.findPendingForTeam = function (teamId) {
  return this.find({
    team: teamId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).populate({
    path: "invitee",
    populate: {
      path: "user",
      select: "fullName email profilePicture",
    },
  });
};

// Static method to mark expired invitations
teamInvitationSchema.statics.markExpired = async function () {
  const result = await this.updateMany(
    {
      status: "pending",
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: "expired", respondedAt: new Date() },
    }
  );

  return result.modifiedCount;
};

// Static method to check if a student has a pending invitation to a team
teamInvitationSchema.statics.hasPendingInvitation = async function (
  teamId,
  studentId
) {
  const invitation = await this.findOne({
    team: teamId,
    invitee: studentId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  return !!invitation;
};

// Virtual for time until expiration
teamInvitationSchema.virtual("timeRemaining").get(function () {
  if (this.status !== "pending") return 0;

  const now = new Date();
  if (this.expiresAt < now) return 0;

  return this.expiresAt - now;
});

const TeamInvitation =
  mongoose.models.TeamInvitation ||
  mongoose.model("TeamInvitation", teamInvitationSchema);

export { TeamInvitation };
