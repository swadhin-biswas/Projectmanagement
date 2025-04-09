// server/src/controllers/supervisorController.js
import { Notification } from "../models/Notification.js";
import { Session } from "../models/Session.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { sendEmail } from "../services/emailService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
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

    // Update team progress
    const progress = await supervisor.updateTeamProgress(params.teamId, body);

    // Update team status in Team model if risk level has changed
    if (body.riskAssessment && body.riskAssessment.level) {
      const riskToStatusMap = {
        low: "on_track",
        medium: "at_risk",
        high: "at_risk",
        critical: "delayed",
      };

      await Team.findByIdAndUpdate(params.teamId, {
        progressStatus: riskToStatusMap[body.riskAssessment.level],
      });
    }

    return {
      success: true,
      message: "Team progress updated successfully",
      data: progress,
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
