// server/src/controllers/supervisorController.js
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { trackFeedbackActivity } from "../services/activityService.js";
import { sendEmail } from "../services/emailService.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import logger from "../utils/logger.js";

/**
 * Get all students assigned to a supervisor
 */
export const getAssignedStudents = async ({ user, query }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get session filter if provided
    const sessionFilter = query.sessionId ? { session: query.sessionId } : {};

    // Get teams for this supervisor with session filter
    const teams = await Team.find({
      _id: { $in: supervisor.teams },
      ...sessionFilter,
    })
      .populate({
        path: "members.user",
        select: "fullName email profilePicture department",
      })
      .populate("session", "name startDate endDate")
      .sort(query.sort ? JSON.parse(query.sort) : { "session.startDate": -1 });

    // Extract unique students from teams
    const studentsMap = new Map();

    teams.forEach((team) => {
      team.members.forEach((member) => {
        if (!studentsMap.has(member.user._id.toString())) {
          studentsMap.set(member.user._id.toString(), {
            _id: member.user._id,
            fullName: member.user.fullName,
            email: member.user.email,
            profilePicture: member.user.profilePicture,
            department: member.user.department,
            teams: [
              {
                _id: team._id,
                name: team.name,
                session: team.session,
              },
            ],
          });
        } else {
          // Add team to existing student
          const student = studentsMap.get(member.user._id.toString());
          student.teams.push({
            _id: team._id,
            name: team.name,
            session: team.session,
          });
        }
      });
    });

    // Convert to array and apply pagination if needed
    let students = Array.from(studentsMap.values());

    // Apply search filter if provided
    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      students = students.filter(
        (student) =>
          searchRegex.test(student.fullName) || searchRegex.test(student.email)
      );
    }

    // Apply pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedStudents = students.slice(startIndex, endIndex);
    const totalCount = students.length;

    return {
      success: true,
      data: {
        students: paginatedStudents,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get assigned students", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Get all teams assigned to a supervisor
 */
export const getAssignedTeams = async ({ user, query }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get teams for this supervisor
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Create filter
    const filter = { _id: { $in: supervisor.teams } };

    // Add session filter if provided
    if (query.sessionId) {
      filter.session = query.sessionId;
    }

    // Add status filter if provided
    if (query.status) {
      filter.status = query.status;
    }

    // Get teams
    const teams = await Team.find(filter)
      .populate({
        path: "members.user",
        select: "fullName email profilePicture",
      })
      .populate("project")
      .populate("session", "name startDate endDate status")
      .sort(query.sort ? JSON.parse(query.sort) : { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Team.countDocuments(filter);

    return {
      success: true,
      data: {
        teams,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get assigned teams", { error, userId: user._id });
    throw error;
  }
};

/**
 * Get detailed team information
 */
export const getTeamDetails = async ({ user, params }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Check if team is supervised by this supervisor
    if (!supervisor.teams.includes(params.teamId)) {
      throw new ValidationError("You are not supervising this team");
    }

    // Get team details
    const team = await Team.findById(params.teamId)
      .populate({
        path: "members.user",
        select: "fullName email profilePicture department",
      })
      .populate("project")
      .populate("session")
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email department",
        },
      });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Get progress tracking for this team
    const progressTracking = supervisor.progressTracking.find(
      (pt) => pt.team.toString() === params.teamId
    );

    // Get feedbacks for this team
    const feedbacks = supervisor.feedbacks.filter(
      (f) => f.team && f.team.toString() === params.teamId
    );

    // Get meetings for this team
    const meetings = supervisor.meetings.filter(
      (m) => m.team && m.team.toString() === params.teamId
    );

    return {
      success: true,
      data: {
        team,
        progressTracking,
        feedbacks,
        meetings,
      },
    };
  } catch (error) {
    logger.error("Failed to get team details", {
      error,
      userId: user._id,
      teamId: params.teamId,
    });
    throw error;
  }
};

/**
 * Update team progress
 */
export const updateTeamProgress = async ({ user, params, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Check if team is supervised by this supervisor
    if (!supervisor.teams.includes(params.teamId)) {
      throw new ValidationError("You are not supervising this team");
    }

    // Find existing progress tracking or create new one
    let progressTracking = supervisor.progressTracking.find(
      (pt) => pt.team.toString() === params.teamId
    );

    if (!progressTracking) {
      // Get team to verify session
      const team = await Team.findById(params.teamId);
      if (!team) {
        throw new NotFoundError("Team not found");
      }

      supervisor.progressTracking.push({
        team: params.teamId,
        session: team.session,
        lastChecked: new Date(),
        overallProgress: body.overallProgress || 0,
        milestones: body.milestones || [],
        riskAssessment: body.riskAssessment || {
          level: "low",
          reasons: [],
          mitigationPlan: "",
        },
        supervisorNotes: body.supervisorNotes || [],
      });

      progressTracking =
        supervisor.progressTracking[supervisor.progressTracking.length - 1];
    } else {
      // Update existing progress tracking
      progressTracking.lastChecked = new Date();

      if (body.overallProgress !== undefined) {
        progressTracking.overallProgress = body.overallProgress;
      }

      if (body.milestones) {
        // Update existing milestones or add new ones
        if (!progressTracking.milestones) {
          progressTracking.milestones = [];
        }

        body.milestones.forEach((newMilestone) => {
          const existingIndex = progressTracking.milestones.findIndex(
            (m) => m.name === newMilestone.name
          );

          if (existingIndex >= 0) {
            // Update existing milestone
            progressTracking.milestones[existingIndex] = {
              ...progressTracking.milestones[existingIndex],
              ...newMilestone,
              lastUpdated: new Date(),
            };
          } else {
            // Add new milestone
            progressTracking.milestones.push({
              ...newMilestone,
              lastUpdated: new Date(),
            });
          }
        });
      }

      if (body.riskAssessment) {
        progressTracking.riskAssessment = {
          ...progressTracking.riskAssessment,
          ...body.riskAssessment,
          lastAssessed: new Date(),
        };
      }

      if (body.supervisorNotes && body.supervisorNotes.length > 0) {
        // Add new notes
        body.supervisorNotes.forEach((note) => {
          progressTracking.supervisorNotes.push({
            note: note.note,
            date: new Date(),
            visibility: note.visibility || "private",
          });
        });
      }
    }

    await supervisor.save();

    return {
      success: true,
      message: "Team progress updated successfully",
      data: progressTracking,
    };
  } catch (error) {
    logger.error("Failed to update team progress", {
      error,
      userId: user._id,
      teamId: params.teamId,
    });
    throw error;
  }
};

/**
 * Record feedback for student
 */
export const recordFeedback = async ({ user, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Check if student is in one of the supervised teams
    const teams = await Team.find({ _id: { $in: supervisor.teams } });
    let isStudentSupervised = false;
    let studentTeam = null;

    for (const team of teams) {
      const studentMember = team.members.find(
        (m) => m.user.toString() === body.student
      );

      if (studentMember) {
        isStudentSupervised = true;
        studentTeam = team;
        break;
      }
    }

    if (!isStudentSupervised) {
      throw new ValidationError(
        "This student is not in any of your supervised teams"
      );
    }

    // Create feedback object
    const feedbackData = {
      student: body.student,
      team: studentTeam._id,
      project: body.project || studentTeam.project,
      milestone: body.milestone,
      marks: body.marks,
      comments: body.comments,
      status: body.status || "submitted",
      categories: body.categories || [],
    };

    // Record feedback
    const feedback = await supervisor.recordFeedback(feedbackData);

    // Send notification to student
    const notification = new Notification({
      user: body.student,
      title: "New Feedback Received",
      message: `You have received feedback for ${body.milestone}`,
      type: "feedback",
      metadata: {
        supervisorId: supervisor._id,
        feedback: feedback._id,
        milestone: body.milestone,
      },
    });

    await notification.save();

    return {
      success: true,
      message: "Feedback recorded successfully",
      data: feedback,
    };
  } catch (error) {
    logger.error("Failed to record feedback", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Schedule meeting with team
 */
export const scheduleMeeting = async ({ user, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Check if team is supervised by this supervisor
    if (body.team && !supervisor.teams.includes(body.team)) {
      throw new ValidationError("You are not supervising this team");
    }

    // Get team members for notifications
    let attendees = [];
    if (body.team) {
      const team = await Team.findById(body.team).populate("members.user");
      if (!team) {
        throw new NotFoundError("Team not found");
      }

      attendees = team.members.map((member) => ({
        student: member.user._id,
        attended: false,
      }));
    } else if (body.attendees && Array.isArray(body.attendees)) {
      attendees = body.attendees.map((attendeeId) => ({
        student: attendeeId,
        attended: false,
      }));
    }

    // Create meeting object
    const meetingData = {
      team: body.team,
      title: body.title,
      date: new Date(body.date),
      duration: body.duration || 60,
      attendees,
      notes: body.notes,
      agenda: body.agenda || [],
      meetingType: body.meetingType || "regular",
      status: "scheduled",
    };

    // Schedule meeting
    const meeting = await supervisor.scheduleMeeting(meetingData);

    // Send notifications to attendees
    const notifications = attendees.map((attendee) => ({
      user: attendee.student,
      title: "New Meeting Scheduled",
      message: `${user.fullName} has scheduled a meeting: ${
        body.title
      } on ${new Date(body.date).toLocaleString()}`,
      type: "meeting",
      metadata: {
        supervisorId: supervisor._id,
        meetingId: meeting._id,
        date: body.date,
      },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Send email notifications if enabled
    if (body.sendEmailNotifications) {
      const students = await User.find({
        _id: { $in: attendees.map((a) => a.student) },
      });

      for (const student of students) {
        if (student.email) {
          await sendEmail({
            to: student.email,
            subject: `Meeting Scheduled: ${body.title}`,
            template: "meetingInvitation",
            context: {
              studentName: student.fullName,
              supervisorName: user.fullName,
              meetingTitle: body.title,
              meetingDate: new Date(body.date).toLocaleString(),
              meetingDuration: body.duration || 60,
              meetingAgenda: body.agenda || [],
            },
          });
        }
      }
    }

    return {
      success: true,
      message: "Meeting scheduled successfully",
      data: meeting,
    };
  } catch (error) {
    logger.error("Failed to schedule meeting", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Send email to students
 */
export const sendEmailToStudents = async ({ user, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Validate recipients
    let recipients = [];

    if (body.team) {
      // Send to all team members
      if (!supervisor.teams.includes(body.team)) {
        throw new ValidationError("You are not supervising this team");
      }

      const team = await Team.findById(body.team);
      if (!team) {
        throw new NotFoundError("Team not found");
      }

      recipients = team.members.map((member) => member.user);
    } else if (body.recipients && Array.isArray(body.recipients)) {
      // Send to specific students
      recipients = body.recipients;

      // Verify all recipients are supervised by this supervisor
      const teams = await Team.find({ _id: { $in: supervisor.teams } });
      const supervisedStudentIds = new Set();

      teams.forEach((team) => {
        team.members.forEach((member) => {
          supervisedStudentIds.add(member.user.toString());
        });
      });

      const invalidRecipients = recipients.filter(
        (id) => !supervisedStudentIds.has(id.toString())
      );

      if (invalidRecipients.length > 0) {
        throw new ValidationError(
          "Some recipients are not in your supervised teams"
        );
      }
    } else {
      throw new ValidationError("Either team or recipients must be provided");
    }

    // Send email
    const emailData = {
      recipients,
      team: body.team,
      subject: body.subject,
      content: body.content,
      attachments: body.attachments || [],
      metadata: {
        category: body.category || "general",
        priority: body.priority || "normal",
        responseRequired: body.responseRequired || false,
        responseDeadline: body.responseDeadline,
      },
    };

    const communication = await supervisor.sendEmail(emailData);

    // Send actual emails via email service
    const students = await User.find({ _id: { $in: recipients } });

    for (const student of students) {
      if (student.email) {
        await sendEmail({
          to: student.email,
          subject: body.subject,
          template: "supervisorEmail",
          context: {
            studentName: student.fullName,
            supervisorName: user.fullName,
            emailContent: body.content,
            responseRequired: body.responseRequired || false,
            responseDeadline: body.responseDeadline
              ? new Date(body.responseDeadline).toLocaleString()
              : null,
          },
        });
      }
    }

    return {
      success: true,
      message: `Email sent to ${recipients.length} recipients`,
      data: communication,
    };
  } catch (error) {
    logger.error("Failed to send email to students", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Send notification to students
 */
export const sendNotificationToStudents = async ({ user, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Validate recipients
    let recipients = [];

    if (body.team) {
      // Send to all team members
      if (!supervisor.teams.includes(body.team)) {
        throw new ValidationError("You are not supervising this team");
      }

      const team = await Team.findById(body.team);
      if (!team) {
        throw new NotFoundError("Team not found");
      }

      recipients = team.members.map((member) => member.user);
    } else if (body.recipients && Array.isArray(body.recipients)) {
      // Send to specific students
      recipients = body.recipients;

      // Verify all recipients are supervised by this supervisor
      const teams = await Team.find({ _id: { $in: supervisor.teams } });
      const supervisedStudentIds = new Set();

      teams.forEach((team) => {
        team.members.forEach((member) => {
          supervisedStudentIds.add(member.user.toString());
        });
      });

      const invalidRecipients = recipients.filter(
        (id) => !supervisedStudentIds.has(id.toString())
      );

      if (invalidRecipients.length > 0) {
        throw new ValidationError(
          "Some recipients are not in your supervised teams"
        );
      }
    } else {
      throw new ValidationError("Either team or recipients must be provided");
    }

    // Send notification
    const notificationData = {
      recipients,
      team: body.team,
      subject: body.title,
      content: body.message,
      metadata: {
        category: body.type || "general",
        priority: body.priority || "normal",
      },
    };

    const communication = await supervisor.sendNotification(notificationData);

    return {
      success: true,
      message: `Notification sent to ${recipients.length} recipients`,
      data: communication,
    };
  } catch (error) {
    logger.error("Failed to send notification to students", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Get analytics data for supervisor
 */
export const getSupervisorAnalytics = async ({ user, query }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get session ID
    const sessionId = query.sessionId;
    let session = null;

    if (sessionId) {
      session = await Session.findById(sessionId);
      if (!session) {
        throw new NotFoundError("Session not found");
      }
    } else {
      // Get current active session
      session = await Session.findOne({ status: "active" });
      if (!session) {
        // Get most recent session
        session = await Session.findOne().sort({ endDate: -1 });
      }
    }

    if (!session) {
      throw new NotFoundError("No session found");
    }

    // Calculate analytics
    const analytics = await supervisor.calculateAnalytics(session._id);

    // Get teams in current session
    const teams = await Team.find({
      _id: { $in: supervisor.teams },
      session: session._id,
    })
      .populate("project")
      .select("name members project status");

    // Get upcoming meetings
    const now = new Date();
    const upcomingMeetings = supervisor.meetings
      .filter((meeting) => meeting.date > now && meeting.status === "scheduled")
      .sort((a, b) => a.date - b.date);

    // Get recent feedbacks
    const recentFeedbacks = supervisor.feedbacks
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, 5);

    return {
      success: true,
      data: {
        analytics,
        session,
        teams,
        upcomingMeetings: upcomingMeetings.slice(0, 5),
        recentFeedbacks,
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor analytics", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Get supervisor profile
 */
export const getSupervisorProfile = async ({ user }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id }).populate(
      "user",
      "-password"
    );

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    return {
      success: true,
      data: supervisor,
    };
  } catch (error) {
    logger.error("Failed to get supervisor profile", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Update supervisor profile
 */
export const updateSupervisorProfile = async ({ user, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Update fields
    const updatableFields = [
      "specialization",
      "designation",
      "department",
      "researchInterests",
      "biography",
      "contactDetails",
      "preferences",
      "availability",
      "expertise",
    ];

    updatableFields.forEach((field) => {
      if (body[field] !== undefined) {
        supervisor[field] = body[field];
      }
    });

    await supervisor.save();

    return {
      success: true,
      message: "Profile updated successfully",
      data: supervisor,
    };
  } catch (error) {
    logger.error("Failed to update supervisor profile", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Upload a document for a student or team
 */
export const uploadDocument = async ({ user, params, body, files }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Handle different document types
    switch (body.documentType) {
      case "feedback": {
        // Validate feedback exists
        const feedback = supervisor.feedbacks.id(body.feedbackId);
        if (!feedback) {
          throw new NotFoundError("Feedback not found");
        }

        // Add attachment to feedback
        feedback.attachments.push({
          filename: files.document.name,
          path: files.document.path,
          uploadedAt: new Date(),
        });

        break;
      }
      case "meeting": {
        // Validate meeting exists
        const meeting = supervisor.meetings.id(body.meetingId);
        if (!meeting) {
          throw new NotFoundError("Meeting not found");
        }

        // Add notes to meeting
        if (body.notes) {
          meeting.notes = body.notes;
        }

        break;
      }
      case "team_note": {
        // Validate team is supervised by this supervisor
        if (!supervisor.teams.includes(body.teamId)) {
          throw new ValidationError("You are not supervising this team");
        }

        // Find existing progress tracking or create new one
        let progressTracking = supervisor.progressTracking.find(
          (pt) => pt.team.toString() === body.teamId
        );

        if (!progressTracking) {
          supervisor.progressTracking.push({
            team: body.teamId,
            session: body.sessionId,
            lastChecked: new Date(),
            supervisorNotes: [],
          });

          progressTracking =
            supervisor.progressTracking[supervisor.progressTracking.length - 1];
        }

        // Add note
        progressTracking.supervisorNotes.push({
          note: body.note,
          date: new Date(),
          visibility: body.visibility || "private",
        });

        break;
      }
      default:
        throw new ValidationError("Invalid document type");
    }

    await supervisor.save();

    return {
      success: true,
      message: "Document uploaded successfully",
    };
  } catch (error) {
    logger.error("Failed to upload document", {
      error,
      userId: user._id,
    });
    throw error;
  }
};

/**
 * Get all projects assigned to supervisor
 */
export const getAssignedProjects = async ({ user, query }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user.id || user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Create base query
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    // Find projects where supervisor is listed in supervisors array
    const projectQuery = {
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": { $in: ["pending", "accepted"] },
    };

    // Add filters if provided
    if (query?.status) {
      projectQuery.status = query.status;
    }

    if (query?.type) {
      projectQuery.type = query.type;
    }

    // Get active session if not provided
    let sessionFilter = {};
    if (query?.sessionId) {
      sessionFilter = { session: query.sessionId };
    } else {
      const activeSession = await Session.findOne({ isActive: true });
      if (activeSession) {
        sessionFilter = { session: activeSession._id };
      }
    }

    const projects = await Project.find({
      ...projectQuery,
      ...sessionFilter,
    })
      .populate({
        path: "team",
        select: "name members",
        populate: {
          path: "members.user",
          select: "fullName email profilePicture",
        },
      })
      .populate("supervisors.supervisor")
      .populate("session", "name startDate endDate")
      .sort(query?.sort ? JSON.parse(query.sort) : { updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Apply text search if provided
    let filteredProjects = projects;
    if (query?.search) {
      const searchRegex = new RegExp(query.search, "i");
      filteredProjects = projects.filter(
        (project) =>
          searchRegex.test(project.name) ||
          searchRegex.test(project.description)
      );
    }

    // Get total count for pagination
    const totalCount = await Project.countDocuments({
      ...projectQuery,
      ...sessionFilter,
    });

    return {
      success: true,
      data: {
        projects: filteredProjects,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get assigned projects", {
      error,
      userId: user.id || user._id,
    });
    throw error;
  }
};

/**
 * Get project details
 */
export const getProjectDetails = async ({ user, params }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user.id || user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get project details
    const project = await Project.findById(params.projectId)
      .populate({
        path: "team",
        select: "name members",
        populate: {
          path: "members.user",
          select: "fullName email profilePicture",
        },
      })
      .populate({
        path: "supervisors.supervisor",
        select: "user expertise",
        populate: {
          path: "user",
          select: "fullName email department",
        },
      })
      .populate("submissions.submittedBy", "user")
      .populate({
        path: "submissions.submittedBy",
        populate: {
          path: "user",
          select: "fullName email profilePicture",
        },
      })
      .populate("session");

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if supervisor is assigned to this project
    const isSupervisingProject = project.supervisors.some(
      (s) => s.supervisor._id.toString() === supervisor._id.toString()
    );

    if (!isSupervisingProject) {
      throw new ForbiddenError("You are not authorized to view this project");
    }

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    logger.error("Failed to get project details", {
      error,
      projectId: params.projectId,
      userId: user.id || user._id,
    });
    throw error;
  }
};

/**
 * Get project submissions
 */
export const getProjectSubmissions = async ({ user, params }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user.id || user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get project
    const project = await Project.findById(params.projectId)
      .populate({
        path: "submissions.submittedBy",
        select: "user",
        populate: {
          path: "user",
          select: "fullName email profilePicture",
        },
      })
      .populate({
        path: "supervisors.supervisor",
      });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if supervisor is assigned to this project
    const isSupervisingProject = project.supervisors.some(
      (s) => s.supervisor._id.toString() === supervisor._id.toString()
    );

    if (!isSupervisingProject) {
      throw new ForbiddenError(
        "You are not authorized to view this project's submissions"
      );
    }

    // Format submissions for API response
    const formattedSubmissions = project.submissions.map((submission) => {
      return {
        _id: submission._id,
        title: submission.title,
        description: submission.description || "",
        fileUrl: submission.fileUrl || "",
        submissionType: submission.submissionType || "other",
        submittedBy: {
          _id: submission.submittedBy?._id || "",
          name: submission.submittedBy?.user?.fullName || "Unknown",
        },
        submittedAt: submission.submittedAt,
        feedback: submission.feedback
          ? {
              content: submission.feedback.content,
              givenBy:
                submission.feedback.givenBy?.toString() ===
                supervisor._id.toString()
                  ? "You"
                  : "Another Supervisor",
              givenAt: submission.feedback.givenAt,
            }
          : null,
        isLate: submission.isLate || false,
        attachments: submission.attachments || [],
      };
    });

    // Sort submissions by date (newest first)
    formattedSubmissions.sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    return {
      success: true,
      data: formattedSubmissions,
    };
  } catch (error) {
    logger.error("Failed to get project submissions", {
      error,
      projectId: params.projectId,
      userId: user.id || user._id,
    });
    throw error;
  }
};

/**
 * Review project submission
 */
export const reviewProjectSubmission = async ({ user, params, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user.id || user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get project
    const project = await Project.findById(params.projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if supervisor is assigned to this project
    const supervisorRecord = project.supervisors.find(
      (s) =>
        s.supervisor.toString() === supervisor._id.toString() &&
        s.status === "accepted"
    );

    if (!supervisorRecord) {
      throw new ForbiddenError(
        "You are not authorized to review this project's submissions or your supervision request has not been accepted"
      );
    }

    // Find the submission
    const submissionIndex = project.submissions.findIndex(
      (s) => s._id.toString() === params.submissionId
    );

    if (submissionIndex === -1) {
      throw new NotFoundError("Submission not found");
    }

    const submission = project.submissions[submissionIndex];

    // Create feedback
    const feedback = {
      content: body.feedback,
      givenBy: supervisor._id,
      givenAt: new Date(),
    };

    if (body.marks !== undefined) {
      feedback.marks = {
        score: body.marks,
        outOf: body.outOf || 100,
        givenBy: supervisor._id,
        givenAt: new Date(),
        comments: body.feedback,
      };
    }

    // Update submission with feedback
    project.submissions[submissionIndex].feedback = feedback;

    // Update project status if requested
    if (body.status) {
      // Only update the project status if this is a final report submission
      if (submission.submissionType === "final_report") {
        project.status = body.status;

        if (body.status === "approved") {
          project.approvedBy = supervisor._id;
          project.approvedAt = new Date();
          project.approvalComments = body.feedback;
        } else if (body.status === "rejected") {
          project.rejectedBy = supervisor._id;
          project.rejectedAt = new Date();
          project.rejectionReason = body.feedback;
        }
      }
    }

    await project.save();

    // Get student who submitted for notification
    const student = await Student.findById(submission.submittedBy);

    // Create notification for student
    if (student) {
      await Notification.create({
        recipient: student.user,
        type: "feedback",
        title: "Feedback on Submission",
        message: `Your supervisor has provided feedback on your submission "${submission.title}"`,
        relatedProject: project._id,
        relatedTeam: project.team,
        sender: user.id || user._id,
      });

      // Track feedback activity
      await trackFeedbackActivity({
        user: user.id || user._id,
        project: project._id,
        student: student._id,
        submission: submission._id,
        action: "provided_feedback",
      });

      // Send email notification if enabled in system settings
      try {
        const studentUser = await User.findById(student.user);
        if (studentUser?.email) {
          await sendEmail({
            to: studentUser.email,
            subject: `Feedback on Project: ${project.name}`,
            template: "feedbackNotification",
            context: {
              studentName: studentUser.fullName,
              supervisorName: user.fullName,
              projectName: project.name,
              submissionTitle: submission.title,
              feedbackSummary: body.feedback.substring(0, 100) + "...",
            },
          });
        }
      } catch (emailError) {
        logger.error("Failed to send feedback email notification", {
          error: emailError,
          studentId: student._id,
        });
        // Continue execution even if email fails
      }
    }

    // Return updated submission
    return {
      success: true,
      message: "Feedback submitted successfully",
      data: {
        _id: submission._id,
        title: submission.title,
        description: submission.description,
        fileUrl: submission.fileUrl,
        submissionType: submission.submissionType,
        submittedBy: {
          _id: student?._id || submission.submittedBy,
          name: student?.user?.fullName || "Student",
        },
        submittedAt: submission.submittedAt,
        feedback: {
          content: feedback.content,
          givenBy: "You",
          givenAt: feedback.givenAt,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to review project submission", {
      error,
      projectId: params.projectId,
      submissionId: params.submissionId,
      userId: user.id || user._id,
    });
    throw error;
  }
};

/**
 * Update project status
 */
export const updateProjectStatus = async ({ user, params, body }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user.id || user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get project
    const project = await Project.findById(params.projectId).populate("team");
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if supervisor is assigned to this project
    const supervisorRecord = project.supervisors.find(
      (s) => s.supervisor.toString() === supervisor._id.toString()
    );

    if (!supervisorRecord) {
      throw new ForbiddenError(
        "You are not authorized to update this project's status"
      );
    }

    // Check if supervisor has accepted the supervision request
    if (supervisorRecord.status !== "accepted") {
      throw new ValidationError(
        "You must accept the supervision request before updating project status"
      );
    }

    // Update project status
    project.status = body.status;

    // Add additional status-related data
    if (body.status === "approved") {
      project.approvedBy = supervisor._id;
      project.approvedAt = new Date();
      project.approvalComments = body.comments;
    } else if (body.status === "rejected") {
      project.rejectedBy = supervisor._id;
      project.rejectedAt = new Date();
      project.rejectionReason = body.comments;
    }

    await project.save();

    // Create notification for team members
    if (project.team) {
      const team = await Team.findById(project.team._id).populate({
        path: "members.user",
        select: "fullName email",
      });

      if (team) {
        // Create notifications for team members
        const notifications = team.members.map((member) => ({
          recipient: member.user?._id,
          type: "project_status",
          title: `Project Status Updated: ${body.status.toUpperCase()}`,
          message: `Your project "${
            project.name
          }" status has been updated to ${body.status.replace("_", " ")}`,
          relatedProject: project._id,
          relatedTeam: team._id,
          sender: user.id || user._id,
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        // Send emails to team members
        for (const member of team.members) {
          if (member.user?.email) {
            try {
              await sendEmail({
                to: member.user.email,
                subject: `Project Status Updated: ${project.name}`,
                template: "projectStatusUpdate",
                context: {
                  studentName: member.user.fullName,
                  supervisorName: user.fullName,
                  projectName: project.name,
                  newStatus: body.status.replace("_", " "),
                  comments: body.comments || "No additional comments provided.",
                },
              });
            } catch (emailError) {
              logger.error("Failed to send project status email notification", {
                error: emailError,
                userId: member.user._id,
              });
              // Continue execution even if email fails
            }
          }
        }
      }
    }

    return {
      success: true,
      message: `Project status updated to ${body.status}`,
      data: project,
    };
  } catch (error) {
    logger.error("Failed to update project status", {
      error,
      projectId: params.projectId,
      userId: user.id || user._id,
    });
    throw error;
  }
};

/**
 * Get all meetings for a supervisor
 */
export const getSupervisorMeetings = async ({ user, query }) => {
  try {
    // Find supervisor profile
    const supervisor = await Supervisor.findOne({ user: user._id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    let meetings = supervisor.meetings || [];

    // Apply filters if provided
    if (query.teamId) {
      meetings = meetings.filter(
        (meeting) => meeting.team && meeting.team.toString() === query.teamId
      );
    }

    if (query.status) {
      meetings = meetings.filter((meeting) => meeting.status === query.status);
    }

    if (query.dateFrom) {
      const fromDate = new Date(query.dateFrom);
      meetings = meetings.filter((meeting) => meeting.date >= fromDate);
    }

    if (query.dateTo) {
      const toDate = new Date(query.dateTo);
      meetings = meetings.filter((meeting) => meeting.date <= toDate);
    }

    // Apply sorting
    if (query.sort) {
      const sortField = query.sort.startsWith("-")
        ? query.sort.substring(1)
        : query.sort;
      const sortDirection = query.sort.startsWith("-") ? -1 : 1;

      meetings.sort((a, b) => {
        if (sortField === "date") {
          return sortDirection * (a.date - b.date);
        }
        return 0; // Default case
      });
    } else {
      // Default sort by date (most recent first)
      meetings.sort((a, b) => b.date - a.date);
    }

    // Apply pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedMeetings = meetings.slice(startIndex, endIndex);
    const totalCount = meetings.length;

    return {
      success: true,
      data: {
        meetings: paginatedMeetings,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor meetings", {
      error,
      userId: user._id,
    });
    throw error;
  }
};
