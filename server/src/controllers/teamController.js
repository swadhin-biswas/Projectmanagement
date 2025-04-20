import mongoose from "mongoose";
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
import logger from "../utils/logger.js";

/**
 * Generate a unique team ID
 */
const generateUniqueTeamId = async () => {
  const length = 6;
  let teamId;
  let isUnique = false;

  while (!isUnique) {
    teamId = Math.random()
      .toString(36)
      .substring(2, 2 + length)
      .toUpperCase();
    const existingTeam = await Team.findOne({ teamId });
    if (!existingTeam) {
      isUnique = true;
    }
  }
  return teamId;
};

/**
 * Create a new team
 * - Student who creates the team becomes the team leader
 * - Teams can have a maximum of 4 members
 * - Requires an active session and open team formation period
 */
export const createTeam = async ({ body, user }) => {
  try {
    console.log("Creating team", { userId: user.id });
    const student = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email profilePicture"
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
      logger.error("No active session found when creating team", {
        userId: user.id,
      });
      throw new ValidationError(
        "No active session is currently available for team creation. Please contact an administrator."
      );
    }

    // Validate team formation period
    if (!currentSession.isTeamFormationOpen()) {
      throw new ValidationError("Team formation period is not active");
    }

    // Generate unique team ID
    const teamId = await generateUniqueTeamId();

    // Create team with student as leader
    const team = new Team({
      name: body.name,
      teamId,
      session: currentSession._id,
      maxMembers: currentSession.maxTeamSize || 4,
      members: [
        {
          user: student._id,
          role: "leader",
          status: "active",
          joinedAt: new Date(),
        },
      ],
      description:
        body.description || `Team created by ${student.user.fullName}`,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await team.save();

    // Update student's team reference
    student.team = team._id;
    student.isTeamLeader = true;
    await student.save();

    // Create team chat
    await TeamChat.create({
      team: team._id,
      content: `Team "${body.name}" created by ${student.user.fullName}`,
      sender: student._id,
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

    const timestamp = new Date().toISOString();

    // Return the newly created team with exact structure needed by client
    return {
      success: true,
      message: "Team created successfully",
      data: {
        _id: team._id.toString(),
        name: team.name,
        description:
          body.description || `Team created by ${student.user.fullName}`,
        teamId: team.teamId,
        members: [
          {
            user: {
              _id: student._id.toString(),
              user: {
                email: student.user.email,
                fullName: student.user.fullName,
              },
              fullName: student.user.fullName,
              studentId: student.studentId,
              profilePicture: student.user.profilePicture || "",
            },
            role: "leader",
            status: "active",
            joinedAt: timestamp,
          },
        ],
        session: currentSession._id.toString(),
        status: "active",
        maxMembers: currentSession.maxTeamSize || 4,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      timestamp,
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
 * Respond to a team invitation
 * - Students can accept or decline team invitations
 * - Accepting an invitation will add the student to the team
 */
export const respondToInvitation = async ({ body, user }) => {
  try {
    if (!body.teamId) {
      throw new ValidationError("Team ID is required");
    }

    if (body.response !== "accept" && body.response !== "decline") {
      throw new ValidationError(
        "Response must be either 'accept' or 'decline'"
      );
    }

    const student = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email"
    );

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student already has a team
    if (student.team && body.response === "accept") {
      throw new ValidationError("You are already a member of a team");
    }

    // Find the team
    const team = await Team.findById(body.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if team is full
    if (
      body.response === "accept" &&
      team.members.filter((m) => m.status === "active").length >=
        team.maxMembers
    ) {
      throw new ValidationError("This team has reached its maximum capacity");
    }

    // Check if student has been invited to this team
    const invitationIndex = team.invites.findIndex(
      (invite) =>
        invite.student.toString() === student._id.toString() &&
        invite.status === "pending"
    );

    if (invitationIndex === -1) {
      throw new ValidationError(
        "You do not have a pending invitation to this team"
      );
    }

    // Update invitation status
    team.invites[invitationIndex].status =
      body.response === "accept" ? "accepted" : "declined";
    team.invites[invitationIndex].respondedAt = new Date();

    if (body.response === "accept") {
      // Add student to team members
      team.members.push({
        user: student._id,
        role: "member",
        status: "active",
        joinedAt: new Date(),
      });

      // Update student record
      student.team = team._id;
      await student.save();

      // Add notification in team chat
      await TeamChat.findOneAndUpdate(
        { team: team._id },
        {
          $push: {
            messages: {
              type: "system",
              content: `${student.user.fullName} has joined the team.`,
              timestamp: new Date(),
            },
          },
        }
      );

      // Track activity
      await trackTeamMemberActivity({
        teamId: team._id,
        memberId: student._id,
        action: "joined_team",
        details: "Accepted team invitation",
      });
    }

    await team.save();

    return {
      success: true,
      message:
        body.response === "accept"
          ? "You have successfully joined the team!"
          : "You have declined the team invitation.",
      data:
        body.response === "accept"
          ? {
              teamId: team._id,
              teamName: team.name,
            }
          : null,
    };
  } catch (error) {
    logger.error("Failed to respond to invitation", { error, userId: user.id });
    throw error;
  }
};

/**
 * Remove a member from a team
 * - Only team leaders can remove members
 * - Team leaders cannot remove themselves (they should use leaveTeam)
 */
export const removeMember = async ({ body, user }) => {
  try {
    if (!body.memberId) {
      throw new ValidationError("Member ID is required");
    }

    const leader = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email"
    );

    if (!leader) {
      throw new NotFoundError("Student profile not found");
    }

    // Find the team where the requester is a leader
    const team = await Team.findOne({
      "members.user": leader._id,
      "members.role": "leader",
      "members.status": "active",
    });

    if (!team) {
      throw new ForbiddenError("You must be a team leader to remove members");
    }

    // Find the member to remove
    const memberToRemove = await Student.findById(body.memberId).populate(
      "user",
      "fullName email"
    );

    if (!memberToRemove) {
      throw new NotFoundError("Member not found");
    }

    // Check if member is in the team
    const isMember = team.members.some(
      (m) =>
        m.user.toString() === memberToRemove._id.toString() &&
        m.status === "active pending"
    );

    if (!isMember) {
      throw new ValidationError(
        "This user is not an active member of your team"
      );
    }

    // Prevent removing oneself as a leader (use leaveTeam for that)
    if (memberToRemove._id.toString() === leader._id.toString()) {
      throw new ValidationError(
        "Team leaders cannot remove themselves. Use the leave team function instead."
      );
    }

    // Update member status in team
    const memberIndex = team.members.findIndex(
      (m) => m.user.toString() === memberToRemove._id.toString()
    );

    if (memberIndex !== -1) {
      team.members[memberIndex].status = "removed";
      await team.save();
    }

    // Update student record
    memberToRemove.team = undefined;
    await memberToRemove.save();

    // Add notification in team chat
    await TeamChat.findOneAndUpdate(
      { team: team._id },
      {
        $push: {
          messages: {
            type: "system",
            content: `${memberToRemove.user.fullName} has been removed from the team by ${leader.user.fullName}.`,
            timestamp: new Date(),
          },
        },
      }
    );

    // Add activity record
    await trackTeamMemberActivity({
      teamId: team._id,
      memberId: memberToRemove._id,
      action: "removed_from_team",
      details: `Removed by team leader (${leader.user.fullName})`,
    });

    return {
      success: true,
      message: `${memberToRemove.user.fullName} has been removed from the team.`,
    };
  } catch (error) {
    logger.error("Failed to remove team member", { error, userId: user.id });
    throw error;
  }
};

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

/**
 * Get the currently authenticated student's team
 * Returns the team the student is currently a part of
 */
export const getUserTeam = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id });

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find the team where the student is an active member
    const team = await Team.findOne({
      "members.user": student._id,
      "members.status": "active",
    }).populate({
      path: "members.user",
      select: "user",
      populate: { path: "user", select: "fullName email profilePicture" },
    });

    if (!team) {
      // Use more helpful empty response
      return {
        success: true,
        message: "Student is not part of any team",
        data: null,
      };
    }

    // Format the response
    return {
      success: true,
      data: {
        _id: team._id.toString(),
        name: team.name,
        teamId: team.teamId,
        members: team.members.map((member) => ({
          user: {
            _id: member.user._id.toString(),
            fullName: member.user.user?.fullName || "Unknown",
            email: member.user.user?.email || "",
            profilePicture: member.user.user?.profilePicture || "",
          },
          role: member.role,
          status: member.status,
          joinedAt: member.joinedAt,
        })),
        maxMembers: team.maxMembers,
        description: team.description || "",
        status: team.status,
      },
    };
  } catch (error) {
    logger.error("Failed to get user team", { error, userId: user.id });
    throw error;
  }
};

/**
 * Get a list of students available to join a team
 * These are students who are not part of any team
 */
export const getAvailableStudents = async ({ user }) => {
  try {
    const currentStudent = await Student.findOne({ user: user.id });

    if (!currentStudent) {
      throw new NotFoundError("Student profile not found");
    }

    // Find the active session
    const activeSession = await Session.findOne({ status: "active" });
    // Don't throw an error if no active session, just display available students without session filter

    // Find students who are not part of any team
    const query = {
      team: { $exists: false },
      _id: { $ne: currentStudent._id },
    };

    // Add session filter only if an active session exists
    if (activeSession) {
      query.session = activeSession._id;
    }

    const students = await Student.find(query).populate(
      "user",
      "fullName email department profilePicture"
    );

    // Format the response
    return {
      success: true,
      data: students.map((student) => ({
        _id: student._id.toString(),
        fullName: student.user?.fullName || "Unknown",
        email: student.user?.email || "",
        department: student.user?.department || "",
        studentId: student.studentId,
        profilePicture: student.user?.profilePicture || "",
      })),
    };
  } catch (error) {
    logger.error("Failed to get available students", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

/**
 * Leave a team
 * - Student will be removed from the team
 * - If the student is the team leader, the team will be disbanded unless another leader is assigned
 */
export const leaveTeam = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email"
    );

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find the team the student is part of
    const team = await Team.findOne({
      "members.user": student._id,
      "members.status": "active",
    });

    if (!team) {
      throw new ValidationError("You are not a member of any team");
    }

    // Check if student is the team leader
    const isLeader = team.members.some(
      (m) =>
        m.user.toString() === student._id.toString() &&
        m.role === "leader" &&
        m.status === "active"
    );

    if (isLeader) {
      // Count active members excluding leader
      const activeMembers = team.members.filter(
        (m) =>
          m.status === "active" && m.user.toString() !== student._id.toString()
      );

      // If there are other active members, assign another member as leader
      if (activeMembers.length > 0) {
        // Assign next member as leader
        const newLeaderId = activeMembers[0].user;

        // Update leader's role
        const leaderIndex = team.members.findIndex(
          (m) => m.user.toString() === student._id.toString()
        );
        team.members[leaderIndex].status = "inactive";
        team.members[leaderIndex].role = "member";

        // Find new leader's index and update role
        const newLeaderIndex = team.members.findIndex(
          (m) => m.user.toString() === newLeaderId.toString()
        );
        team.members[newLeaderIndex].role = "leader";

        // Update student record
        student.team = undefined;
        student.isTeamLeader = false;
        await student.save();

        // Add notification in team chat
        await TeamChat.findOneAndUpdate(
          { team: team._id },
          {
            $push: {
              messages: {
                type: "system",
                content: `${student.user.fullName} has left the team. A new leader has been assigned.`,
                timestamp: new Date(),
              },
            },
          }
        );

        await team.save();

        // Update new leader's student record
        const newLeaderStudent = await Student.findById(newLeaderId);
        if (newLeaderStudent) {
          newLeaderStudent.isTeamLeader = true;
          await newLeaderStudent.save();
        }

        // Add activity record
        await trackTeamMemberActivity({
          teamId: team._id,
          memberId: student._id,
          action: "left_team",
          details: "Team leader left and transferred leadership",
        });

        return {
          success: true,
          message: "You have left the team. A new leader has been assigned.",
        };
      } else {
        // If no other active members, disband the team
        team.status = "archived";
        await team.save();

        student.team = undefined;
        student.isTeamLeader = false;
        await student.save();

        // Add activity record
        await trackTeamMemberActivity({
          teamId: team._id,
          memberId: student._id,
          action: "disbanded_team",
          details: "Team was disbanded as the last member left",
        });

        return {
          success: true,
          message:
            "You have left the team. The team has been disbanded as you were the only member.",
        };
      }
    } else {
      // Not a leader, just leave the team
      // Update member status
      const memberIndex = team.members.findIndex(
        (m) => m.user.toString() === student._id.toString()
      );

      if (memberIndex !== -1) {
        team.members[memberIndex].status = "inactive";
        await team.save();
      }

      // Remove team reference from student
      student.team = undefined;
      await student.save();

      // Add notification in team chat
      await TeamChat.findOneAndUpdate(
        { team: team._id },
        {
          $push: {
            messages: {
              type: "system",
              content: `${student.user.fullName} has left the team.`,
              timestamp: new Date(),
            },
          },
        }
      );

      // Add activity record
      await trackTeamMemberActivity({
        teamId: team._id,
        memberId: student._id,
        action: "left_team",
        details: "Member left the team",
      });

      return {
        success: true,
        message: "You have successfully left the team.",
      };
    }
  } catch (error) {
    logger.error("Failed to leave team", { error, userId: user.id });
    throw error;
  }
};