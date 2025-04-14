// server/src/controllers/studentController.js
import { Message } from "../models/Message.js";
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Team } from "../models/Team.js";
import { TeamInvitation } from "../models/TeamInvitation.js";
import { User } from "../models/User.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import logger from "../utils/logger.js";

// Get student profile
export const getStudentProfile = async ({ user }) => {
  try {
    // Find the student record or create it if it doesn't exist
    let student = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email department profilePicture status"
    );

    // If student record doesn't exist but user is a student role, create the student record
    if (!student && user.role === "student") {
      // Get the user record
      const userRecord = await User.findById(user.id);
      if (!userRecord) {
        throw new NotFoundError("User not found");
      }

      // Create a new student record with generated ID
      const studentId = "STU" + Math.floor(100000 + Math.random() * 900000);
      student = new Student({
        user: user.id,
        studentId,
        profilePicture: userRecord.profilePicture,
        academicYear:
          new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      });

      await student.save();

      // Populate the user field after saving
      student = await Student.findOne({ user: user.id }).populate(
        "user",
        "fullName email department profilePicture status"
      );

      logger.info("Created missing student record for user", {
        userId: user.id,
        studentId: student.studentId,
      });
    }

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Get the user record if for some reason population didn't work
    if (!student.user) {
      const userRecord = await User.findById(user.id);
      if (userRecord) {
        student.user = userRecord;
      }
    }

    // Get current session
    const currentSession = await Session.findOne({ status: "active" });

    // Create properly structured response
    return {
      success: true,
      data: {
        student: {
          _id: student._id.toString(),
          fullName: student.user?.fullName || user.email?.split("@")[0] || "",
          email: student.user?.email || user.email || "",
          department: student.user?.department || "",
          studentId: student.studentId,
          profilePicture:
            student.profilePicture || student.user?.profilePicture || "",
          team: student.team ? student.team.toString() : null,
          isTeamLeader: student.isTeamLeader || false,
          academicYear: student.academicYear || "",
        },
        currentSession: currentSession
          ? {
              _id: currentSession._id.toString(),
              name: currentSession.name || "",
              startDate: currentSession.startDate
                ? currentSession.startDate.toISOString()
                : null,
              endDate: currentSession.endDate
                ? currentSession.endDate.toISOString()
                : null,
              deadlines: (currentSession.deadlines || []).map((d) => ({
                name: d.name,
                date: d.date.toISOString(),
                type: d.type,
              })),
            }
          : null,
      },
    };
  } catch (error) {
    logger.error("Failed to get student profile", { error, userId: user.id });
    throw error;
  }
};

