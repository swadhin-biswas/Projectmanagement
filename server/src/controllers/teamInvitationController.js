import { Notification } from "../models/Notification.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Send team invitation
export const sendTeamInvitation = async ({ params, body, user }) => {
  try {
    const inviter = await Student.findOne({ user: user.id });
    if (!inviter) {
      throw new NotFoundError("Student profile not found");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if inviter is a team leader
    const isLeader = team.members.some(m =>
      m.user.toString() === inviter._id.toString() &&
      (m.role === "leader" || m.role === "co_leader")
    );

    if (!isLeader) {
      throw new ForbiddenError("Only team leaders can send invitations");
    }

    // Validate team size
    if (team.members.length >= team.maxMembers) {
      throw new ValidationError(`Team is already at maximum capacity (${team.maxMembers} members)`);
    }

    // Find student to invite
    const invitee = await Student.findOne({ studentId: body.studentId });
    if (!invitee) {
      throw new NotFoundError("Student not found with the provided ID");
    }

    // Check if invitee is already in a team
    if (invitee.team) {
      throw new ValidationError("Student is already a member of another team");
    }

    // Check if invite already exists
    const existingInvite = team.invites.find(i =>
      i.student.toString() === invitee._id.toString() &&
      i.status === "pending"
    );

    if (existingInvite) {
      throw new ValidationError("An invitation has already been sent to this student");
    }

    // Check if team formation is still open
    const session = await Session.findById(team.session);
    if (!session || !session.isTeamFormationOpen()) {
      throw new ValidationError("Team formation period has ended");
    }

    // Create invitation
    const invitation = {
      student: invitee._id,
      invitedBy: inviter._id,
      status: "pending",
      inviteMessage: body.message,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    team.invites.push(invitation);
    await team.save();

    // Create notification for invitee
    await Notification.create({
      user: invitee.user,
      type: "team_invitation",
      message: `You have been invited to join team ${team.name}`,
      from: inviter.user,
      team: team._id,
      link: `/student/team-invites`
    });

    return {
      success: true,
      message: "Invitation sent successfully",
      data: {
        invitation,
        team: {
          id: team._id,
          name: team.name
        },
        invitee: {
          id: invitee._id,
          studentId: invitee.studentId
        }
      }
    };
  } catch (error) {
    logger.error("Failed to send team invitation", { error });
    throw error;
  }
};

// Get pending invitations
export const getPendingInvitations = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id })
      .populate({
        path: "team",
        select: "name members"
      });

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Get active session
    const session = await Session.findOne({ status: "active" });

    // Find all teams that have invited this student
    const teams = await Team.find({
      "invites": {
        $elemMatch: {
          student: student._id,
          status: "pending"
        }
      },
      session: session._id
    })
    .populate({
      path: "members.user",
      select: "fullName studentId"
    })
    .populate({
      path: "invites.invitedBy",
      select: "user",
      populate: {
        path: "user",
        select: "fullName"
      }
    });

    // Format invitations
    const pendingInvites = teams.map(team => {
      const invite = team.invites.find(i =>
        i.student.toString() === student._id.toString() &&
        i.status === "pending"
      );

      return {
        id: invite._id,
        team: {
          id: team._id,
          name: team.name,
          currentMembers: team.members.length,
          maxMembers: team.maxMembers,
          leader: team.members.find(m => m.role === "leader")?.user
        },
        invitedBy: {
          id: invite.invitedBy._id,
          name: invite.invitedBy.user.fullName
        },
        message: invite.inviteMessage,
        expiresAt: invite.expiresAt
      };
    });

    return {
      success: true,
      data: pendingInvites
    };
  } catch (error) {
    logger.error("Failed to get pending invitations", { error });
    throw error;
  }
};

// Process invitation response
export const respondToInvitation = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Find the invitation
    const inviteIndex = team.invites.findIndex(i =>
      i.student.toString() === student._id.toString() &&
      i.status === "pending"
    );

    if (inviteIndex === -1) {
      throw new NotFoundError("No pending invitation found");
    }

    // Check if invitation has expired
    if (new Date() > team.invites[inviteIndex].expiresAt) {
      team.invites[inviteIndex].status = "expired";
      await team.save();
      throw new ValidationError("Invitation has expired");
    }

    // Process response
    if (body.accept) {
      // Check if student is already in another team
      if (student.team) {
        throw new ValidationError("You are already a member of another team");
      }

      // Check if team is still under max capacity
      if (team.members.length >= team.maxMembers) {
        throw new ValidationError("Team is now full");
      }

      // Add student to team
      team.members.push({
        user: student._id,
        role: "member",
        joinedAt: new Date()
      });

      // Update student's team reference
      student.team = team._id;
      await student.save();

      // Create notification for team leader
      const leader = team.members.find(m => m.role === "leader");
      if (leader) {
        await Notification.create({
          user: leader.user,
          type: "team_member_joined",
          message: `${student.user.fullName} has joined your team`,
          team: team._id
        });
      }
    }

    // Update invitation status
    team.invites[inviteIndex].status = body.response;

    if (body.response === "declined") {
      // Create notification for team leader
      const leader = team.members.find(m => m.role === "leader");
      if (leader) {
        await Notification.create({
          user: leader.user,
          type: "team_invite_declined",
          title: "Team Invitation Declined",
          message: `${student.user.fullName} has declined to join your team`,
          team: team._id,
        });
      }
    }

    await team.save();

    return {
      success: true,
      message: body.accept ? "Successfully joined team" : "Invitation declined",
      data: body.accept ? {
        team: {
          id: team._id,
          name: team.name
        }
      } : null
    };
  } catch (error) {
    logger.error("Failed to process invitation response", { error });
    throw error;
  }
};