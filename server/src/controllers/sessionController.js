import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Team } from "../models/Team.js";
import { Supervisor, User } from "../models/User.js";
import { ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Get all sessions with filtering and pagination
export const getAllSessions = async ({ query }) => {
  try {
    const { status, page = 1, limit = 10, sort = "-createdAt" } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;

    // Execute query with pagination
    const sessions = await Session.find(filter)
      .populate("createdBy", "fullName email")
      .populate("lastModifiedBy", "fullName email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Session.countDocuments(filter);

    return {
      success: true,
      data: sessions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to fetch sessions", { error });
    throw error;
  }
};

// Get session by ID
export const getSessionById = async ({ params }) => {
  try {
    const session = await Session.findById(params.id)
      .populate("createdBy", "fullName email")
      .populate("lastModifiedBy", "fullName email");

    if (!session) {
      throw new ValidationError("Session not found");
    }

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    logger.error("Failed to fetch session", { error, sessionId: params.id });
    throw error;
  }
};

// Create new session
export const createSession = async ({ body, user }) => {
  try {
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    // Calculate duration in months
    const durationInMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    // Validate duration
    if (durationInMonths < 4 || durationInMonths > 5) {
      throw new ValidationError("Session duration must be between 4 and 5 months");
    }

    // Check if there's already an active session
    const activeSession = await Session.findOne({ status: "active" });
    if (activeSession) {
      throw new ValidationError("Cannot create new session while another is active");
    }

    const session = new Session({
      ...body,
      startDate,
      endDate,
      status: "active",
      durationMonths: durationInMonths
    });

    await session.save();

    return {
      success: true,
      data: session,
      message: "Session created successfully"
    };
  } catch (error) {
    logger.error("Failed to create session", { error });
    throw error;
  }
};

// Update session
export const updateSession = async ({ params, body, user }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Don't allow changing dates for active or completed sessions
    if (
      (session.status === "active" || session.status === "completed") &&
      (body.startDate || body.endDate)
    ) {
      throw new ValidationError(
        "Cannot change dates for active or completed sessions"
      );
    }

    // Create a copy to check for changes
    const updatedSession = { ...session.toObject() };

    // Update fields if provided
    Object.keys(body).forEach((key) => {
      if (key !== "createdBy" && key !== "_id") {
        updatedSession[key] = body[key];
      }
    });

    let dateChanged = false;
    if (body.startDate) {
      updatedSession.startDate = new Date(body.startDate);
      dateChanged = true;
    }
    if (body.endDate) {
      updatedSession.endDate = new Date(body.endDate);
      dateChanged = true;
    }

    // Validate duration if dates were changed
    if (dateChanged) {
      const durationInMonths =
        (updatedSession.endDate - updatedSession.startDate) /
        (1000 * 60 * 60 * 24 * 30);

      if (durationInMonths < 4 || durationInMonths > 5) {
        throw new ValidationError(
          "Session duration must be between 4 and 5 months"
        );
      }

      // Check for overlapping sessions
      const overlappingSessions = await Session.find({
        _id: { $ne: session._id },
        $or: [
          {
            startDate: { $lte: updatedSession.endDate },
            endDate: { $gte: updatedSession.startDate },
            status: { $in: ["active", "upcoming"] },
          },
        ],
      });

      if (overlappingSessions.length > 0) {
        throw new ValidationError(
          "Updated session dates overlap with existing active or upcoming sessions"
        );
      }
    }

    if (body.status) {
      // Validate status transitions
      if (body.status === "active" && session.status === "completed") {
        throw new ValidationError("Cannot reactivate a completed session");
      }
      updatedSession.status = body.status;
    }

    if (body.deadlines) {
      // Validate each deadline is within session period
      const invalidDeadlines = body.deadlines.filter(
        (deadline) =>
          new Date(deadline.date) < updatedSession.startDate ||
          new Date(deadline.date) > updatedSession.endDate
      );

      if (invalidDeadlines.length > 0) {
        throw new ValidationError(
          "All deadlines must be within the session period"
        );
      }

      updatedSession.deadlines = body.deadlines;
    }

    // Update modifier
    updatedSession.lastModifiedBy = user.id;
    updatedSession.lastModifiedAt = Date.now();

    // Apply all updates to the session document
    Object.assign(session, updatedSession);

    // Save changes
    await session.save();

    logger.info("Session updated successfully", {
      sessionId: session._id,
      userId: user.id,
    });

    return {
      success: true,
      data: session,
      message: "Session updated successfully",
    };
  } catch (error) {
    logger.error("Failed to update session", { error, sessionId: params.id });
    throw error;
  }
};

// Delete session
export const deleteSession = async ({ params }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Check if session is active
    if (session.status === "active") {
      throw new ValidationError("Cannot delete an active session");
    }

    // Check if session has associated teams or projects
    const teamsCount = await Team.countDocuments({ session: session._id });
    const projectsCount = await Project.countDocuments({
      session: session._id,
    });

    if (teamsCount > 0 || projectsCount > 0) {
      throw new ValidationError(
        "Cannot delete session with associated teams or projects"
      );
    }

    await Session.findByIdAndDelete(params.id);

    logger.info("Session deleted successfully", { sessionId: params.id });

    return {
      success: true,
      message: "Session deleted successfully",
    };
  } catch (error) {
    logger.error("Failed to delete session", { error, sessionId: params.id });
    throw error;
  }
};

// Add deadline to session
export const addDeadline = async ({ params, body, user }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Validate deadline date is within session period
    const deadlineDate = new Date(body.date);
    if (deadlineDate < session.startDate || deadlineDate > session.endDate) {
      throw new ValidationError("Deadline must be within the session period");
    }

    // Validate required fields
    if (!body.name || !body.type) {
      throw new ValidationError("Deadline name and type are required");
    }

    // Add new deadline
    session.deadlines.push({
      name: body.name,
      date: deadlineDate,
      type: body.type,
      description: body.description || "",
      notifyBefore: body.notifyBefore || 7,
    });

    // Update modifier
    session.lastModifiedBy = user.id;

    // Save changes
    await session.save();

    logger.info("Deadline added to session", {
      sessionId: session._id,
      userId: user.id,
      deadline: body.name,
      date: deadlineDate,
    });

    return {
      success: true,
      data: session,
      message: "Deadline added successfully",
    };
  } catch (error) {
    logger.error("Failed to add deadline", { error, sessionId: params.id });
    throw error;
  }
};