// Update student profile
export const updateStudentProfile = async ({ body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Update allowed fields
    if (body.semester !== undefined) student.semester = body.semester;
    if (body.batch !== undefined) student.batch = body.batch;
    if (body.skills !== undefined) student.skills = body.skills;

    // Update user record if needed
    const updates = {};
    if (body.profilePicture !== undefined) {
      // Validate profile picture URL
      if (
        body.profilePicture &&
        !/^https?:\/\/.+\.(jpg|jpeg|png|gif)(\?.*)?$/i.test(body.profilePicture)
      ) {
        throw new ValidationError(
          "Profile picture must be a valid image URL (jpg, jpeg, png, or gif)"
        );
      }
      updates.profilePicture = body.profilePicture;
    }
    if (body.contactNumber !== undefined)
      updates.contactNumber = body.contactNumber;
    if (body.department !== undefined) updates.department = body.department;
    if (body.bio !== undefined) updates.bio = body.bio;

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(user.id, updates);
    }

    await student.save();

    logger.info("Student profile updated", {
      studentId: student._id,
      userId: user.id,
    });

    return {
      success: true,
      message: "Profile updated successfully",
      data: {
        ...student.toObject(),
        user: {
          ...updates,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to update student profile", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Helper function to generate unique team ID
const generateUniqueTeamId = async () => {
  const length = 6;
  let teamId;
  let isUnique = false;

  while (!isUnique) {
    // Generate random alphanumeric string
    teamId = Math.random()
      .toString(36)
      .substring(2, 2 + length)
      .toUpperCase();
    // Check if it exists
    const existingTeam = await Team.findOne({ teamId });
    if (!existingTeam) {
      isUnique = true;
    }
  }
  return teamId;
};

// Create team with enhanced validation
export const createTeam = async ({ body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Validate required fields
    if (!body.name) {
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

    // Get current session
    const currentSession = await Session.findOne({ status: "active" });
    if (!currentSession) {
      throw new ValidationError("No active session found");
    }

    // Validate team formation period
    if (!currentSession.isTeamFormationOpen()) {
      throw new ValidationError("Team formation period is not active");
    }

    // Create team with student as leader
    const team = await Team.create({
      name: body.name,
      teamId: await generateUniqueTeamId(),
      session: currentSession._id,
      creator: student._id,
      maxMembers: currentSession.maxTeamSize || 4,
      members: [
        {
          user: student._id,
          role: "leader",
          status: "active",
          joinedAt: new Date(),
        },
      ],
    });

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
          content: "Team created",
          timestamp: new Date(),
        },
      ],
    });

    logger.info("Team created successfully", {
      teamId: team._id,
      creator: student._id,
      sessionId: currentSession._id,
    });

    return {
      success: true,
      message: "Team created successfully",
      data: team,
    };
  } catch (error) {
    logger.error("Failed to create team", { error, userId: user.id });
    throw error;
  }
};

// Invite to team
export const inviteToTeam = async ({ body, user }) => {
  try {
    const inviter = await Student.findOne({ user: user.id });
    if (!inviter) {
      throw new NotFoundError("Student profile not found");
    }

    // Find inviter's team
    const team = await Team.findOne({
      "members.user": inviter._id,
      "members.status": "active",
    });

    if (!team) {
      throw new ValidationError("You are not a member of any team");
    }

    // Check if team is full
    if (
      team.members.filter((m) => m.status === "active").length >=
      team.maxMembers
    ) {
      throw new ValidationError("Team has reached maximum member limit");
    }

    // Find invited student by studentId
    const invitedStudent = await Student.findOne({ studentId: body.studentId });
    if (!invitedStudent) {
      throw new NotFoundError("Student not found with given ID");
    }

    // Check if student is already in a team
    const existingTeam = await Team.findOne({
      "members.user": invitedStudent._id,
      "members.status": "active",
    });

    if (existingTeam) {
      throw new ValidationError("Student is already a member of another team");
    }

    // Check for existing pending invitation
    const existingInvite = await TeamInvitation.findOne({
      team: team._id,
      invitee: invitedStudent._id,
      status: "pending",
    });

    if (existingInvite) {
      throw new ValidationError(
        "An invitation is already pending for this student"
      );
    }

    // Create invitation
    const invitation = await TeamInvitation.create({
      team: team._id,
      inviter: inviter._id,
      invitee: invitedStudent._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: "pending",
    });

    // Add notification for invited student
    const notification = {
      title: "Team Invitation",
      message: `You have been invited to join team ${team.name}`,
      type: "team_invitation",
      from: inviter.user,
      relatedTo: {
        model: "Team",
        id: team._id,
      },
      isRead: false,
      createdAt: new Date(),
    };

    if (!invitedStudent.notifications) {
      invitedStudent.notifications = [];
    }
    invitedStudent.notifications.push(notification);
    await invitedStudent.save();

    // Send email notification if enabled
    if (invitedStudent.notificationPreferences?.emailNotifications) {
      await sendEmail({
        to: invitedStudent.user.email,
        subject: "Team Invitation",
        template: "teamInvitation",
        context: {
          studentName: invitedStudent.user.fullName,
          teamName: team.name,
          inviterName: inviter.user.fullName,
          expiryDate: invitation.expiresAt,
        },
      });
    }

    return {
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    };
  } catch (error) {
    logger.error("Failed to send team invitation", {
      error,
      userId: user.id,
      studentId: body.studentId,
    });
    throw error;
  }
};

// Join team with invitation code
export const joinTeam = async ({ body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Check if student is already in a team
    if (student.team) {
      throw new ValidationError("You are already a member of a team");
    }

    // Find invitation
    const invitation = await TeamInvitation.findById(
      body.invitationId
    ).populate("team");

    if (!invitation || invitation.status !== "pending") {
      throw new NotFoundError("Invalid or expired invitation");
    }

    if (invitation.student.toString() !== student._id.toString()) {
      throw new ValidationError("This invitation was not sent to you");
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      throw new ValidationError("Invitation has expired");
    }

    const team = await Team.findById(invitation.team._id);

    // Check if team is at max capacity
    if (team.members.length >= team.maxMembers) {
      invitation.status = "cancelled";
      await invitation.save();
      throw new ValidationError("Team is already at maximum capacity");
    }

    // Add student to team
    team.members.push({
      user: student._id,
      role: "member",
      joinedAt: new Date(),
      status: "active",
    });

    await team.save();

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    // Update student with team reference
    student.team = team._id;
    await student.save();

    return {
      success: true,
      data: team,
      message: "Successfully joined the team",
    };
  } catch (error) {
    logger.error("Failed to join team", { error, userId: user.id });
    throw error;
  }
};

// Get student's teams
export const getStudentTeams = async ({ user, query }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Get session filter
    let sessionFilter = {};
    if (query.sessionId) {
      sessionFilter = { session: query.sessionId };
    } else {
      const activeSession = await Session.findOne({ status: "active" });
      if (activeSession) {
        sessionFilter = { session: activeSession._id };
      }
    }

    // Find all teams where student is a member
    const teams = await Team.find({
      "members.user": student._id,
      ...sessionFilter,
    })
      .populate({
        path: "members.user",
        populate: {
          path: "user",
          select: "fullName email profilePicture",
        },
      })
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email department",
        },
      })
      .populate("project", "name type description status")
      .populate("session", "name startDate endDate status");

    return {
      success: true,
      data: teams,
    };
  } catch (error) {
    logger.error("Failed to get student teams", { error, userId: user.id });
    throw error;
  }
};

