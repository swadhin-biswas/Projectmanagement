import Invitation from "../models/Invitation.js";
import { Notification } from "../models/Notification.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { TeamChat } from "../models/TeamChat.js";
import { User } from "../models/User.js";
import { trackTeamMemberActivity } from "../services/activityService.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import { generateRandomId } from "../utils/helpers.js";
import logger from "../utils/logger.js";

/**
 * Create a new team
 * - Student who creates the team becomes the team leader
 * - Teams can have a maximum of 4 members
 */
export const createTeam = async ({ body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email"
    );
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Validate required fields
    if (!body.name?.trim()) {
      throw new ValidationError("Team name is required");
    }

    if (body.name.length < 3 || body.name.length > 50) {
      throw new ValidationError(
        "Team name must be between 3 and 50 characters"
      );
    }

    // Check if student is already in a team
    const existingTeam = await Team.findOne({
      "members.user": student._id,
      "members.status": "active",
    });

    if (existingTeam) {
      throw new ValidationError("You are already a member of a team");
    }

    // Get active session
    const currentSession = await Session.findOne({ status: "active" });
    if (!currentSession) {
      throw new ValidationError("No active session found");
    }

    // Generate unique team ID
    const teamId = generateRandomId(8);

    // Create team with student as leader
    const team = new Team({
      name: body.name,
      teamId,
      session: currentSession._id,
      maxMembers: 4, // Maximum of 4 members per team
      members: [
        {
          user: student._id,
          role: "leader", // Creator becomes team leader
          status: "active",
          joinedAt: new Date(),
        },
      ],
      description:
        body.description || `Team created by ${student.user.fullName}`,
      status: "forming",
    });

    await team.save();

    // Update student's team reference
    student.team = team._id;
    student.isTeamLeader = true;
    await student.save();

    // Create team chat
    await TeamChat.create({
      team: team._id,
      messages: [
        {
          type: "system",
          content: `Team "${body.name}" created by ${student.user.fullName}`,
          timestamp: new Date(),
        },
      ],
    });

    logger.info(`Team created successfully: ${team.name}`, {
      teamId: team._id,
      createdBy: user.id,
    });

    // Return the newly created team
    return {
      success: true,
      message: "Team created successfully! You are now the team leader.",
      data: {
        _id: team._id,
        name: team.name,
        teamId: team.teamId,
        members: [
          {
            user: {
              _id: student._id,
              fullName: student.user.fullName,
              email: student.user.email,
              profilePicture: student.profilePicture || "",
            },
            role: "leader",
            joinedAt: new Date(),
          },
        ],
        maxMembers: team.maxMembers,
        description: team.description,
        status: team.status,
        session: currentSession._id,
      },
    };
  } catch (error) {
    logger.error("Failed to create team", { error, userId: user.id });
    throw error;
  }
};

/**
 * Invite a student to join the team
 * - Both team leaders and members can invite others
 * - Teams cannot exceed 4 members
 * - Can invite by student ID
 */