// Update deadline in session
export const updateDeadline = async ({ params, body, user }) => {
  try {
    const session = await Session.findById(params.sessionId);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Find the deadline
    const deadlineIndex = session.deadlines.findIndex(
      (d) => d._id.toString() === params.deadlineId
    );

    if (deadlineIndex === -1) {
      throw new ValidationError("Deadline not found in session");
    }

    // Create updated deadline
    const updatedDeadline = { ...session.deadlines[deadlineIndex].toObject() };

    // Update fields if provided
    if (body.name) updatedDeadline.name = body.name;
    if (body.description) updatedDeadline.description = body.description;
    if (body.type) updatedDeadline.type = body.type;
    if (body.notifyBefore) updatedDeadline.notifyBefore = body.notifyBefore;

    if (body.date) {
      const newDate = new Date(body.date);

      // Validate date is within session period
      if (newDate < session.startDate || newDate > session.endDate) {
        throw new ValidationError("Deadline must be within the session period");
      }

      updatedDeadline.date = newDate;
    }

    // Update the deadline
    session.deadlines[deadlineIndex] = updatedDeadline;

    // Update modifier
    session.lastModifiedBy = user.id;

    // Save changes
    await session.save();

    logger.info("Deadline updated in session", {
      sessionId: session._id,
      deadlineId: params.deadlineId,
      userId: user.id,
    });

    return {
      success: true,
      data: session,
      message: "Deadline updated successfully",
    };
  } catch (error) {
    logger.error("Failed to update deadline", {
      error,
      sessionId: params.sessionId,
      deadlineId: params.deadlineId,
    });
    throw error;
  }
};