// Respond to team invitation
export const respondToTeamInvite = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });

    if (!student) {
      return {
        success: false,
        error: "Student profile not found",
      };
    }

    // Find the team with pending invite
    const team = await Team.findById(params.teamId);

    if (!team) {
      return {
        success: false,
        error: "Team not found",
      };
    }

    // Find the invite
    const inviteIndex = team.invites.findIndex(
      (i) =>
        i.user.toString() === student._id.toString() && i.status === "pending"
    );

    if (inviteIndex === -1) {
      return {
        success: false,
        error: "No pending invitation found",
      };
    }

    // Update invite status
    team.invites[inviteIndex].status = body.response; // 'accepted' or 'declined'
    team.invites[inviteIndex].respondedAt = new Date();

    // If accepted, add student to team
    if (body.response === "accepted") {
      // Check if team is full
      if (
        team.members.filter((m) => m.status === "active").length >=
        team.maxMembers
      ) {
        return {
          success: false,
          error: `Cannot join team as it is already full (max ${team.maxMembers} members)`,
        };
      }

      // Check if student is already in another team
      const existingTeam = await Team.findOne({
        "members.user": student._id,
        "members.status": "active",
      });

      if (existingTeam) {
        return {
          success: false,
          error: "You are already a member of another team",
        };
      }

      // Add to team members
      team.members.push({
        user: student._id,
        role: "member",
        status: "active",
        joinedAt: new Date(),
      });

      // Update student's team reference
      student.team = team._id;
      await student.save();
    }

    await team.save();

    return {
      success: true,
      message:
        body.response === "accepted"
          ? "You have successfully joined the team"
          : "Invitation declined",
    };
  } catch (error) {
    console.error("Team Invite Response Error:", error);
    return {
      success: false,
      error: "Failed to process invitation response",
    };
  }
};

// Get team invitations
export const getTeamInvitations = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Get active session
    const activeSession = await Session.findOne({ status: "active" });
    if (!activeSession) {
      return {
        success: true,
        data: [],
      };
    }

    // Find all teams where student has a pending invite
    const teams = await Team.find({
      "invites.student": student._id,
      "invites.status": "pending",
      session: activeSession._id,
    })
      .populate({
        path: "invites.invitedBy",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      })
      .populate("session", "name startDate endDate status");

    // Extract and format invitations
    const invitations = [];
    teams.forEach((team) => {
      const invite = team.invites.find(
        (i) =>
          i.student.toString() === student._id.toString() &&
          i.status === "pending"
      );

      if (invite) {
        invitations.push({
          teamId: team._id,
          teamName: team.name,
          teamDescription: team.description,
          invitedBy: invite.invitedBy
            ? {
                id: invite.invitedBy._id,
                name: invite.invitedBy.user
                  ? invite.invitedBy.user.fullName
                  : "Unknown",
                profilePicture: invite.invitedBy.user
                  ? invite.invitedBy.user.profilePicture
                  : null,
              }
            : null,
          inviteMessage: invite.inviteMessage,
          createdAt: invite.createdAt || team.createdAt,
          expiresAt: invite.expiresAt,
          currentMemberCount: team.members.length,
          maxMembers: team.maxMembers,
          session: {
            id: team.session._id,
            name: team.session.name,
            status: team.session.status,
          },
        });
      }
    });

    return {
      success: true,
      data: invitations,
    };
  } catch (error) {
    logger.error("Failed to get team invitations", { error, userId: user.id });
    throw error;
  }
};