export const inviteToTeam = async ({ params, body, user }) => {
  try {
    const inviter = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email"
    );
    if (!inviter) {
      throw new NotFoundError("Student profile not found");
    }

    // Get the team
    const team = await Team.findById(params.teamId).populate({
      path: "members.user",
      select: "user",
      populate: { path: "user", select: "fullName email" },
    });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Verify inviter is a member of the team
    const isMember = team.members.some(
      (m) =>
        m.user._id.toString() === inviter._id.toString() &&
        m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError(
        "You must be a member of this team to send invitations"
      );
    }

    // Check if team is already full
    const activeMembers = team.members.filter((m) => m.status === "active");
    if (activeMembers.length >= team.maxMembers) {
      throw new ValidationError(
        `Team has reached maximum capacity (${team.maxMembers} members)`
      );
    }

    // Find the student to invite by student ID
    if (!body.studentId?.trim()) {
      throw new ValidationError("Student ID is required");
    }

    const invitee = await Student.findOne({
      studentId: body.studentId,
    }).populate("user", "fullName email");
    if (!invitee) {
      throw new NotFoundError("Student not found with the provided ID");
    }

    // Prevent inviting oneself
    if (invitee._id.toString() === inviter._id.toString()) {
      throw new ValidationError("You cannot invite yourself to the team");
    }

    // Check if student is already in a team
    if (invitee.team) {
      throw new ValidationError(
        "This student is already a member of another team"
      );
    }

    // Check if student already has a pending invitation from this team
    const existingInvite = team.invites.find(
      (invite) =>
        invite.student.toString() === invitee._id.toString() &&
        invite.status === "pending"
    );

    if (existingInvite) {
      throw new ValidationError(
        "This student already has a pending invitation to join this team"
      );
    }

    // Create the invitation
    const invitation = {
      student: invitee._id,
      status: "pending",
      invitedBy: inviter._id,
      inviteMessage: body.message || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    team.invites.push(invitation);
    await team.save();

    // Create notification for the invited student
    await Notification.create({
      user: invitee.user,
      type: "team_invite",
      title: "Team Invitation",
      message: `You have been invited to join team "${team.name}" by ${inviter.user.fullName}`,
      from: inviter.user,
      team: team._id,
      link: "/student/team/management",
      isRead: false,
    });

    logger.info(`Team invitation sent to ${invitee.studentId}`, {
      teamId: team._id,
      inviterId: inviter._id,
      inviteeId: invitee._id,
    });

    return {
      success: true,
      message: `Invitation sent to ${invitee.user.fullName} (${invitee.studentId})`,
      data: {
        invitation,
        team: {
          id: team._id,
          name: team.name,
        },
        invitee: {
          id: invitee._id,
          studentId: invitee.studentId,
          fullName: invitee.user.fullName,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to send team invitation", { error, userId: user.id });
    throw error;
  }
};

/**
 * Respond to a team invitation (accept/decline)
 */
export const respondToInvitation = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email"
    );
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const team = await Team.findById(params.teamId).populate({
      path: "members.user",
      select: "user",
      populate: { path: "user", select: "fullName email" },
    });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Find the invitation
    const inviteIndex = team.invites.findIndex(
      (invite) =>
        invite.student.toString() === student._id.toString() &&
        invite.status === "pending"
    );

    if (inviteIndex === -1) {
      throw new NotFoundError("No pending invitation found for this team");
    }

    // Check if invitation has expired
    if (new Date() > team.invites[inviteIndex].expiresAt) {
      team.invites[inviteIndex].status = "expired";
      await team.save();
      throw new ValidationError("This invitation has expired");
    }

    // Process the response (accept or decline)
    const accept = body.response === "accept";
    team.invites[inviteIndex].status = accept ? "accepted" : "declined";
    team.invites[inviteIndex].respondedAt = new Date();

    if (accept) {
      // Check if student is already in another team
      if (student.team) {
        throw new ValidationError("You are already a member of another team");
      }

      // Check if team is still under max capacity
      const activeMembers = team.members.filter((m) => m.status === "active");
      if (activeMembers.length >= team.maxMembers) {
        throw new ValidationError(
          "This team is now full and cannot accept new members"
        );
      }

      // Add student to team
      team.members.push({
        user: student._id,
        role: "member",
        status: "active",
        joinedAt: new Date(),
      });

      // Update student record
      student.team = team._id;
      student.isTeamLeader = false;
      await student.save();

      // Get team leader for notification
      const teamLeader = team.members.find((m) => m.role === "leader");
      if (teamLeader) {
        // Notify team leader
        await Notification.create({
          user: teamLeader.user.user,
          type: "team_member_joined",
          title: "New Team Member",
          message: `${student.user.fullName} has joined your team "${team.name}"`,
          team: team._id,
          link: "/student/team/management",
        });
      }

      // Add a system message to team chat
      await TeamChat.findOneAndUpdate(
        { team: team._id },
        {
          $push: {
            messages: {
              type: "system",
              content: `${student.user.fullName} has joined the team`,
              timestamp: new Date(),
            },
          },
        }
      );
    }

    await team.save();

    return {
      success: true,
      message: accept
        ? "You have successfully joined the team!"
        : "Invitation declined",
      data: accept
        ? {
            team: {
              _id: team._id,
              name: team.name,
              teamId: team.teamId,
            },
          }
        : null,
    };
  } catch (error) {
    logger.error("Failed to process invitation response", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

export const removeTeamMember = async ({ params, body, user }) => {
  try {
    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    const memberToRemove = await Student.findById(params.memberId);
    if (!memberToRemove) {
      throw new NotFoundError("Member not found");
    }

    // Check if the member exists in the team
    const memberIndex = team.members.findIndex(
      (m) => m.user.toString() === memberToRemove._id.toString()
    );

    if (memberIndex === -1) {
      throw new ValidationError("User is not a member of this team");
    }

    // Remove the member
    team.members.splice(memberIndex, 1);

    // If member was leader, assign new leader if there are other members
    if (
      team.members.length > 0 &&
      team.members[memberIndex].role === "leader"
    ) {
      team.members[0].role = "leader";
    }

    await team.save();

    // Track activity if project exists
    if (team.project) {
      await trackTeamMemberActivity(
        team.project,
        user.id,
        "leave",
        memberToRemove._id
      );
    }

    return {
      success: true,
      message: "Team member removed successfully",
      data: team,
    };
  } catch (error) {
    logger.error("Failed to remove team member", error);
    throw error;
  }
};

// Elysia-compatible API endpoints for team management
// These work with the new router implementation

/**
 * Get user's teams - Elysia implementation
 */
export const getMyTeams = async ({ user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const teams = await Team.find({
      members: { $elemMatch: { user: user.id, status: "active" } },
    }).populate("members.user", "fullName email");

    return {
      success: true,
      data: teams,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error fetching user teams:", error);
    throw error;
  }
};

/**
 * Get team by ID - Elysia implementation
 */
export const getTeamById = async ({ params, user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const team = await Team.findById(params.teamId)
      .populate("members.user", "fullName email")
      .populate("leader", "fullName email");

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if user is a member of the team
    const isMember = team.members.some(
      (member) =>
        member.user._id.toString() === user.id && member.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    return {
      success: true,
      data: team,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error fetching team:", error);
    throw error;
  }
};

/**
 * Update team details - Elysia implementation
 */
export const updateTeam = async ({ params, body, user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Find team leader
    const leaderMember = team.members.find((m) => m.role === "leader");
    if (!leaderMember || leaderMember.user.toString() !== user.id) {
      throw new ForbiddenError("Only team leader can update team details");
    }

    if (body.name) {
      team.name = body.name;
    }

    if (body.description !== undefined) {
      team.description = body.description;
    }

    await team.save();

    return {
      success: true,
      data: team,
      message: "Team updated successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error updating team:", error);
    throw error;
  }
};

/**
 * Delete a team - Elysia implementation
 */
export const deleteTeam = async ({ params, user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Find team leader
    const leaderMember = team.members.find((m) => m.role === "leader");
    if (!leaderMember || leaderMember.user.toString() !== user.id) {
      throw new ForbiddenError("Only team leader can delete the team");
    }

    // Delete all pending invitations for this team
    await Invitation.deleteMany({ team: params.teamId });

    // Update all student records that reference this team
    for (const member of team.members) {
      await Student.findByIdAndUpdate(member.user, {
        $unset: { team: 1 },
        isTeamLeader: false,
      });
    }

    // Delete team chat
    await TeamChat.findOneAndDelete({ team: params.teamId });

    // Delete the team
    await Team.findByIdAndDelete(params.teamId);

    return {
      success: true,
      message: "Team deleted successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error deleting team:", error);
    throw error;
  }
};

/**
 * Send invitation - Elysia implementation
 */
export const inviteUser = async ({ body, user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const { teamId, studentId } = body;

    // Validate team exists
    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if user is a member of the team
    const isMember = team.members.some(
      (m) => m.user.toString() === user.id && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You must be a team member to send invitations");
    }

    // Validate invited user exists
    const invitedUser = await User.findOne({ studentId });
    if (!invitedUser) {
      throw new NotFoundError("Student not found");
    }

    // Check if team is already at maximum capacity
    const activeMembers = team.members.filter((m) => m.status === "active");
    if (activeMembers.length >= 4) {
      throw new ValidationError(
        "Team already has the maximum number of members (4)"
      );
    }

    // Check if user is already a member of the team
    if (
      team.members.some((m) => m.user.toString() === invitedUser._id.toString())
    ) {
      throw new ValidationError("User is already a member of this team");
    }

    // Check if the invited user is already in a team
    const student = await Student.findOne({ user: invitedUser._id });
    if (student && student.team) {
      throw new ValidationError("User is already a member of another team");
    }

    // Check if there's already a pending invitation for this user and team
    const existingInvitation = await Invitation.findOne({
      team: teamId,
      invitedUser: invitedUser._id,
      status: "pending",
    });

    if (existingInvitation) {
      throw new ValidationError(
        "An invitation has already been sent to this user"
      );
    }

    // Create new invitation
    const invitation = new Invitation({
      team: teamId,
      invitedBy: user.id,
      invitedUser: invitedUser._id,
    });

    await invitation.save();
    logger.info(
      `Invitation sent to ${invitedUser.email} for team ${team.name}`
    );

    // Create notification
    await Notification.create({
      user: invitedUser._id,
      type: "team_invite",
      title: "Team Invitation",
      message: `You have been invited to join team "${team.name}"`,
      from: user.id,
      team: teamId,
      link: "/student/team/invitations",
      isRead: false,
    });

    return {
      success: true,
      data: invitation,
      message: "Invitation sent successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error sending invitation:", error);
    throw error;
  }
};

/**
 * Get user's pending invitations - Elysia implementation
 */
export const getPendingInvitations = async ({ user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const invitations = await Invitation.find({
      invitedUser: user.id,
      status: "pending",
    })
      .populate("team", "name description")
      .populate("invitedBy", "fullName email");

    return {
      success: true,
      data: invitations,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error fetching invitations:", error);
    throw error;
  }
};

/**
 * Accept team invitation - Elysia implementation
 */
export const acceptInvitation = async ({ params, user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const invitation = await Invitation.findById(params.invitationId);
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    // Check if the invitation is for the current user
    if (invitation.invitedUser.toString() !== user.id) {
      throw new ForbiddenError("This invitation is not for you");
    }

    // Check if the invitation is still pending
    if (invitation.status !== "pending") {
      throw new ValidationError(
        `Invitation has already been ${invitation.status}`
      );
    }

    // Check if the user is already in a team
    const student = await Student.findOne({ user: user.id });
    if (student && student.team) {
      invitation.status = "declined";
      invitation.respondedAt = new Date();
      await invitation.save();

      throw new ValidationError("You are already a member of a team");
    }

    // Check if the team still exists
    const team = await Team.findById(invitation.team);
    if (!team) {
      invitation.status = "declined";
      invitation.respondedAt = new Date();
      await invitation.save();

      throw new NotFoundError("Team no longer exists");
    }

    // Check if the team is already at maximum capacity
    if (team.members.length >= 4) {
      invitation.status = "declined";
      invitation.respondedAt = new Date();
      await invitation.save();

      throw new ValidationError(
        "Team already has the maximum number of members (4)"
      );
    }

    // Update invitation status
    invitation.status = "accepted";
    invitation.respondedAt = new Date();
    await invitation.save();

    // Add user to team
    team.members.push({
      user: user.id,
      role: "member",
      status: "active",
      joinedAt: new Date(),
    });
    await team.save();

    // Update student record
    if (student) {
      student.team = team._id;
      student.isTeamLeader = false;
      await student.save();
    }

    // Decline all other pending invitations for this user
    await Invitation.updateMany(
      {
        invitedUser: user.id,
        status: "pending",
        _id: { $ne: params.invitationId },
      },
      {
        status: "declined",
        respondedAt: new Date(),
      }
    );

    // Add system message to team chat
    const userInfo = await User.findById(user.id, "fullName");
    await TeamChat.findOneAndUpdate(
      { team: team._id },
      {
        $push: {
          messages: {
            type: "system",
            content: `${
              userInfo?.fullName || "A new user"
            } has joined the team`,
            timestamp: new Date(),
          },
        },
      },
      { upsert: true }
    );

    logger.info(`User ${user.id} accepted invitation to team ${team.name}`);

    return {
      success: true,
      data: { team, invitation },
      message: "Invitation accepted successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error accepting invitation:", error);
    throw error;
  }
};

/**
 * Decline team invitation - Elysia implementation
 */
export const declineInvitation = async ({ params, user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const invitation = await Invitation.findById(params.invitationId);
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    // Check if the invitation is for the current user
    if (invitation.invitedUser.toString() !== user.id) {
      throw new ForbiddenError("This invitation is not for you");
    }

    // Check if the invitation is still pending
    if (invitation.status !== "pending") {
      throw new ValidationError(
        `Invitation has already been ${invitation.status}`
      );
    }

    // Update invitation status
    invitation.status = "declined";
    invitation.respondedAt = new Date();
    await invitation.save();

    logger.info(
      `User ${user.id} declined invitation to team ${invitation.team}`
    );

    return {
      success: true,
      data: invitation,
      message: "Invitation declined successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error declining invitation:", error);
    throw error;
  }
};

/**
 * Get invitations for a specific team - Elysia implementation
 * Only team members can view invitations for their team
 */
export const getTeamInvitations = async ({ params, user }) => {
  try {
    if (!user || !user.id) {
      throw new ForbiddenError("Authentication required");
    }

    const { teamId } = params;

    // Validate team exists
    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if user is a member of the team
    const isMember = team.members.some(
      (m) => m.user.toString() === user.id && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError(
        "You must be a team member to view team invitations"
      );
    }

    // Get all invitations for the team
    const invitations = await Invitation.find({
      team: teamId,
    })
      .populate("invitedUser", "fullName email")
      .populate("invitedBy", "fullName email");

    return {
      success: true,
      data: invitations,
      message: "Team invitations retrieved successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error fetching team invitations:", error);
    throw error;
  }
};