// Delete deadline from session
export const deleteDeadline = async ({ params, user }) => {
  try {
    const session = await Session.findById(params.sessionId);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Find the deadline
    const deadlineIndex = session.deadlines.findIndex(
      (d) => d._id.toString() === params.deadlineId
    );

    if (deadlineIndex === -1) {
      throw new ValidationError("Deadline not found in session");
    }

    // Remove the deadline
    session.deadlines.splice(deadlineIndex, 1);

    // Update modifier
    session.lastModifiedBy = user.id;

    // Save changes
    await session.save();

    logger.info("Deadline deleted from session", {
      sessionId: session._id,
      deadlineId: params.deadlineId,
      userId: user.id,
    });

    return {
      success: true,
      data: session,
      message: "Deadline deleted successfully",
    };
  } catch (error) {
    logger.error("Failed to delete deadline", {
      error,
      sessionId: params.sessionId,
      deadlineId: params.deadlineId,
    });
    throw error;
  }
};

// Get current active session
export const getCurrentSession = async () => {
  try {
    const now = new Date();

    const session = await Session.findOne({
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: "active",
    });

    if (!session) {
      return {
        success: false,
        message: "No active session found",
      };
    }

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    logger.error("Failed to fetch current session", { error });
    throw error;
  }
};

// Get session analytics
export const getSessionAnalytics = async ({ params }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Get counts for teams, projects, and students in this session
    const teamCount = await Team.countDocuments({ session: session._id });
    const projectCount = await Project.countDocuments({ session: session._id });

    // Get teams in this session
    const teams = await Team.find({ session: session._id });

    // Extract unique student IDs
    const studentIds = new Set();
    teams.forEach((team) => {
      team.members.forEach((member) => {
        studentIds.add(member.user.toString());
      });
    });

    const studentCount = studentIds.size;

    // Get all supervisors assigned to teams in this session
    const supervisorIds = new Set();
    teams.forEach((team) => {
      team.supervisors.forEach((supervisor) => {
        supervisorIds.add(supervisor.supervisor.toString());
      });
    });

    const supervisorCount = supervisorIds.size;

    // Get supervisor details
    const supervisors = await Supervisor.find({
      _id: { $in: Array.from(supervisorIds) },
    }).populate("user", "fullName email department");

    // Get project types distribution
    const projectTypes = await Project.aggregate([
      { $match: { session: session._id } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const projectTypeDistribution = {};
    projectTypes.forEach((type) => {
      projectTypeDistribution[type._id] = type.count;
    });

    // Get project status distribution
    const projectStatuses = await Project.aggregate([
      { $match: { session: session._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const projectStatusDistribution = {};
    projectStatuses.forEach((status) => {
      projectStatusDistribution[status._id] = status.count;
    });

    // Get submission counts
    const submissionStats = await Project.aggregate([
      { $match: { session: session._id } },
      { $project: { submissionsCount: { $size: "$submissions" } } },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: "$submissionsCount" },
          avgSubmissionsPerProject: { $avg: "$submissionsCount" },
        },
      },
    ]);

    const submissionCounts =
      submissionStats.length > 0
        ? {
            total: submissionStats[0].totalSubmissions,
            average: submissionStats[0].avgSubmissionsPerProject,
          }
        : { total: 0, average: 0 };

    // Get deadline completion stats
    const deadlines = session.deadlines.map((deadline) => {
      const deadlineObj = deadline.toObject ? deadline.toObject() : deadline;
      const isPast = new Date(deadline.dueDate) < new Date();

      return {
        ...deadlineObj,
        isPast,
        timeRemaining: isPast
          ? 0
          : Math.round(
              (new Date(deadline.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
            ),
      };
    });

    // Get team formation progress
    const teamFormationProgress = {
      totalTeams: teamCount,
      teamsWithSupervisors: teams.filter((t) => t.supervisors.length > 0)
        .length,
      fullTeams: teams.filter((t) => t.members.length >= t.maxMembers).length,
      teamSizeDistribution: {},
    };

    // Calculate team size distribution
    teams.forEach((team) => {
      const size = team.members.length;
      teamFormationProgress.teamSizeDistribution[size] =
        (teamFormationProgress.teamSizeDistribution[size] || 0) + 1;
    });

    return {
      success: true,
      data: {
        session: {
          _id: session._id,
          name: session.name,
          academicYear: session.academicYear,
          term: session.term,
          startDate: session.startDate,
          endDate: session.endDate,
          registrationStartDate: session.registrationStartDate,
          registrationEndDate: session.registrationEndDate,
          teamFormationStartDate: session.teamFormationStartDate,
          teamFormationEndDate: session.teamFormationEndDate,
          status: session.status,
          progress: session.progressPercentage,
          durationMonths: session.durationMonths,
          registrationStatus: session.registrationStatus,
          teamFormationStatus: session.teamFormationStatus,
        },
        analytics: {
          teamCount,
          projectCount,
          studentCount,
          supervisorCount,
          supervisors: supervisors.map((sup) => ({
            id: sup._id,
            name: sup.user.fullName,
            email: sup.user.email,
            department: sup.user.department,
            assignedTeams: teams.filter((t) =>
              t.supervisors.some(
                (s) => s.supervisor.toString() === sup._id.toString()
              )
            ).length,
          })),
          deadlines,
          projectTypeDistribution,
          projectStatusDistribution,
          submissionCounts,
          teamFormationProgress,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to fetch session analytics", {
      error,
      sessionId: params.id,
    });
    throw error;
  }
};

// Activate session
export const activateSession = async ({ params, user }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    if (session.status === "active") {
      throw new ValidationError("Session is already active");
    }

    if (session.status === "completed") {
      throw new ValidationError("Cannot activate a completed session");
    }

    // Check for existing active session
    const activeSession = await Session.findOne({ status: "active" });
    if (activeSession) {
      throw new ValidationError(
        "Another session is already active. Please complete or deactivate it first."
      );
    }

    // Validate session has at least one deadline
    if (!session.deadlines || session.deadlines.length === 0) {
      throw new ValidationError(
        "Session must have at least one deadline before activation"
      );
    }

    // Activate session
    session.status = "active";
    session.lastModifiedBy = user.id;

    await session.save();

    logger.info("Session activated", {
      sessionId: session._id,
      userId: user.id,
    });

    return {
      success: true,
      message: "Session activated successfully",
      data: session,
    };
  } catch (error) {
    logger.error("Failed to activate session", { error, sessionId: params.id });
    throw error;
  }
};

// Complete session
export const completeSession = async ({ params, user }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    if (session.status !== "active") {
      throw new ValidationError("Only active sessions can be completed");
    }

    // Complete session
    session.status = "completed";
    session.lastModifiedBy = user.id;

    await session.save();

    logger.info("Session completed", {
      sessionId: session._id,
      userId: user.id,
    });

    return {
      success: true,
      message: "Session completed successfully",
      data: session,
    };
  } catch (error) {
    logger.error("Failed to complete session", { error, sessionId: params.id });
    throw error;
  }
};

// Assign supervisor to a team
export const assignSupervisorToTeam = async ({ params, body, user }) => {
  try {
    const { teamId, supervisorId, role = "primary" } = body;

    // Validate input
    if (!teamId || !supervisorId) {
      throw new ValidationError("Team ID and Supervisor ID are required");
    }

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ValidationError("Team not found");
    }

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId);
    if (!supervisor) {
      throw new ValidationError("Supervisor not found");
    }

    // Check if supervisor is already assigned to this team
    const isAlreadyAssigned = team.supervisors.some(
      (s) => s.supervisor.toString() === supervisorId && s.status === "active"
    );

    if (isAlreadyAssigned) {
      throw new ValidationError("Supervisor is already assigned to this team");
    }

    // If assigning as primary, check if there's already a primary supervisor
    if (role === "primary") {
      const existingPrimary = team.supervisors.find(
        (s) => s.role === "primary" && s.status === "active"
      );

      if (existingPrimary) {
        // Change existing primary to co-supervisor
        existingPrimary.role = "co_supervisor";
      }
    }

    // Add supervisor to team
    team.addSupervisor(supervisorId, {
      assignedBy: user.id,
      role,
    });

    // Update supervisor's teams
    if (!supervisor.teams.includes(teamId)) {
      supervisor.teams.push(teamId);
      await supervisor.save();
    }

    // Save the team
    await team.save();

    logger.info("Supervisor assigned to team", {
      teamId,
      supervisorId,
      role,
      assignedBy: user.id,
    });

    return {
      success: true,
      message: "Supervisor assigned to team successfully",
      data: {
        teamId: team._id,
        teamName: team.name,
        supervisor: {
          id: supervisor._id,
          name: supervisor.name,
          role,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to assign supervisor to team", {
      error,
      teamId: body.teamId,
      supervisorId: body.supervisorId,
    });
    throw error;
  }
};

// Get available supervisors for assignment
export const getAvailableSupervisors = async ({ params }) => {
  try {
    // Get session ID from params
    const { sessionId } = params;

    // Validate session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Find all supervisors
    const supervisors = await User.find({
      role: "supervisor",
      isApproved: true,
      status: "active",
    }).select("_id fullName email department");

    // Get supervisor model data to check load
    const supervisorModels = await Supervisor.find({
      user: { $in: supervisors.map((s) => s._id) },
    }).populate("teams");

    // Get teams in this session
    const sessionTeams = await Team.find({ session: sessionId }).populate(
      "supervisors.supervisor"
    );

    // Calculate current load for each supervisor in this session
    const supervisorsWithLoad = supervisors.map((sup) => {
      const supervisorModel = supervisorModels.find(
        (s) => s.user.toString() === sup._id.toString()
      );

      // Count teams in this session only
      const teamsInThisSession = sessionTeams.filter((team) =>
        team.supervisors.some(
          (s) =>
            s.supervisor &&
            s.supervisor.user &&
            s.supervisor.user.toString() === sup._id.toString() &&
            s.status === "active"
        )
      );

      const currentLoad = teamsInThisSession.length;
      const maxLoad = session.teamsPerSupervisor || 5;

      return {
        _id: sup._id,
        fullName: sup.fullName,
        email: sup.email,
        department: sup.department,
        currentLoad,
        maxLoad,
        availableSlots: Math.max(0, maxLoad - currentLoad),
        isAvailable: currentLoad < maxLoad,
      };
    });

    return {
      success: true,
      data: supervisorsWithLoad,
    };
  } catch (error) {
    logger.error("Failed to get available supervisors", {
      error,
      sessionId: params.sessionId,
    });
    throw error;
  }
};

// Get dashboard data for admin
export const getAdminDashboard = async ({ user }) => {
  try {
    // Get counts
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalSupervisors = await User.countDocuments({ role: "supervisor" });
    const totalTeams = await Team.countDocuments();
    const totalProjects = await Project.countDocuments();

    // Get active session
    const activeSession = await Session.findOne({ status: "active" });

    // Get recent activity
    const recentTeams = await Team.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("members.user", "fullName")
      .select("name members createdAt");

    const recentProjects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name type status createdAt");

    // Get statistics for active session
    let sessionStats = null;
    if (activeSession) {
      const teamCount = await Team.countDocuments({
        session: activeSession._id,
      });
      const projectCount = await Project.countDocuments({
        session: activeSession._id,
      });
      const teamsWithSupervisors = await Team.countDocuments({
        session: activeSession._id,
        "supervisors.0": { $exists: true },
      });

      sessionStats = {
        sessionId: activeSession._id,
        sessionName: activeSession.name,
        teamCount,
        projectCount,
        teamsWithSupervisors,
        teamsWithoutSupervisors: teamCount - teamsWithSupervisors,
        upcomingDeadlines: activeSession.getUpcomingDeadlines(14).map((d) => ({
          id: d._id,
          title: d.title,
          dueDate: d.dueDate,
          type: d.type,
          daysRemaining: Math.ceil(
            (d.dueDate - new Date()) / (1000 * 60 * 60 * 24)
          ),
        })),
      };
    }

    // Get approval queue
    const pendingApprovals = await User.find({
      role: "supervisor",
      isApproved: false,
      status: "pending",
    }).select("_id fullName email department createdAt");

    return {
      success: true,
      data: {
        counts: {
          students: totalStudents,
          supervisors: totalSupervisors,
          teams: totalTeams,
          projects: totalProjects,
          pendingApprovals: pendingApprovals.length,
        },
        activeSession: activeSession
          ? {
              id: activeSession._id,
              name: activeSession.name,
              startDate: activeSession.startDate,
              endDate: activeSession.endDate,
              progress: activeSession.progressPercentage,
              daysRemaining: activeSession.daysUntilEnd(),
              status: activeSession.status,
            }
          : null,
        sessionStats,
        pendingApprovals,
        recentActivity: {
          teams: recentTeams,
          projects: recentProjects,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get admin dashboard data", { error });
    throw error;
  }
};