// Send chat message in team
export const sendTeamChatMessage = async ({ params, body, user }) => {
  try {
    const { teamId } = params;
    const { content, isAnnouncement } = body;

    // Basic validation
    if (!content) {
      throw new ValidationError("Message content is required");
    }

    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if user is a member of the team
    const isMember = team.isMember(student._id);
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Announcements can only be sent by team leader or co-leaders
    if (
      isAnnouncement &&
      !team.isLeader(student._id) &&
      !team
        .getCoLeaders()
        .some((l) => l.user.toString() === student._id.toString())
    ) {
      throw new ForbiddenError("Only team leaders can send announcements");
    }

    // Add chat message
    const message = await team.addMessage(student._id, content, {
      senderType: "student",
      isAnnouncement: !!isAnnouncement,
    });

    await team.save();

    // Create notifications for other team members
    const otherMembers = team.members
      .filter((m) => m.user.toString() !== student._id.toString())
      .map((m) => m.user);

    if (otherMembers.length > 0) {
      const notifications = [];
      for (const memberId of otherMembers) {
        const memberUser = await Student.findById(memberId).then((s) => s.user);
        notifications.push({
          user: memberUser,
          title: isAnnouncement ? "New Team Announcement" : "New Team Message",
          message: isAnnouncement
            ? `New announcement in team "${team.name}"`
            : `New message in team "${team.name}" chat`,
          type: "team_message",
          team: team._id,
          from: user.id,
        });
      }

      await Notification.insertMany(notifications);
    }

    logger.info("Team chat message sent", {
      teamId: team._id,
      studentId: student._id,
      isAnnouncement,
    });

    return {
      success: true,
      message: "Message sent successfully",
      data: message,
    };
  } catch (error) {
    logger.error("Failed to send team chat message", {
      error,
      teamId: params.teamId,
      userId: user.id,
    });
    throw error;
  }
};

// Get team chat messages
export const getTeamChatMessages = async ({ params, user, query }) => {
  try {
    const { teamId } = params;
    const { limit = 50, before } = query;

    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find team
    const team = await Team.findById(teamId).populate({
      path: "chatMessages.sender",
      populate: {
        path: "user",
        select: "fullName profilePicture",
      },
    });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if user is a member of the team
    const isMember = team.isMember(student._id);
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Filter and sort messages
    let messages = team.chatMessages || [];

    // If before timestamp provided, filter messages
    if (before) {
      const beforeDate = new Date(before);
      messages = messages.filter((m) => m.timestamp < beforeDate);
    }

    // Sort most recent first
    messages.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    messages = messages.slice(0, parseInt(limit));

    // Mark messages as read for this user
    team.markMessagesAsRead(student._id);
    await team.save();

    return {
      success: true,
      data: messages,
    };
  } catch (error) {
    logger.error("Failed to get team chat messages", {
      error,
      teamId: params.teamId,
      userId: user.id,
    });
    throw error;
  }
};

// Mark team chat messages as read
export const markTeamChatAsRead = async ({ params, user }) => {
  try {
    const { teamId } = params;

    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if user is a member of the team
    const isMember = team.members.some(
      (m) =>
        m.user.toString() === student._id.toString() && m.status === "active"
    );
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this team");
    }

    // Mark messages as read
    team.markMessagesAsRead(student._id);
    await team.save();

    return {
      success: true,
      message: "Messages marked as read",
    };
  } catch (error) {
    logger.error("Failed to mark team chat messages as read", {
      error,
      teamId: params.teamId,
      userId: user.id,
    });
    throw error;
  }
};

