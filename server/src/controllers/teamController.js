import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { trackTeamMemberActivity } from "../services/activityService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Create team with enhanced validation
export const createTeam = async ({ body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is already in a team
    if (student.team) {
      throw new ValidationError("You are already a member of a team");
    }

    // Get active session
    const session = await Session.findOne({ status: "active" });
    if (!session) {
      throw new ValidationError("No active session found");
    }

    // Check team formation deadline
    if (!session.isTeamFormationOpen()) {
      throw new ValidationError("Team formation period is not active");
    }

    // Create team
    const team = new Team({
      name: body.name,
      description: body.description || "",
      session: session._id,
      maxMembers: 4,
      members: [{
        user: student._id,
        role: "leader",
        status: "active",
        joinedAt: new Date()
      }]
    });

    // Set creator as student
    student.team = team._id;
    await student.save();
    await team.save();

    return {
      success: true,
      message: "Team created successfully",
      data: team
    };
  } catch (error) {
    logger.error("Failed to create team", { error, userId: user.id });
    throw error;
  }
};

// Invite student to team with enhanced validation
export const inviteToTeam = async ({ params, body, user }) => {
  try {
    const inviter = await Student.findOne({ user: user.id });
    if (!inviter) {
      throw new NotFoundError("Student profile not found");
    }

    // Get inviter's team
    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Verify inviter is in the team
    const isMember = team.members.some(
      m => m.user.toString() === inviter._id.toString() && m.status === "active"
    );
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Check team size
    if (team.members.filter(m => m.status === "active").length >= 4) {
      throw new ValidationError("Team has reached maximum size of 4 members");
    }

    // Find invited student by student ID
    const invitedStudent = await Student.findOne({
      studentId: body.studentId
    }).populate("user", "fullName email");

    if (!invitedStudent) {
      throw new NotFoundError("Student not found with given ID");
    }

    // Check if student is already in a team
    if (invitedStudent.team) {
      throw new ValidationError("Student is already in a team");
    }

    // Check for existing invitation
    const existingInvite = await TeamInvitation.findOne({
      team: team._id,
      invitedStudent: invitedStudent._id,
      status: "pending"
    });

    if (existingInvite) {
      throw new ValidationError("Student already has a pending invitation");
    }

    // Create invitation
    const invitation = new TeamInvitation({
      team: team._id,
      from: inviter._id,
      invitedStudent: invitedStudent._id,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await invitation.save();

    // Add notification for invited student
    if (!invitedStudent.notifications) {
      invitedStudent.notifications = [];
    }

    invitedStudent.notifications.push({
      type: "team_invitation",
      message: `You have been invited to join team ${team.name}`,
      from: inviter._id,
      details: {
        teamId: team._id,
        teamName: team.name,
        invitationId: invitation._id
      },
      isRead: false,
      createdAt: new Date()
    });

    await invitedStudent.save();

    return {
      success: true,
      message: "Invitation sent successfully",
      data: invitation
    };
  } catch (error) {
    logger.error("Failed to invite to team", {
      error,
      userId: user.id,
      teamId: params.teamId
    });
    throw error;
  }
};

// Respond to team invitation
export const respondToInvitation = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const invitation = await TeamInvitation.findById(params.invitationId);
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.invitedStudent.toString() !== student._id.toString()) {
      throw new ForbiddenError("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new ValidationError("Invitation is no longer pending");
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    if (body.response === "accepted") {
      // Check team size again
      if (team.members.filter(m => m.status === "active").length >= 4) {
        throw new ValidationError("Team has reached maximum size");
      }

      // Add student to team
      team.members.push({
        user: student._id,
        role: "member",
        status: "active",
        joinedAt: new Date()
      });

      student.team = team._id;
      invitation.status = "accepted";

      // Add to team activity log
      team.activityLog.push({
        type: "member_joined",
        by: student._id,
        message: `${student.user.fullName} joined the team`,
        timestamp: new Date()
      });

      await team.save();
      await student.save();
    } else {
      invitation.status = "declined";

      // Add decline notification to team
      const declineNotification = {
        type: "invitation_declined",
        message: `${student.user.fullName} declined to join the team`,
        createdAt: new Date()
      };

      if (!team.notifications) {
        team.notifications = [];
      }
      team.notifications.push(declineNotification);
      await team.save();
    }

    await invitation.save();

    return {
      success: true,
      message: `Invitation ${body.response} successfully`,
      data: { invitation, team: body.response === "accepted" ? team : null }
    };
  } catch (error) {
    logger.error("Failed to respond to invitation", {
      error,
      userId: user.id,
      invitationId: params.invitationId
    });
    throw error;
  }
};

export const handleInviteResponse = async ({ params, body, user }) => {
  try {
    // Validate response
    if (!body.response || !["accepted", "declined"].includes(body.response)) {
      throw new ValidationError("Valid response is required (accepted or declined)");
    }

    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Find the invitation
    const inviteIndex = team.invites.findIndex(
      invite => invite.student.toString() === student._id.toString() &&
      invite.status === "pending"
    );

    if (inviteIndex === -1) {
      throw new ValidationError("No pending invitation found");
    }

    // Check if invite has expired
    if (new Date() > team.invites[inviteIndex].expiresAt) {
      team.invites[inviteIndex].status = "expired";
      await team.save();
      throw new ValidationError("Invitation has expired");
    }

    // If accepting, check team capacity
    if (body.response === "accepted") {
      // Verify team isn't full
      if (team.members.length >= team.maxMembers) {
        throw new ValidationError("Team is already at maximum capacity");
      }

      // Check if student is already in another team
      const existingTeam = await Team.findOne({
        "members.user": student._id,
        session: team.session,
        status: "active",
        _id: { $ne: team._id }
      });

      if (existingTeam) {
        team.invites[inviteIndex].status = "declined";
        await team.save();
        throw new ValidationError("You are already a member of another team for this session");
      }

      // Add member to team
      team.members.push({
        user: student._id,
        role: "member",
        joinedAt: new Date(),
        status: "active"
      });

      // Update student's team reference
      student.team = team._id;
      await student.save();

      // Track activity
      await trackTeamMemberActivity(team._id, user.id, 'join', student._id);
    }

    // Update invitation status
    team.invites[inviteIndex].status = body.response === "accepted" ? "accepted" : "declined";
    team.invites[inviteIndex].respondedAt = new Date();

    await team.save();

    return {
      success: true,
      message: body.response === "accepted" ? "Successfully joined team" : "Invitation declined",
      data: body.response === "accepted" ? {
        team: {
          id: team._id,
          name: team.name
        }
      } : null
    };
  } catch (error) {
    logger.error("Failed to process invitation response", error);
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
      m => m.user.toString() === memberToRemove._id.toString()
    );

    if (memberIndex === -1) {
      throw new ValidationError("User is not a member of this team");
    }

    // Remove the member
    team.members.splice(memberIndex, 1);

    // If member was leader, assign new leader if there are other members
    if (team.members.length > 0 && team.members[memberIndex].role === 'leader') {
      team.members[0].role = 'leader';
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
      data: team
    };
  } catch (error) {
    logger.error("Failed to remove team member", error);
    throw error;
  }
};
