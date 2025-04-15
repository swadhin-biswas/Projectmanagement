import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import { generateRandomId } from "../utils/helpers.js";
import logger from "../utils/logger.js";

// Create a new team
export const createTeam = async ({ body, user }) => {
  try {
    // Validate team name
    if (!body.name) {
      throw new ValidationError("Team name is required");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is already in a team for current session
    const currentSession = await Session.findOne({ status: "active" }).lean();
    if (!currentSession) {
      throw new ValidationError("No active session found");
    }

    // Check if student is already in an active team for this session
    const existingTeam = await Team.findOne({
      "members.user": student._id,
      session: currentSession._id,
      status: "active",
    }).lean();
    if (existingTeam) {
      throw new ValidationError(
        "You are already a member of an active team for this session"
      );
    }

    // Generate a unique team ID
    const teamId = generateRandomId(8);

    // Create the new team
    const newTeam = new Team({
      name: body.name,
      teamId,
      members: [
        {
          user: student._id,
          role: "leader",
          joinedAt: new Date(),
          status: "active",
        },
      ],
      session: currentSession._id,
      status: "active",
      maxMembers: 4,
      description: body.description || `Team ${body.name}`,
      createdAt: new Date(),
    });

    // Save the team
    await newTeam.save();

    // Update student record
    await Student.updateOne(
      { _id: student._id },
      { team: newTeam._id, isTeamLeader: true }
    );

    logger.info("Team created successfully", {
      teamId: newTeam._id,
      userId: user.id,
      studentId: student._id,
      teamName: body.name,
    });

    // Populate the team for response
    const populatedTeam = await Team.findById(newTeam._id)
      .populate({
        path: "members.user",
        select: "user fullName studentId profilePicture",
        populate: {
          path: "user",
          select: "email fullName",
        },
      })
      .lean();

    if (!populatedTeam) {
      throw new Error("Failed to retrieve created team");
    }

    return {
      success: true,
      data: populatedTeam,
      message: "Team created successfully",
    };
  } catch (error) {
    logger.error("Failed to create team", {
      error: error.message,
      userId: user.id,
    });
    throw error;
  }
};

// Get teams for a student
export const getMyTeams = async ({ user }) => {
  try {
    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find all teams for the student
    const teams = await Team.find({ "members.user": student._id })
      .populate({
        path: "members.user",
        select: "user fullName studentId profilePicture",
        populate: {
          path: "user",
          select: "email",
        },
      })
      .populate({
        path: "supervisors",
        select: "user fullName department profilePicture",
        populate: {
          path: "user",
          select: "email",
        },
      })
      .populate("session", "name startDate endDate status")
      .populate("project", "name type description status")
      .lean();

    return {
      success: true,
      data: teams || [],
      message: teams.length > 0 ? "Teams retrieved successfully" : "No teams found",
    };
  } catch (error) {
    logger.error("Failed to get teams", { error: error.message, userId: user.id });
    throw error;
  }
};

// Get team by ID
export const getTeamById = async ({ params, user }) => {
  try {
    const team = await Team.findById(params.id)
      .populate({
        path: "members.user",
        select: "user fullName studentId profilePicture",
        populate: {
          path: "user",
          select: "email",
        },
      })
      .populate({
        path: "supervisors",
        select: "user fullName department profilePicture",
        populate: {
          path: "user",
          select: "email",
        },
      })
      .populate("session", "name startDate endDate status")
      .populate("project", "name type description status")
      .lean();

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is a member
    const isMember = team.members.some(
      (member) => member.user._id.toString() === student._id.toString()
    );

    if (!isMember && user.role !== "admin" && user.role !== "super_admin") {
      throw new ForbiddenError("You are not authorized to view this team");
    }

    return {
      success: true,
      data: team,
      message: "Team retrieved successfully",
    };
  } catch (error) {
    logger.error("Failed to get team", {
      error: error.message,
      teamId: params.id,
      userId: user.id,
    });
    throw error;
  }
};

// Invite a student to join the team
export const inviteStudent = async ({ params, body, user }) => {
  try {
    const team = await Team.findById(params.id);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the inviter student profile
    const inviter = await Student.findOne({ user: user.id }).lean();
    if (!inviter) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if inviter is a member
    const isMember = team.members.some(
      (member) =>
        member.user.toString() === inviter._id.toString() &&
        member.status === "active"
    );
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Check team size
    if (
      team.members.filter((m) => m.status === "active").length >=
      team.maxMembers
    ) {
      throw new ValidationError(`Team cannot exceed ${team.maxMembers} members`);
    }

    // Find student to invite
    const invitee = await Student.findOne({ studentId: body.studentId }).lean();
    if (!invitee) {
      throw new NotFoundError("Student not found with this ID");
    }

    // Check if student is already in the team
    if (
      team.members.some((m) => m.user.toString() === invitee._id.toString())
    ) {
      throw new ValidationError("Student is already a member of this team");
    }

    // Check for pending invite
    if (
      team.invites.some(
        (i) =>
          i.student.toString() === invitee._id.toString() &&
          i.status === "pending"
      )
    ) {
      throw new ValidationError("Student already has a pending invitation");
    }

    // Add invitation
    team.invites.push({
      student: invitee._id,
      invitedBy: inviter._id,
      message: body.message,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Create notification for invitee
    await Student.updateOne(
      { _id: invitee._id },
      {
        $push: {
          notifications: {
            type: "team_invite",
            title: "New Team Invitation",
            message: `You have been invited to join team ${team.name}`,
            from: user.id,
            team: team._id,
            isRead: false,
          },
        },
      }
    );

    await team.save();

    return {
      success: true,
      data: null,
      message: "Invitation sent successfully",
    };
  } catch (error) {
    logger.error("Failed to send invitation", {
      error: error.message,
      teamId: params.id,
      userId: user.id,
    });
    throw error;
  }
};

// Respond to team invitation
export const respondToInvite = async ({ params, body, user }) => {
  try {
    // Validate response
    if (!body.response || !["accepted", "declined"].includes(body.response)) {
      throw new ValidationError(
        "Valid response is required (accepted or declined)"
      );
    }

    // Get the team
    const team = await Team.findById(params.id);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find the invitation
    const inviteIndex = team.invites.findIndex(
      (invite) =>
        invite.student.toString() === student._id.toString() &&
        invite.status === "pending"
    );
    if (inviteIndex === -1) {
      throw new NotFoundError("No pending invitation found");
    }

    // Check if invite has expired
    if (new Date() > team.invites[inviteIndex].expiresAt) {
      team.invites[inviteIndex].status = "expired";
      await team.save();
      throw new ValidationError("Invitation has expired");
    }

    // Update invitation status
    team.invites[inviteIndex].status = body.response;

    // If accepted, add student to team
    if (body.response === "accepted") {
      // Check if team is full
      if (team.isFull()) {
        team.invites[inviteIndex].status = "declined";
        await team.save();
        throw new ValidationError("Team is already full");
      }

      // Check if student is in another team
      const existingTeam = await Team.findOne({
        "members.user": student._id,
        session: team.session,
        status: "active",
        _id: { $ne: team._id },
      }).lean();
      if (existingTeam) {
        team.invites[inviteIndex].status = "declined";
        await team.save();
        throw new ValidationError(
          "You are already a member of another team for this session"
        );
      }

      // Add student to team
      team.members.push({
        user: student._id,
        role: "member",
        joinedAt: new Date(),
        status: "active",
      });

      // Update student record
      await Student.updateOne(
        { _id: student._id },
        { team: team._id, isTeamLeader: false }
      );
    }

    await team.save();

    logger.info(`Student ${body.response} team invitation`, {
      teamId: team._id,
      studentId: student._id,
      response: body.response,
    });

    return {
      success: true,
      data: null,
      message: `Invitation ${body.response} successfully`,
    };
  } catch (error) {
    logger.error("Failed to respond to invite", {
      error: error.message,
      teamId: params.id,
      userId: user.id,
    });
    throw error;
  }
};

// Send a message in team chat
export const sendTeamMessage = async ({ params, body, user }) => {
  try {
    // Validate message
    if (!body.content || body.content.trim() === "") {
      throw new ValidationError("Message content is required");
    }

    // Get the team
    const team = await Team.findById(params.id);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is a member
    const isMember = team.members.some(
      (member) => member.user.toString() === student._id.toString()
    );
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Create message
    const newMessage = {
      sender: student._id,
      senderType: "student",
      content: body.content.trim(),
      timestamp: new Date(),
      readBy: [{ user: student._id, readAt: new Date() }],
      attachments: body.attachments || [],
    };

    // Add message to team
    team.chatMessages.push(newMessage);
    await team.save();

    // Populate sender info
    const populatedTeam = await Team.findById(team._id)
      .populate({
        path: "chatMessages.sender",
        select: "user fullName studentId profilePicture",
      })
      .lean();

    const messageWithSender =
      populatedTeam.chatMessages[populatedTeam.chatMessages.length - 1];

    logger.info("Team message sent", {
      teamId: team._id,
      senderId: student._id,
    });

    return {
      success: true,
      data: messageWithSender,
      message: "Message sent successfully",
    };
  } catch (error) {
    logger.error("Failed to send team message", {
      error: error.message,
      teamId: params.id,
      userId: user.id,
    });
    throw error;
  }
};

// Get team chat messages
export const getTeamMessages = async ({ params, query, user }) => {
  try {
    // Get pagination parameters
    const { limit = 50, before } = query;

    // Get the team
    const team = await Team.findById(params.id);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is a member
    const isMember = team.members.some(
      (member) => member.user.toString() === student._id.toString()
    );
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Filter messages
    let messages = team.chatMessages;
    if (before) {
      const beforeDate = new Date(before);
      messages = messages.filter((msg) => msg.timestamp < beforeDate);
    }

    // Sort and limit messages
    messages = messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, parseInt(limit));

    // Populate sender info
    const populatedTeam = await Team.findById(team._id)
      .populate({
        path: "chatMessages.sender",
        select: "user fullName studentId profilePicture",
        populate: {
          path: "user",
          select: "email",
        },
      })
      .lean();

    // Filter populated messages
    const populatedMessages = populatedTeam.chatMessages
      .filter((msg) =>
        messages.some((m) => m._id.toString() === msg._id.toString())
      )
      .sort((a, b) => b.timestamp - a.timestamp);

    // Mark messages as read
    await Team.updateMany(
      {
        _id: team._id,
        "chatMessages._id": { $in: messages.map((m) => m._id) },
      },
      {
        $addToSet: { "chatMessages.$[elem].readBy": { user: student._id } },
      },
      { arrayFilters: [{ "elem._id": { $in: messages.map((m) => m._id) } }] }
    );

    return {
      success: true,
      data: populatedMessages,
      message:
        populatedMessages.length > 0
          ? "Messages retrieved successfully"
          : "No messages found",
    };
  } catch (error) {
    logger.error("Failed to get team messages", {
      error: error.message,
      teamId: params.id,
      userId: user.id,
    });
    throw error;
  }
};

// Leave team
export const leaveTeam = async ({ params, user }) => {
  try {
    // Get the team
    const team = await Team.findById(params.id);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is a member
    const memberIndex = team.members.findIndex(
      (member) => member.user.toString() === student._id.toString()
    );
    if (memberIndex === -1) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Check if student is the leader
    const isLeader = team.members[memberIndex].role === "leader";
    if (isLeader && team.members.length > 1) {
      // Promote another member to leader
      const newLeaderIndex = team.members.findIndex(
        (member) => member.user.toString() !== student._id.toString()
      );
      if (newLeaderIndex !== -1) {
        team.members[newLeaderIndex].role = "leader";
      }
    }

    // Remove student from team
    team.members.splice(memberIndex, 1);

    // Update student record
    await Student.updateOne(
      { _id: student._id },
      { team: null, isTeamLeader: false }
    );

    // If no members left, delete team
    if (team.members.length === 0) {
      await Team.findByIdAndDelete(team._id);
      logger.info("Team deleted (no members left)", {
        teamId: team._id,
        studentId: student._id,
      });
      return {
        success: true,
        data: null,
        message:
          "You have left the team. Team was deleted as there are no members left.",
      };
    }

    await team.save();

    logger.info("Student left team", {
      teamId: team._id,
      studentId: student._id,
      wasLeader: isLeader,
    });

    return {
      success: true,
      data: null,
      message: isLeader
        ? "You have left the team. Leadership has been transferred."
        : "You have left the team successfully.",
    };
  } catch (error) {
    logger.error("Failed to leave team", {
      error: error.message,
      teamId: params.id,
      userId: user.id,
    });
    throw error;
  }
};

// Get pending invitations
export const getPendingInvites = async ({ user }) => {
  try {
    // Get the student profile
    const student = await Student.findOne({ user: user.id }).lean();
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find teams with pending invites
    const teamsWithInvites = await Team.find({
      "invites.student": student._id,
      "invites.status": "pending",
    })
      .populate({
        path: "members.user",
        select: "fullName studentId profilePicture",
      })
      .populate("session", "name")
      .lean();

    // Format pending invites
    const pendingInvites = teamsWithInvites.map((team) => {
      const invite = team.invites.find(
        (inv) =>
          inv.student.toString() === student._id.toString() &&
          inv.status === "pending"
      );
      return {
        teamId: team._id,
        teamName: team.name,
        sessionName: team.session?.name || "Unknown",
        members: team.members,
        expiresAt: invite.expiresAt,
        invitedAt: new Date(invite._id.getTimestamp()),
      };
    });

    return {
      success: true,
      data: pendingInvites,
      message:
        pendingInvites.length > 0
          ? "Pending invites retrieved successfully"
          : "No pending invites found",
    };
  } catch (error) {
    logger.error("Failed to get pending invites", {
      error: error.message,
      userId: user.id,
    });
    throw error;
  }
};