// Create project (team leader only)
export const createProject = async ({ body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });

    if (!student) {
      return {
        success: false,
        error: "Student profile not found",
      };
    }

    // Check if student is in a team and is a team leader
    const team = await Team.findOne({
      "members.user": student._id,
      "members.status": "active",
    });

    if (!team) {
      return {
        success: false,
        error: "You are not a member of any team",
      };
    }

    // Verify student is team leader
    const isLeader = team.members.some(
      (m) => m.user.toString() === student._id.toString() && m.role === "leader"
    );

    if (!isLeader) {
      return {
        success: false,
        error: "Only team leader can create projects",
      };
    }

    // Check if team already has a project
    const existingProject = await Project.findOne({ team: team._id });

    if (existingProject) {
      return {
        success: false,
        error: "Team already has a project",
      };
    }

    // Get current session
    const currentSession = await Session.findOne({ status: "active" });

    if (!currentSession) {
      return {
        success: false,
        error: "No active session found",
      };
    }

    // Create project
    const project = new Project({
      name: body.name,
      description: body.description,
      type: body.type, // 'research_based' or 'project_based'
      team: team._id,
      session: currentSession._id,
      creator: student._id,
      status: "in_progress",
    });

    // If supervisors are specified, add them
    if (body.supervisors && body.supervisors.length > 0) {
      body.supervisors.forEach((supId) => {
        project.supervisors.push({
          supervisor: supId,
          status: "pending",
          requestedAt: new Date(),
        });
      });
    }

    await project.save();

    // Update team with project reference
    team.projects.push(project._id);
    await team.save();

    return {
      success: true,
      message: "Project created successfully",
      data: {
        projectId: project._id,
        name: project.name,
        type: project.type,
      },
    };
  } catch (error) {
    console.error("Create Project Error:", error);
    return {
      success: false,
      error: "Failed to create project",
    };
  }
};

// Submit project report/file
export const submitProject = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });

    if (!student) {
      return {
        success: false,
        error: "Student profile not found",
      };
    }

    // Check if student is in the team associated with the project
    const project = await Project.findById(params.projectId).populate("team");

    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    // Verify student is a team member
    const isTeamMember = project.team.members.some(
      (m) =>
        m.user.toString() === student._id.toString() && m.status === "active"
    );

    if (!isTeamMember) {
      return {
        success: false,
        error: "You are not a member of the project team",
      };
    }

    // Check if current session is still active
    const currentSession = await Session.findById(project.session);

    if (!currentSession || currentSession.status !== "active") {
      return {
        success: false,
        error: "Submissions are only allowed during active sessions",
      };
    }

    // Check if submission is past deadline
    const submissionDeadline = currentSession.deadlines.find(
      (d) => d.type === "project_submission"
    );

    if (submissionDeadline && new Date() > new Date(submissionDeadline.date)) {
      return {
        success: false,
        error: "Submission deadline has passed",
      };
    }

    // Create submission
    project.submissions.push({
      submissionLink: body.submissionLink,
      submittedBy: student._id,
      submittedAt: new Date(),
      description: body.description || "",
      version: project.submissions.length + 1,
    });

    // Update project status
    project.status = "submitted";
    project.submittedAt = new Date();
    project.submissionLink = body.submissionLink;

    await project.save();

    return {
      success: true,
      message: "Project submitted successfully",
    };
  } catch (error) {
    console.error("Project Submission Error:", error);
    return {
      success: false,
      error: "Failed to submit project",
    };
  }
};

// Get project submissions
export const getProjectSubmissions = async ({ params, user }) => {
  try {
    const { projectId } = params;

    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find project
    const project = await Project.findById(projectId)
      .populate("team")
      .populate({
        path: "submissions.submittedBy",
        populate: {
          path: "user",
          select: "fullName profilePicture",
        },
      });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if student is part of the project team
    const team = project.team;
    if (!team) {
      throw new NotFoundError("Project team not found");
    }

    const isMember = team.members.some(
      (m) =>
        m.user.toString() === student._id.toString() && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this project team");
    }

    // Return submissions sorted by date (newest first)
    const submissions = project.submissions || [];
    submissions.sort((a, b) => b.submittedAt - a.submittedAt);

    return {
      success: true,
      data: submissions,
    };
  } catch (error) {
    logger.error("Failed to get project submissions", {
      error,
      projectId: params.projectId,
      userId: user.id,
    });
    throw error;
  }
};

