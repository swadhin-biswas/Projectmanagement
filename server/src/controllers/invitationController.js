import { ErrorCodes } from "../constants/errorCodes.js";
import Invitation from "../models/Invitation.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";

// Send an invitation to a user to join a team
export const sendInvitation = async (req, res) => {
  try {
    const { teamId, userId, message } = req.body;
    const invitedBy = req.user._id;

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if sender is team leader or supervisor
    if (
      !team.leader.equals(invitedBy) &&
      !team.supervisors.includes(invitedBy)
    ) {
      throw new AppError(
        "Only team leaders and supervisors can send invitations",
        403,
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
      team: teamId,
      invitedUser: userId,
      status: "pending",
    });

    if (existingInvitation) {
      throw new AppError(
        "An invitation has already been sent to this user",
        400,
        ErrorCodes.DUPLICATE_ENTRY
      );
    }

    // Check if user is already a member of the team
    if (team.members.includes(userId)) {
      throw new AppError(
        "User is already a member of this team",
        400,
        ErrorCodes.INVALID_INPUT
      );
    }

    // Create expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = new Invitation({
      team: teamId,
      invitedBy,
      invitedUser: userId,
      message: message || "",
      expiresAt,
    });

    await invitation.save();

    logger.info(
      `Invitation sent to user ${userId} for team ${teamId} by user ${invitedBy}`
    );

    return res.status(201).json({
      success: true,
      data: invitation,
      message: "Invitation sent successfully",
    });
  } catch (error) {
    logger.error(`Error sending invitation: ${error.message}`);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send invitation",
      errorCode: ErrorCodes.INTERNAL_ERROR,
    });
  }
};

// Get all invitations for a user
export const getUserInvitations = async (req, res) => {
  try {
    const userId = req.user._id;

    const invitations = await Invitation.find({ invitedUser: userId })
      .populate("team", "name description")
      .populate("invitedBy", "fullName email profilePicture")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: invitations,
      message: "Invitations retrieved successfully",
    });
  } catch (error) {
    logger.error(`Error getting user invitations: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: "Failed to get invitations",
      errorCode: ErrorCodes.INTERNAL_ERROR,
    });
  }
};

// Get all invitations sent by a user
export const getSentInvitations = async (req, res) => {
  try {
    const userId = req.user._id;

    const invitations = await Invitation.find({ invitedBy: userId })
      .populate("team", "name description")
      .populate("invitedUser", "fullName email profilePicture")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: invitations,
      message: "Sent invitations retrieved successfully",
    });
  } catch (error) {
    logger.error(`Error getting sent invitations: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: "Failed to get sent invitations",
      errorCode: ErrorCodes.INTERNAL_ERROR,
    });
  }
};

// Accept an invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      throw new AppError(
        "Invitation not found",
        404,
        ErrorCodes.RESOURCE_NOT_FOUND
      );
    }

    // Check if invitation is for the current user
    if (!invitation.invitedUser.equals(userId)) {
      throw new AppError(
        "You are not authorized to accept this invitation",
        403,
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Check if invitation is pending
    if (invitation.status !== "pending") {
      throw new AppError(
        `Invitation has already been ${invitation.status}`,
        400,
        ErrorCodes.INVALID_STATUS
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      invitation.status = "declined";
      await invitation.save();

      throw new AppError(
        "Invitation has expired",
        400,
        ErrorCodes.EXPIRED_RESOURCE
      );
    }

    // Update invitation status
    invitation.status = "accepted";
    invitation.respondedAt = new Date();
    await invitation.save();

    // Add user to team
    const team = await Team.findById(invitation.team);

    if (!team) {
      throw new AppError("Team not found", 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if user is already in the team
    if (team.members.includes(userId)) {
      return res.status(200).json({
        success: true,
        message: "You are already a member of this team",
      });
    }

    team.members.push(userId);
    await team.save();

    logger.info(`User ${userId} accepted invitation to team ${team._id}`);

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    logger.error(`Error accepting invitation: ${error.message}`);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to accept invitation",
      errorCode: ErrorCodes.INTERNAL_ERROR,
    });
  }
};

// Decline an invitation
export const declineInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      throw new AppError(
        "Invitation not found",
        404,
        ErrorCodes.RESOURCE_NOT_FOUND
      );
    }

    // Check if invitation is for the current user
    if (!invitation.invitedUser.equals(userId)) {
      throw new AppError(
        "You are not authorized to decline this invitation",
        403,
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Check if invitation is pending
    if (invitation.status !== "pending") {
      throw new AppError(
        `Invitation has already been ${invitation.status}`,
        400,
        ErrorCodes.INVALID_STATUS
      );
    }

    // Update invitation status
    invitation.status = "declined";
    invitation.respondedAt = new Date();
    await invitation.save();

    logger.info(
      `User ${userId} declined invitation to team ${invitation.team}`
    );

    return res.status(200).json({
      success: true,
      message: "Invitation declined successfully",
    });
  } catch (error) {
    logger.error(`Error declining invitation: ${error.message}`);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to decline invitation",
      errorCode: ErrorCodes.INTERNAL_ERROR,
    });
  }
};

// Cancel an invitation (for team leaders and supervisors)
export const cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user._id;

    const invitation = await Invitation.findById(invitationId).populate("team");

    if (!invitation) {
      throw new AppError(
        "Invitation not found",
        404,
        ErrorCodes.RESOURCE_NOT_FOUND
      );
    }

    // Check if user is authorized to cancel the invitation
    const team = invitation.team;

    if (
      !team.leader.equals(userId) &&
      !team.supervisors.includes(userId) &&
      !invitation.invitedBy.equals(userId)
    ) {
      throw new AppError(
        "You are not authorized to cancel this invitation",
        403,
        ErrorCodes.UNAUTHORIZED
      );
    }

    // Check if invitation is pending
    if (invitation.status !== "pending") {
      throw new AppError(
        `Invitation has already been ${invitation.status}`,
        400,
        ErrorCodes.INVALID_STATUS
      );
    }

    // Delete the invitation
    await Invitation.findByIdAndDelete(invitationId);

    logger.info(`Invitation ${invitationId} cancelled by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    logger.error(`Error cancelling invitation: ${error.message}`);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to cancel invitation",
      errorCode: ErrorCodes.INTERNAL_ERROR,
    });
  }
};