// Get student dashboard data
export const getStudentDashboard = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate(
      "user",
      "fullName email department profilePicture status"
    );

    if (!student) {
      return {
        success: false,
        error: "Student profile not found",
      };
    }

    // Get current session
    const currentSession = await Session.findOne({ status: "active" });

    // Get teams that student is a member of
    const teams = await Team.find({
      "members.user": student._id,
      "members.status": "active",
    })
      .populate("supervisors", "user fullName email department specialization")
      .select("_id name teamId memberCount maxMembers supervisors projects");

    // Get all projects linked to student's teams
    const projects = await Project.find({
      team: { $in: teams.map((team) => team._id) },
    }).select("_id name type status");

    // Find pending team invites for this student
    const pendingInvites = await Team.aggregate([
      {
        $match: {
          "invites.user": student._id,
          "invites.status": "pending",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "creator",
          foreignField: "_id",
          as: "creatorInfo",
        },
      },
      {
        $project: {
          _id: 1,
          teamName: "$name",
          from: {
            _id: { $arrayElemAt: ["$creatorInfo._id", 0] },
            name: { $arrayElemAt: ["$creatorInfo.fullName", 0] },
          },
          expiresAt: {
            $filter: {
              input: "$invites",
              as: "invite",
              cond: { $eq: ["$$invite.user", student._id] },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          teamName: 1,
          from: 1,
          expiresAt: { $arrayElemAt: ["$expiresAt.expiresAt", 0] },
        },
      },
    ]);

    return {
      success: true,
      data: {
        student: {
          _id: student._id,
          studentId: student.studentId,
          fullName: student.user.fullName,
          email: student.user.email,
          profilePicture: student.user.profilePicture || null,
          department: student.user.department || null,
        },
        currentSession,
        teams: teams.map((team) => ({
          _id: team._id,
          name: team.name,
          teamId: team.teamId,
          memberCount: team.members?.length || 0,
          maxMembers: team.maxMembers || 4,
          hasSupervisor: team.supervisors?.length > 0,
          hasProject: team.projects?.length > 0,
        })),
        projects,
        pendingInvites,
      },
    };
  } catch (error) {
    console.error("Student Dashboard Error:", error);
    return {
      success: false,
      error: "Failed to fetch student dashboard data",
    };
  }
};

// Mark a notification as read
export const markNotificationAsRead = async ({ params, user }) => {
  try {
    const { notificationId } = params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    // Check if notification belongs to user
    if (notification.user.toString() !== user.id) {
      throw new ForbiddenError("Not authorized to access this notification");
    }

    // Mark as read
    notification.isRead = true;
    await notification.save();

    return {
      success: true,
      message: "Notification marked as read",
    };
  } catch (error) {
    logger.error("Failed to mark notification as read", {
      error,
      notificationId: params.notificationId,
      userId: user.id,
    });
    throw error;
  }
};

// Get student results
export const getStudentResults = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id })
      .populate("team")
      .populate({
        path: "marks",
        populate: {
          path: "project supervisor",
          select: "name user",
          populate: {
            path: "user",
            select: "fullName",
          },
        },
      });

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Only return results that have been published
    const publishedResults = student.marks.filter((mark) => {
      const project = mark.project;
      return project && project.resultsPublished;
    });

    return {
      success: true,
      data: publishedResults.map((mark) => ({
        id: mark._id,
        category: mark.category,
        score: mark.score,
        feedback: mark.feedback,
        date: mark.date,
        project: mark.project
          ? {
              id: mark.project._id,
              name: mark.project.name,
            }
          : null,
        supervisor: mark.supervisor
          ? {
              name: mark.supervisor.user.fullName,
            }
          : null,
      })),
    };
  } catch (error) {
    throw error;
  }
};

// Get a specific result detail
export const getResultDetail = async ({ params, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find the specific mark
    const mark = student.marks.id(params.resultId);
    if (!mark) {
      throw new NotFoundError("Result not found");
    }

    // Verify the result has been published
    const project = await Project.findById(mark.project);
    if (!project || !project.resultsPublished) {
      throw new ForbiddenError("This result has not been published yet");
    }

    return {
      success: true,
      data: {
        id: mark._id,
        category: mark.category,
        score: mark.score,
        feedback: mark.feedback,
        date: mark.date,
        project: project
          ? {
              id: project._id,
              name: project.name,
              type: project.type,
              submissionDate: project.lastSubmittedAt,
            }
          : null,
        supervisor: mark.supervisor
          ? {
              name: mark.supervisor.user.fullName,
              feedback: mark.feedback,
            }
          : null,
      },
    };
  } catch (error) {
    throw error;
  }
};

// Get student deadlines
export const getStudentDeadlines = async (userId) => {
  try {
    // Find the student record
    const student = await Student.findOne({ user: userId });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Get active session
    const activeSession = await Session.findOne({ status: "active" });
    if (!activeSession) {
      return {
        success: true,
        deadlines: [],
      };
    }

    // Get deadlines for student role
    const currentDate = new Date();
    const deadlines = activeSession.deadlines
      .filter(
        (deadline) =>
          deadline.forRoles.includes("student") ||
          deadline.forRoles.includes("all")
      )
      .map((deadline) => {
        const dueDate = new Date(deadline.dueDate);
        const isPassed = dueDate < currentDate;
        const daysRemaining = isPassed
          ? 0
          : Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));

        return {
          _id: deadline._id.toString(),
          name: deadline.title,
          date: dueDate.toISOString(),
          type: deadline.type,
          description: deadline.description || "",
          isPassed,
          daysRemaining,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      success: true,
      deadlines,
    };
  } catch (error) {
    logger.error("Failed to get student deadlines", { error, userId });
    throw error;
  }
};

// Submit a report
export const submitReport = async (userId, data) => {
  try {
    const { title, content, attachmentUrl, deadlineId } = data;

    // Find the student
    const student = await Student.findOne({ user: userId });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Get active session
    const activeSession = await Session.findOne({ status: "active" });
    if (!activeSession) {
      throw new NotFoundError("No active academic session found");
    }

    // Validate deadline exists
    const deadline = activeSession.deadlines.find(
      (d) => d._id.toString() === deadlineId
    );

    if (!deadline) {
      throw new NotFoundError("Deadline not found");
    }

    // Check if deadline has passed
    const currentDate = new Date();
    const dueDate = new Date(deadline.dueDate);
    const isPassed = dueDate < currentDate;

    // Check if late submissions are allowed
    if (isPassed && !deadline.submissionOptions?.allowLateSubmission) {
      throw new ValidationError(
        "Deadline has passed and late submissions are not allowed"
      );
    }

    // Create report submission
    const submission = {
      student: student._id,
      title,
      content,
      attachmentUrl: attachmentUrl || null,
      deadline: deadlineId,
      submissionDate: new Date(),
      isLate: isPassed,
      status: "submitted",
    };

    // Add submission to session
    activeSession.submissions.push(submission);
    await activeSession.save();

    logger.info("Report submitted successfully", {
      studentId: student._id,
      deadlineId,
      submissionId: submission._id,
    });

    return {
      success: true,
      message: "Report submitted successfully",
      data: {
        submissionId: submission._id.toString(),
        submissionDate: submission.submissionDate.toISOString(),
        isLate: submission.isLate,
      },
    };
  } catch (error) {
    logger.error("Failed to submit report", { error, userId });
    throw error;
  }
};

// Get student messages
export const getStudentMessages = async (userId) => {
  try {
    // Find the student
    const student = await Student.findOne({ user: userId });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Get messages for this student
    const messages = await Message.find({
      recipient: student._id,
      recipientType: "student",
    })
      .populate("sender", "fullName role")
      .sort({ createdAt: -1 });

    return messages.map((message) => ({
      _id: message._id.toString(),
      from: {
        _id: message.sender._id.toString(),
        fullName: message.sender.fullName,
        role: message.sender.role,
      },
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      isRead: message.isRead,
    }));
  } catch (error) {
    logger.error("Failed to get student messages", { error, userId });
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (userId, messageId) => {
  try {
    // Find the student
    const student = await Student.findOne({ user: userId });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find and update the message
    const message = await Message.findOne({
      _id: messageId,
      recipient: student._id,
      recipientType: "student",
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    return {
      success: true,
      message: "Message marked as read",
    };
  } catch (error) {
    logger.error("Failed to mark message as read", {
      error,
      userId,
      messageId,
    });
    throw error;
  }
};
