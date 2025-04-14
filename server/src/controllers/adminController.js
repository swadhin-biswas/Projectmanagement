// server/src/controllers/adminController.js
import { Meeting } from "../models/Meeting.js";
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { SessionTimeline } from "../models/SessionTimeline.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { ApiError, NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Get all users
export const getUsers = async () => {
  try {
    const users = await User.find({}).select("-password");
    return users;
  } catch (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

/**
 * Get all supervisors with optional filtering and pagination
 * @param {Object} context - Request context
 * @returns {Promise<Object>} List of supervisors
 */
export const getSupervisors = async (context) => {
  try {
    const { query } = context;
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { role: "supervisor" };

    // Add status filter if provided
    if (query?.status) {
      filter.status = query.status;
    }

    // Add search filter if provided
    if (query?.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
        { department: { $regex: query.search, $options: "i" } },
      ];
    }

    // Count total documents
    const totalSupervisors = await User.countDocuments(filter);

    // Get supervisors with pagination
    const users = await User.find(filter)
      .select("-password")
      .sort(query?.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get supervisor profiles
    const supervisorIds = users.map((user) => user._id);
    const supervisorProfiles = await Supervisor.find({
      user: { $in: supervisorIds },
    })
      .populate("teams")
      .populate("projects")
      .lean();

    // Combine user data with supervisor profiles
    const supervisors = users.map((user) => {
      const profile = supervisorProfiles.find(
        (p) => p.user.toString() === user._id.toString()
      );
      return {
        ...user.toObject(),
        profile: profile || null,
        teamCount: profile?.teams?.length || 0,
        projectCount: profile?.projects?.length || 0,
      };
    });

    return {
      success: true,
      data: {
        supervisors,
        pagination: {
          total: totalSupervisors,
          page,
          limit,
          pages: Math.ceil(totalSupervisors / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisors", { error });
    throw error;
  }
};

/**
 * Get all students with optional filtering and pagination
 * @param {Object} context - Request context
 * @returns {Promise<Object>} List of students
 */
export const getStudents = async (context) => {
  try {
    const { query } = context;
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter for User collection
    const userFilter = { role: "student" };

    // Add status filter if provided
    if (query?.status) {
      userFilter.status = query.status;
    }

    // Add search filter if provided
    if (query?.search) {
      userFilter.$or = [
        { fullName: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
        { department: { $regex: query.search, $options: "i" } },
      ];
    }

    // Filter for Student collection
    const studentFilter = {};

    // Add session filter if provided
    if (query?.sessionId) {
      studentFilter.session = query.sessionId;
    }

    // Count total documents
    const totalStudents = await User.countDocuments(userFilter);

    // Get students with pagination
    const users = await User.find(userFilter)
      .select("-password")
      .sort(query?.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get student profiles
    const studentIds = users.map((user) => user._id);
    const studentProfiles = await Student.find({
      user: { $in: studentIds },
      ...studentFilter,
    })
      .populate("team")
      .lean();

    // Combine user data with student profiles
    const students = users.map((user) => {
      const profile = studentProfiles.find(
        (p) => p.user.toString() === user._id.toString()
      );
      return {
        ...user.toObject(),
        profile: profile || null,
        hasTeam: !!profile?.team,
        teamId: profile?.team?._id || null,
        teamName: profile?.team?.name || null,
      };
    });

    return {
      success: true,
      data: {
        students,
        pagination: {
          total: totalStudents,
          page,
          limit,
          pages: Math.ceil(totalStudents / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get students", { error });
    throw error;
  }
};

// Get all teams with pagination and filters
export const getTeams = async ({ query }) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base match query
    const matchQuery = {};

    // Add filters if provided
    if (query.sessionId) {
      matchQuery.session = query.sessionId;
    }

    if (query.status) {
      matchQuery.status = query.status;
    }

    // Get teams
    const teams = await Team.find(matchQuery)
      .populate({
        path: "members.user",
        select: "fullName email",
      })
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email department",
        },
      })
      .populate("session", "name startDate endDate status")
      .sort(query.sort ? JSON.parse(query.sort) : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Team.countDocuments(matchQuery);

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
    logger.error("Failed to get teams", { error });
    throw error;
  }
};

// Get pending supervisor approvals
export const getPendingSupervisors = async () => {
  try {
    const pendingSupervisors = await User.find({
      role: "supervisor",
      isApproved: false,
    })
      .select("-password")
      .populate("user", "fullName email department profilePicture")
      .sort({ createdAt: -1 });

    return pendingSupervisors;
  } catch (error) {
    throw new Error(`Failed to fetch pending supervisors: ${error.message}`);
  }
};

// Approve supervisor
export const approveSupervisor = async ({ params }) => {
  try {
    const supervisor = await Supervisor.findById(params.id).populate("user");

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    if (supervisor.user.status === "active") {
      throw new ValidationError("Supervisor account is already approved");
    }

    // Update user status and send notification
    await User.findByIdAndUpdate(supervisor.user._id, {
      status: "active",
      isApproved: true,
      approvedAt: new Date(),
    });

    // Add notification
    const notification = new Notification({
      title: "Account Approved",
      message:
        "Your supervisor account has been approved. You can now log in and start supervising teams.",
      type: "account_approval",
      user: supervisor.user._id,
      isRead: false,
    });

    await notification.save();

    // Send approval email if email service is configured
    if (supervisor.user.email) {
      await sendEmail({
        to: supervisor.user.email,
        subject: "Supervisor Account Approved",
        template: "supervisorApproval",
        context: {
          name: supervisor.user.fullName,
          loginUrl: process.env.CLIENT_URL || "http://localhost:3000",
        },
      });
    }

    logger.info("Supervisor account approved", {
      supervisorId: supervisor._id,
    });

    return {
      success: true,
      message: "Supervisor account approved successfully",
    };
  } catch (error) {
    logger.error("Failed to approve supervisor", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Delete user
export const deleteUser = async (id) => {
  try {
    const user = await User.findById(id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Delete role-specific data
    if (user.role === "student") {
      await Student.findOneAndDelete({ user: user._id });
    } else if (user.role === "supervisor") {
      await Supervisor.findOneAndDelete({ user: user._id });
    }

    await User.deleteOne({ _id: user._id });
    return { message: "User removed successfully" };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

/**
 * Create a new academic session
 * @param {Object} options
 * @param {Object} options.body - Request body containing session details
 * @returns {Promise<Object>} Created session
 */
export const createSession = async ({ body }) => {
  const {
    name,
    startDate,
    endDate,
    maxTeamSize = 5,
    minTeamSize = 2,
    allowStudentInitiatedTeams = true,
    allowSupervisorInitiatedProjects = true,
    description = "",
    academicYear = "",
    term = "",
    academicPrograms = [],
    departments = [],
  } = body;

  // Validate session duration (3-6 months)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMonths = (end - start) / (1000 * 60 * 60 * 24 * 30);

  if (durationMonths < 3 || durationMonths > 6) {
    throw new ApiError(400, "Session duration must be between 3 and 6 months");
  }

  // Calculate registration period (first 2 weeks)
  const registrationStart = new Date(start);
  const registrationEnd = new Date(start);
  registrationEnd.setDate(registrationEnd.getDate() + 14);

  // Calculate team formation period (first 3 weeks)
  const teamFormationStart = new Date(start);
  const teamFormationEnd = new Date(start);
  teamFormationEnd.setDate(teamFormationEnd.getDate() + 21);

  try {
    // Create the session
    const session = await Session.create({
      name,
      startDate,
      endDate,
      description,
      status: "active",
      maxTeamSize,
      minTeamSize,
      allowStudentInitiatedTeams,
      allowSupervisorInitiatedProjects,
      academicYear,
      term,
      academicPrograms,
      departments,
      registrationPeriod: {
        start: registrationStart,
        end: registrationEnd,
      },
      teamFormationPeriod: {
        start: teamFormationStart,
        end: teamFormationEnd,
      },
    });

    // Create default deadlines for the session
    const endDateObj = new Date(endDate);
    const startDateObj = new Date(startDate);

    // Calculate mid-point for progress report
    const midPoint = new Date(
      startDateObj.getTime() +
        (endDateObj.getTime() - startDateObj.getTime()) / 2
    );

    // Create deadlines based on session duration
    session.deadlines = [
      {
        title: "Team Formation",
        dueDate: teamFormationEnd,
        type: "team_formation",
        description: "Deadline for forming teams and requesting supervisors",
      },
      {
        title: "Initial Project Proposal",
        dueDate: new Date(
          startDateObj.getTime() +
            (endDateObj.getTime() - startDateObj.getTime()) * 0.2
        ),
        type: "proposal",
        description: "Submit initial project proposal",
      },
      {
        title: "Progress Report",
        dueDate: midPoint,
        type: "progress_report",
        description: "Mid-term progress report submission",
      },
      {
        title: "Final Submission",
        dueDate: new Date(endDateObj.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week before end
        type: "final_submission",
        description: "Final project submission deadline",
      },
    ];

    await session.save();

    logger.info(`Created new session: ${name}`);

    return {
      success: true,
      message: "Session created successfully",
      data: session,
    };
  } catch (error) {
    logger.error(`Error creating session: ${error.message}`);
    throw new ApiError(500, `Error creating session: ${error.message}`);
  }
};

/**
 * Get all sessions with pagination and filtering
 * @param {Object} options
 * @param {Object} options.query - Query parameters
 * @returns {Promise<Object>} Sessions with pagination
 */
export const getAllSessions = async ({ query }) => {
  const {
    page = 1,
    limit = 10,
    status,
    term,
    academicYear,
    search,
    sort = "-createdAt",
  } = query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  try {
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Count total documents
    const total = await Session.countDocuments(filter);

    // Get sessions
    let sessions = await Session.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Calculate current date for progress calculation
    const currentDate = new Date();

    // Process sessions to include progress
    sessions = sessions.map((session) => {
      const startDate = new Date(session.startDate);
      const endDate = new Date(session.endDate);

      // Calculate progress based on current date relative to session duration
      let progress = 0;

      if (currentDate < startDate) {
        progress = 0;
      } else if (currentDate > endDate) {
        progress = 100;
      } else {
        const totalDuration = endDate - startDate;
        const elapsed = currentDate - startDate;
        progress = Math.round((elapsed / totalDuration) * 100);
      }

      return {
        ...session,
        progress,
      };
    });

    return {
      success: true,
      data: {
        sessions,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber),
        },
      },
    };
  } catch (error) {
    logger.error(`Error fetching sessions: ${error.message}`);
    throw new ApiError(500, `Error fetching sessions: ${error.message}`);
  }
};

/**
 * Get detailed session analytics for admin dashboard
 */
export const getSessionDetailedAnalytics = async ({ params, query }) => {
  try {
    const sessionId = params.sessionId;
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Time range filter
    const timeRange = query.timeRange || "all";
    let startDate, endDate;

    if (timeRange === "week") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
    } else if (timeRange === "month") {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = new Date();
    } else if (timeRange === "custom" && query.fromDate && query.toDate) {
      startDate = new Date(query.fromDate);
      endDate = new Date(query.toDate);
    } else {
      // Default to session date range
      startDate = new Date(session.startDate);
      endDate = new Date(session.endDate);
    }

    // Get teams in this session
    const teams = await Team.find({ session: sessionId })
      .populate("members.user", "fullName email")
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email",
        },
      })
      .populate("project")
      .lean();

    // Get projects in this session
    const projects = await Project.find({
      session: sessionId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("team")
      .lean();

    // Group submissions by date for timeline view
    const submissions = [];
    for (const project of projects) {
      if (project.submissions && project.submissions.length > 0) {
        for (const submission of project.submissions) {
          const submissionDate = new Date(submission.submittedAt);
          if (submissionDate >= startDate && submissionDate <= endDate) {
            submissions.push({
              ...submission,
              projectName: project.name,
              projectId: project._id,
              teamName: project.team?.name || "Unknown",
              submittedAt: submission.submittedAt,
            });
          }
        }
      }
    }

    // Analyze team activity
    const teamProgressUpdates = [];
    for (const team of teams) {
      // Get supervisor progress tracking updates within the time range
      const supervisors = team.supervisors || [];
      for (const supervisor of supervisors) {
        if (
          supervisor.progressTracking &&
          supervisor.progressTracking.milestones
        ) {
          for (const milestone of supervisor.progressTracking.milestones) {
            const updateDate = new Date(milestone.lastUpdated);
            if (updateDate >= startDate && updateDate <= endDate) {
              teamProgressUpdates.push({
                teamId: team._id,
                teamName: team.name,
                milestone: milestone.title,
                status: milestone.status,
                progress: milestone.progress,
                supervisorName:
                  supervisor.supervisor?.user?.fullName || "Unknown",
                date: milestone.lastUpdated,
              });
            }
          }
        }
      }
    }

    // Calculate overall session statistics
    const totalTeams = teams.length;
    const totalStudents = teams.reduce(
      (count, team) => count + (team.members?.length || 0),
      0
    );
    const totalProjects = projects.length;
    const totalSubmissions = submissions.length;

    // Calculate project type distribution
    const projectTypeDistribution = {};
    projects.forEach((project) => {
      const type = project.type || "unknown";
      projectTypeDistribution[type] = (projectTypeDistribution[type] || 0) + 1;
    });

    // Calculate project status distribution
    const projectStatusDistribution = {};
    projects.forEach((project) => {
      const status = project.status || "unknown";
      projectStatusDistribution[status] =
        (projectStatusDistribution[status] || 0) + 1;
    });

    // Get all deadlines for this session
    const deadlines = session.deadlines || [];
    const deadlinesWithStats = deadlines.map((deadline) => {
      const dueDate = new Date(deadline.dueDate);
      const isPast = dueDate < new Date();
      const daysRemaining = isPast
        ? 0
        : Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

      return {
        ...deadline,
        isPast,
        daysRemaining,
      };
    });

    // Group submissions by day/week/month based on query parameter
    const groupBy = query.groupBy || "day";
    const submissionTimeline = {};

    submissions.forEach((submission) => {
      let key;
      const date = new Date(submission.submittedAt);

      if (groupBy === "day") {
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (groupBy === "week") {
        // Get the week number and year
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(
          ((date - firstDayOfYear) / 86400000 + firstDayOfYear.getDay() + 1) / 7
        );
        key = `${date.getFullYear()}-W${weekNumber}`;
      } else if (groupBy === "month") {
        key = `${date.getFullYear()}-${date.getMonth() + 1}`; // YYYY-MM
      }

      submissionTimeline[key] = (submissionTimeline[key] || 0) + 1;
    });

    return {
      success: true,
      data: {
        session: {
          ...session.toObject(),
          progress: calculateSessionProgress(session),
        },
        timeRange: {
          start: startDate,
          end: endDate,
          label: timeRange,
        },
        overview: {
          totalTeams,
          totalStudents,
          totalProjects,
          totalSubmissions,
          projectTypeDistribution,
          projectStatusDistribution,
        },
        deadlines: deadlinesWithStats,
        activity: {
          submissions: submissions.sort(
            (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
          ),
          teamProgressUpdates: teamProgressUpdates.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          ),
          submissionTimeline,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get session analytics", {
      error,
      sessionId: params.sessionId,
    });
    throw error;
  }
};

/**
 * Helper function to calculate session progress based on start and end dates
 * @param {Object} session - Session object with startDate and endDate
 * @returns {Number} Progress percentage (0-100)
 */
const calculateSessionProgress = (session) => {
  const now = new Date();
  const start = new Date(session.startDate);
  const end = new Date(session.endDate);

  if (now < start) {
    return 0;
  }

  if (now > end) {
    return 100;
  }

  const totalDuration = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / totalDuration) * 100);
};

/**
 * Get work data within a specific time range for a session
 */
export const getSessionWorkData = async ({ params, query }) => {
  try {
    const sessionId = params.sessionId;
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Parse date range
    let startDate, endDate;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      // Default to session dates
      startDate = new Date(session.startDate);
      endDate = new Date(session.endDate);
    }

    // Validate date range
    if (startDate > endDate) {
      throw new ValidationError("Start date cannot be after end date");
    }

    // Get all work data within the specified time range
    const projects = await Project.find({
      session: sessionId,
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
        { "submissions.submittedAt": { $gte: startDate, $lte: endDate } },
      ],
    })
      .populate("team")
      .lean();

    // Get all teams with progress updates in the time range
    const teams = await Team.find({
      session: sessionId,
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
        {
          "supervisors.progressTracking.milestones.lastUpdated": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      ],
    })
      .populate("members.user", "fullName email")
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email",
        },
      })
      .lean();

    // Extract all work events in chronological order
    const workEvents = [];

    // Add project creation and submission events
    projects.forEach((project) => {
      const createdAt = new Date(project.createdAt);
      if (createdAt >= startDate && createdAt <= endDate) {
        workEvents.push({
          type: "project_created",
          date: createdAt,
          project: {
            id: project._id,
            name: project.name,
            type: project.type,
          },
          team: project.team
            ? {
                id: project.team._id,
                name: project.team.name,
              }
            : null,
        });
      }

      if (project.submissions && project.submissions.length > 0) {
        project.submissions.forEach((submission) => {
          const submittedAt = new Date(submission.submittedAt);
          if (submittedAt >= startDate && submittedAt <= endDate) {
            workEvents.push({
              type: "submission",
              date: submittedAt,
              submission: {
                id: submission._id,
                title: submission.title,
                type: submission.submissionType,
              },
              project: {
                id: project._id,
                name: project.name,
              },
              team: project.team
                ? {
                    id: project.team._id,
                    name: project.team.name,
                  }
                : null,
            });
          }

          // Add feedback events if they exist
          if (submission.feedback && submission.feedback.givenAt) {
            const feedbackDate = new Date(submission.feedback.givenAt);
            if (feedbackDate >= startDate && feedbackDate <= endDate) {
              workEvents.push({
                type: "feedback",
                date: feedbackDate,
                submission: {
                  id: submission._id,
                  title: submission.title,
                },
                project: {
                  id: project._id,
                  name: project.name,
                },
                team: project.team
                  ? {
                      id: project.team._id,
                      name: project.team.name,
                    }
                  : null,
                supervisor: submission.feedback.givenBy
                  ? {
                      id: submission.feedback.givenBy,
                      name: submission.feedback.givenByName || "Unknown",
                    }
                  : null,
              });
            }
          }
        });
      }
    });

    // Add team formation and progress update events
    teams.forEach((team) => {
      const createdAt = new Date(team.createdAt);
      if (createdAt >= startDate && createdAt <= endDate) {
        workEvents.push({
          type: "team_created",
          date: createdAt,
          team: {
            id: team._id,
            name: team.name,
            size: team.members?.length || 0,
          },
        });
      }

      // Add progress tracking updates
      if (team.supervisors && team.supervisors.length > 0) {
        team.supervisors.forEach((supervisor) => {
          if (
            supervisor.progressTracking &&
            supervisor.progressTracking.milestones
          ) {
            supervisor.progressTracking.milestones.forEach((milestone) => {
              const updateDate = new Date(milestone.lastUpdated);
              if (updateDate >= startDate && updateDate <= endDate) {
                workEvents.push({
                  type: "progress_update",
                  date: updateDate,
                  team: {
                    id: team._id,
                    name: team.name,
                  },
                  milestone: {
                    title: milestone.title,
                    status: milestone.status,
                    progress: milestone.progress,
                  },
                  supervisor: supervisor.supervisor?.user
                    ? {
                        id: supervisor.supervisor._id,
                        name: supervisor.supervisor.user.fullName,
                      }
                    : null,
                });
              }
            });
          }
        });
      }
    });

    // Sort all events by date
    workEvents.sort((a, b) => a.date - b.date);

    // Generate summary statistics
    const summary = {
      totalProjects: projects.length,
      totalTeams: teams.length,
      totalSubmissions: workEvents.filter((e) => e.type === "submission")
        .length,
      totalFeedbacks: workEvents.filter((e) => e.type === "feedback").length,
      totalProgressUpdates: workEvents.filter(
        (e) => e.type === "progress_update"
      ).length,
      submissionsByType: {},
      progressUpdatesByStatus: {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        delayed: 0,
      },
    };

    // Calculate submission distribution by type
    workEvents.forEach((event) => {
      if (event.type === "submission" && event.submission.type) {
        const type = event.submission.type;
        summary.submissionsByType[type] =
          (summary.submissionsByType[type] || 0) + 1;
      }

      if (event.type === "progress_update" && event.milestone.status) {
        const status = event.milestone.status;
        summary.progressUpdatesByStatus[status] =
          (summary.progressUpdatesByStatus[status] || 0) + 1;
      }
    });

    return {
      success: true,
      data: {
        timeRange: {
          start: startDate,
          end: endDate,
          durationDays: Math.ceil(
            (endDate - startDate) / (1000 * 60 * 60 * 24)
          ),
        },
        session: {
          id: session._id,
          name: session.name,
          status: session.status,
        },
        summary,
        workEvents,
      },
    };
  } catch (error) {
    logger.error("Failed to get session work data", {
      error,
      sessionId: params.sessionId,
      timeRange: `${query.startDate} to ${query.endDate}`,
    });
    throw error;
  }
};

/**
 * Fix missing or incomplete supervisor functionality
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Result of the fix operation
 */
export const fixSupervisorFunctionality = async (context) => {
  try {
    const { params, body } = context;
    const supervisorId = params.id;
    const { action } = body;

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate("user");

    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    let result = {
      success: false,
      message: "No action taken",
    };

    switch (action) {
      case "initialize_progress_tracking":
        // Initialize progress tracking for all teams
        const supervisorTeams = await Team.find({
          "supervisors.supervisor": supervisorId,
        });

        for (const team of supervisorTeams) {
          // Find the supervisor entry for this team
          const supervisorEntry = team.supervisors.find(
            (s) => s.supervisor.toString() === supervisorId
          );

          if (supervisorEntry && !supervisorEntry.progressTracking) {
            // Initialize progress tracking
            supervisorEntry.progressTracking = {
              lastUpdated: new Date(),
              milestones: [
                {
                  title: "Project Planning",
                  description: "Initial project planning and scope definition",
                  status: "not_started",
                  progress: 0,
                  lastUpdated: new Date(),
                },
                {
                  title: "Research Phase",
                  description: "Literature review and methodology research",
                  status: "not_started",
                  progress: 0,
                  lastUpdated: new Date(),
                },
                {
                  title: "Implementation",
                  description: "Development and implementation of the solution",
                  status: "not_started",
                  progress: 0,
                  lastUpdated: new Date(),
                },
                {
                  title: "Testing & Validation",
                  description:
                    "Testing and validation of the implemented solution",
                  status: "not_started",
                  progress: 0,
                  lastUpdated: new Date(),
                },
                {
                  title: "Documentation",
                  description:
                    "Project documentation and final report preparation",
                  status: "not_started",
                  progress: 0,
                  lastUpdated: new Date(),
                },
              ],
            };

            await team.save();
          }
        }

        result = {
          success: true,
          message: `Progress tracking initialized for ${supervisorTeams.length} teams`,
          teamsUpdated: supervisorTeams.length,
        };
        break;

      case "fix_missing_marks":
        // Find submissions reviewed by this supervisor without marks
        const projects = await Project.find({
          "submissions.reviewedBy": supervisorId,
          "submissions.marks": { $exists: false },
        });

        let fixedCount = 0;

        for (const project of projects) {
          let updated = false;

          for (const submission of project.submissions) {
            if (
              submission.reviewedBy &&
              submission.reviewedBy.toString() === supervisorId &&
              !submission.marks
            ) {
              // Add default marks based on feedback
              submission.marks = {
                content: 0,
                presentation: 0,
                methodology: 0,
                results: 0,
                discussion: 0,
                total: 0,
              };

              updated = true;
              fixedCount++;
            }
          }

          if (updated) {
            await project.save();
          }
        }

        result = {
          success: true,
          message: `Fixed ${fixedCount} submissions with missing marks`,
          submissionsFixed: fixedCount,
        };
        break;

      case "add_meeting_template":
        // Add meeting templates to supervisor
        if (
          !supervisor.meetingTemplates ||
          supervisor.meetingTemplates.length === 0
        ) {
          supervisor.meetingTemplates = [
            {
              title: "Weekly Progress Check",
              description:
                "Regular weekly meeting to check team progress and address any issues",
              duration: 30, // minutes
              allowRecording: true,
              agendaTemplate:
                "1. Progress updates\n2. Challenges faced\n3. Next steps\n4. Questions and clarifications",
            },
            {
              title: "Project Review",
              description:
                "Detailed review of project deliverables and quality assessment",
              duration: 60, // minutes
              allowRecording: true,
              agendaTemplate:
                "1. Review of deliverables\n2. Quality assessment\n3. Feedback\n4. Action items",
            },
            {
              title: "Quick Consultation",
              description:
                "Short consultation for urgent issues or quick questions",
              duration: 15, // minutes
              allowRecording: false,
              agendaTemplate:
                "1. Issue description\n2. Quick discussion\n3. Resolution",
            },
          ];

          await supervisor.save();

          result = {
            success: true,
            message: "Added meeting templates to supervisor",
            templatesAdded: supervisor.meetingTemplates.length,
          };
        } else {
          result = {
            success: false,
            message: "Supervisor already has meeting templates",
            templatesExisting: supervisor.meetingTemplates.length,
          };
        }
        break;

      default:
        result = {
          success: false,
          message: `Unknown action: ${action}`,
          validActions: [
            "initialize_progress_tracking",
            "fix_missing_marks",
            "add_meeting_template",
          ],
        };
    }

    // Log the action
    logger.info(`Admin fixed supervisor functionality: ${action}`, {
      supervisorId,
      action,
      result,
    });

    return result;
  } catch (error) {
    logger.error("Failed to fix supervisor functionality", {
      error,
      supervisorId: context.params.id,
      action: context.body.action,
    });
    throw error;
  }
};

/**
 * Get session timeline with all important events
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Session timeline events
 */
export const getSessionTimeline = async (context) => {
  try {
    const { params } = context;
    const sessionId = params.sessionId;

    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Gather timeline events
    const timelineEvents = [];

    // Add session start and end
    timelineEvents.push({
      type: "session_start",
      title: "Session Start",
      date: new Date(session.startDate),
      description: `Start of session: ${session.name}`,
      category: "milestone",
    });

    timelineEvents.push({
      type: "session_end",
      title: "Session End",
      date: new Date(session.endDate),
      description: `End of session: ${session.name}`,
      category: "milestone",
    });

    // Add registration period
    if (session.registrationPeriod) {
      timelineEvents.push({
        type: "registration_start",
        title: "Registration Open",
        date: new Date(session.registrationPeriod.start),
        description: "Student registration period begins",
        category: "registration",
      });

      timelineEvents.push({
        type: "registration_end",
        title: "Registration Close",
        date: new Date(session.registrationPeriod.end),
        description: "Student registration period ends",
        category: "registration",
      });
    }

    // Add team formation period
    if (session.teamFormationPeriod) {
      timelineEvents.push({
        type: "team_formation_start",
        title: "Team Formation Open",
        date: new Date(session.teamFormationPeriod.start),
        description: "Students can begin forming teams",
        category: "team",
      });

      timelineEvents.push({
        type: "team_formation_end",
        title: "Team Formation Close",
        date: new Date(session.teamFormationPeriod.end),
        description: "Deadline for team formation",
        category: "team",
      });
    }

    // Add all deadlines
    if (session.deadlines && session.deadlines.length > 0) {
      session.deadlines.forEach((deadline) => {
        timelineEvents.push({
          type: `deadline_${deadline.type}`,
          title: deadline.title,
          date: new Date(deadline.dueDate),
          description: deadline.description || `Deadline: ${deadline.title}`,
          category: "deadline",
          deadlineType: deadline.type,
        });
      });
    }

    // Get all teams created during this session
    const teams = await Team.find({ session: sessionId })
      .select("name creator createdAt members")
      .populate("creator", "fullName")
      .sort("createdAt")
      .lean();

    // Add team creation events
    teams.forEach((team) => {
      timelineEvents.push({
        type: "team_created",
        title: `Team Created: ${team.name}`,
        date: new Date(team.createdAt),
        description: `Team "${team.name}" created by ${
          team.creator?.fullName || "Unknown"
        }`,
        category: "team",
        teamId: team._id,
        teamName: team.name,
        memberCount: team.members?.length || 0,
      });
    });

    // Get all projects created during this session
    const projects = await Project.find({ session: sessionId })
      .select("name team type createdAt")
      .populate("team", "name")
      .sort("createdAt")
      .lean();

    // Add project creation events
    projects.forEach((project) => {
      timelineEvents.push({
        type: "project_created",
        title: `Project Created: ${project.name}`,
        date: new Date(project.createdAt),
        description: `Project "${project.name}" created by team "${
          project.team?.name || "Unknown"
        }"`,
        category: "project",
        projectId: project._id,
        projectName: project.name,
        projectType: project.type,
        teamId: project.team?._id,
        teamName: project.team?.name,
      });
    });

    // Sort all events by date
    timelineEvents.sort((a, b) => a.date - b.date);

    return {
      success: true,
      data: {
        session: {
          id: session._id,
          name: session.name,
          startDate: session.startDate,
          endDate: session.endDate,
          status: session.status,
        },
        timeline: timelineEvents,
      },
    };
  } catch (error) {
    logger.error("Failed to get session timeline", {
      error,
      sessionId: context.params.sessionId,
    });
    throw error;
  }
};

/**
 * Review supervisor marking activity for projects and submissions
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Marking activity review
 */
export const reviewSupervisorMarkingActivity = async (context) => {
  try {
    const { params } = context;
    const supervisorId = params.id;

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate(
      "user",
      "fullName email"
    );
    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Get all projects where this supervisor has reviewed submissions
    const projectsWithReviews = await Project.find({
      "submissions.reviewedBy": supervisorId,
    })
      .sort({ updatedAt: -1 })
      .populate("team", "name")
      .lean();

    // Extract and organize all review activity
    const reviewActivities = [];
    let totalSubmissionsReviewed = 0;
    let totalMarksGiven = 0;
    let totalFeedbackGiven = 0;
    let summaryByType = {};

    for (const project of projectsWithReviews) {
      for (const submission of project.submissions) {
        if (
          submission.reviewedBy &&
          submission.reviewedBy.toString() === supervisorId
        ) {
          // Track statistics
          totalSubmissionsReviewed++;
          if (submission.marks) totalMarksGiven++;
          if (submission.feedback) totalFeedbackGiven++;

          // Track by submission type
          const type = submission.submissionType || "unknown";
          summaryByType[type] = summaryByType[type] || {
            count: 0,
            withMarks: 0,
            withFeedback: 0,
            avgResponseTime: 0,
            totalResponseTime: 0,
          };

          summaryByType[type].count++;
          if (submission.marks) summaryByType[type].withMarks++;
          if (submission.feedback) summaryByType[type].withFeedback++;

          // Calculate response time if available
          let responseTime = null;
          if (submission.submittedAt && submission.reviewedAt) {
            const submittedDate = new Date(submission.submittedAt);
            const reviewedDate = new Date(submission.reviewedAt);
            responseTime = Math.floor(
              (reviewedDate - submittedDate) / (1000 * 60 * 60)
            ); // hours

            summaryByType[type].totalResponseTime += responseTime;
            summaryByType[type].avgResponseTime =
              summaryByType[type].totalResponseTime / summaryByType[type].count;
          }

          // Add to review activities
          reviewActivities.push({
            submissionId: submission._id,
            projectId: project._id,
            projectName: project.name,
            teamName: project.team?.name || "Unknown",
            submissionType: submission.submissionType,
            submissionTitle: submission.title,
            submittedAt: submission.submittedAt,
            reviewedAt: submission.reviewedAt,
            responseTime: responseTime, // in hours
            hasMarks: !!submission.marks,
            hasFeedback: !!submission.feedback,
            feedbackLength: submission.feedback
              ? submission.feedback.length
              : 0,
            marks: submission.marks ? submission.marks.total || 0 : null,
          });
        }
      }
    }

    // Sort review activities by date
    reviewActivities.sort(
      (a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt)
    );

    // Calculate average response time across all reviews
    const totalResponseTime = reviewActivities.reduce((total, activity) => {
      return total + (activity.responseTime || 0);
    }, 0);

    const avgResponseTime =
      totalSubmissionsReviewed > 0
        ? totalResponseTime /
          reviewActivities.filter((a) => a.responseTime !== null).length
        : 0;

    // Format summary by type
    const typesSummary = Object.keys(summaryByType).map((type) => ({
      type,
      count: summaryByType[type].count,
      withMarks: summaryByType[type].withMarks,
      withFeedback: summaryByType[type].withFeedback,
      marksRate: Math.round(
        (summaryByType[type].withMarks / summaryByType[type].count) * 100
      ),
      feedbackRate: Math.round(
        (summaryByType[type].withFeedback / summaryByType[type].count) * 100
      ),
      avgResponseTime:
        Math.round(summaryByType[type].avgResponseTime * 10) / 10, // round to 1 decimal
    }));

    return {
      success: true,
      data: {
        supervisor: {
          id: supervisor._id,
          name: supervisor.user.fullName,
          email: supervisor.user.email,
        },
        summary: {
          totalSubmissionsReviewed,
          totalMarksGiven,
          totalFeedbackGiven,
          marksRate:
            totalSubmissionsReviewed > 0
              ? Math.round((totalMarksGiven / totalSubmissionsReviewed) * 100)
              : 0,
          feedbackRate:
            totalSubmissionsReviewed > 0
              ? Math.round(
                  (totalFeedbackGiven / totalSubmissionsReviewed) * 100
                )
              : 0,
          avgResponseTime: Math.round(avgResponseTime * 10) / 10, // round to 1 decimal
        },
        typesSummary,
        reviewActivities,
      },
    };
  } catch (error) {
    logger.error("Failed to review supervisor marking activity", {
      error,
      supervisorId: context.params.id,
    });
    throw error;
  }
};

/**
 * Get system-wide analytics for admin dashboard
 * @param {Object} context - Request context
 * @returns {Promise<Object>} System analytics
 */
export const getSystemAnalytics = async (context) => {
  try {
    // Get counts of various entities
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Format user counts into an object
    const users = {};
    userCounts.forEach((count) => {
      users[count._id] = {
        total: count.count,
        active: count.active,
        pending: count.pending,
      };
    });

    // Get session statistics
    const sessions = await Session.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format session counts
    const sessionCounts = {
      total: 0,
      active: 0,
      completed: 0,
      upcoming: 0,
    };

    sessions.forEach((session) => {
      sessionCounts[session._id] = session.count;
      sessionCounts.total += session.count;
    });

    // Get team statistics
    const teams = await Team.countDocuments();
    const teamsWithSupervisors = await Team.countDocuments({
      "supervisors.0": { $exists: true },
    });
    const teamsWithoutSupervisors = teams - teamsWithSupervisors;

    // Get project statistics
    const projects = await Project.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          statuses: { $push: { k: "$_id", v: "$count" } },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          statuses: { $arrayToObject: "$statuses" },
        },
      },
    ]);

    const projectStats =
      projects.length > 0 ? projects[0] : { total: 0, statuses: {} };

    // Calculate active submission counts
    const activeSubmissions = await Project.aggregate([
      {
        $match: {
          "submissions.0": { $exists: true },
        },
      },
      {
        $project: {
          submissionCount: { $size: "$submissions" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$submissionCount" },
        },
      },
    ]);

    const submissionCount =
      activeSubmissions.length > 0 ? activeSubmissions[0].total : 0;

    // Get recent activity
    const recentActivity = await Promise.all([
      // Recent team formations (last 7 days)
      Team.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .populate("creator", "fullName")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Recent project submissions (last 7 days)
      Project.aggregate([
        {
          $unwind: "$submissions",
        },
        {
          $match: {
            "submissions.submittedAt": {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $sort: {
            "submissions.submittedAt": -1,
          },
        },
        {
          $limit: 5,
        },
        {
          $project: {
            _id: 1,
            name: 1,
            team: 1,
            submission: "$submissions",
          },
        },
        {
          $lookup: {
            from: "teams",
            localField: "team",
            foreignField: "_id",
            as: "teamDetails",
          },
        },
        {
          $unwind: {
            path: "$teamDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]),
    ]);

    // Format recent team formations
    const recentTeams = recentActivity[0].map((team) => ({
      id: team._id,
      name: team.name,
      createdAt: team.createdAt,
      createdBy: team.creator ? team.creator.fullName : "Unknown",
      memberCount: team.members ? team.members.length : 0,
    }));

    // Format recent submissions
    const recentSubmissions = recentActivity[1].map((item) => ({
      id: item.submission._id,
      projectId: item._id,
      projectName: item.name,
      teamId: item.team,
      teamName: item.teamDetails ? item.teamDetails.name : "Unknown",
      title: item.submission.title,
      type: item.submission.submissionType,
      submittedAt: item.submission.submittedAt,
    }));

    return {
      success: true,
      data: {
        users,
        sessions: sessionCounts,
        teams: {
          total: teams,
          withSupervisor: teamsWithSupervisors,
          withoutSupervisor: teamsWithoutSupervisors,
        },
        projects: projectStats,
        submissions: {
          total: submissionCount,
        },
        recentActivity: {
          teams: recentTeams,
          submissions: recentSubmissions,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get system analytics", { error });
    throw error;
  }
};

/**
 * Get analytics for a specific session
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Session analytics
 */
export const getSessionAnalytics = async (context) => {
  try {
    const { params } = context;
    const sessionId = params.sessionId;

    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Get all teams in this session
    const teams = await Team.find({ session: sessionId })
      .populate({
        path: "members.user",
        select: "fullName email",
      })
      .lean();

    // Get all projects in this session
    const projects = await Project.find({ session: sessionId })
      .populate("team", "name")
      .lean();

    // Student participation stats
    const studentStats = {
      total: 0,
      withTeam: 0,
      withoutTeam: 0,
      teamDistribution: {}, // team size distribution
    };

    // Process teams for student stats
    teams.forEach((team) => {
      const teamSize = team.members?.length || 0;
      studentStats.total += teamSize;
      studentStats.withTeam += teamSize;

      // Track team size distribution
      studentStats.teamDistribution[teamSize] =
        (studentStats.teamDistribution[teamSize] || 0) + 1;
    });

    // Project stats
    const projectStats = {
      total: projects.length,
      byStatus: {},
      byType: {},
      submissionStats: {
        totalSubmissions: 0,
        byType: {},
        reviewed: 0,
        pending: 0,
      },
    };

    // Process projects for stats
    projects.forEach((project) => {
      // Status distribution
      const status = project.status || "unknown";
      projectStats.byStatus[status] = (projectStats.byStatus[status] || 0) + 1;

      // Type distribution
      const type = project.type || "unknown";
      projectStats.byType[type] = (projectStats.byType[type] || 0) + 1;

      // Submission stats
      if (project.submissions && project.submissions.length > 0) {
        projectStats.submissionStats.totalSubmissions +=
          project.submissions.length;

        project.submissions.forEach((submission) => {
          // Track by submission type
          const submissionType = submission.submissionType || "unknown";
          projectStats.submissionStats.byType[submissionType] =
            (projectStats.submissionStats.byType[submissionType] || 0) + 1;

          // Track reviewed vs pending
          if (submission.reviewedBy) {
            projectStats.submissionStats.reviewed++;
          } else {
            projectStats.submissionStats.pending++;
          }
        });
      }
    });

    // Supervisor engagement stats
    const supervisorStats = {
      totalAssigned: 0,
      teamsWithSupervisor: 0,
      teamsWithoutSupervisor: 0,
      avgTeamsPerSupervisor: 0,
    };

    // Count teams with supervisors
    const teamsWithSupervisor = teams.filter(
      (team) => team.supervisors && team.supervisors.length > 0
    );
    supervisorStats.teamsWithSupervisor = teamsWithSupervisor.length;
    supervisorStats.teamsWithoutSupervisor =
      teams.length - teamsWithSupervisor.length;

    // Count unique supervisors
    const uniqueSupervisors = new Set();
    teamsWithSupervisor.forEach((team) => {
      team.supervisors.forEach((supervisor) => {
        if (supervisor.supervisor) {
          uniqueSupervisors.add(supervisor.supervisor.toString());
        }
      });
    });

    supervisorStats.totalAssigned = uniqueSupervisors.size;
    supervisorStats.avgTeamsPerSupervisor =
      uniqueSupervisors.size > 0
        ? supervisorStats.teamsWithSupervisor / uniqueSupervisors.size
        : 0;

    // Calculate session progress
    const now = new Date();
    const startDate = new Date(session.startDate);
    const endDate = new Date(session.endDate);
    let progress = 0;

    if (now < startDate) {
      progress = 0;
    } else if (now > endDate) {
      progress = 100;
    } else {
      const totalDuration = endDate - startDate;
      const elapsed = now - startDate;
      progress = Math.round((elapsed / totalDuration) * 100);
    }

    // Get upcoming deadlines
    const upcomingDeadlines = [];
    if (session.deadlines && session.deadlines.length > 0) {
      session.deadlines.forEach((deadline) => {
        const deadlineDate = new Date(deadline.dueDate);
        if (deadlineDate > now) {
          upcomingDeadlines.push({
            title: deadline.title,
            dueDate: deadline.dueDate,
            type: deadline.type,
            daysRemaining: Math.ceil(
              (deadlineDate - now) / (1000 * 60 * 60 * 24)
            ),
          });
        }
      });
    }

    // Sort upcoming deadlines by date
    upcomingDeadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return {
      success: true,
      data: {
        session: {
          id: session._id,
          name: session.name,
          startDate: session.startDate,
          endDate: session.endDate,
          status: session.status,
          progress: progress,
        },
        summary: {
          teams: teams.length,
          students: studentStats.total,
          projects: projectStats.total,
          submissions: projectStats.submissionStats.totalSubmissions,
          supervisors: supervisorStats.totalAssigned,
        },
        teamStats: {
          total: teams.length,
          sizeDistribution: studentStats.teamDistribution,
        },
        projectStats,
        supervisorStats,
        upcomingDeadlines: upcomingDeadlines.slice(0, 5), // Return top 5 upcoming deadlines
      },
    };
  } catch (error) {
    logger.error("Failed to get session analytics", {
      error,
      sessionId: context.params.sessionId,
    });
    throw error;
  }
};

/**
 * Get all projects with optional filtering and pagination
 * @param {Object} context - Request context
 * @returns {Promise<Object>} List of projects
 */
export const getProjects = async (context) => {
  try {
    const { query } = context;
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    // Add session filter if provided
    if (query?.sessionId) {
      filter.session = query.sessionId;
    }

    // Add status filter if provided
    if (query?.status) {
      filter.status = query.status;
    }

    // Add type filter if provided
    if (query?.type) {
      filter.type = query.type;
    }

    // Add search filter if provided
    if (query?.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
      ];
    }

    // Get projects with pagination
    const projects = await Project.find(filter)
      .populate("team", "name members")
      .populate("session", "name")
      .populate({
        path: "supervisor",
        populate: {
          path: "user",
          select: "fullName email",
        },
      })
      .sort(query?.sort ? JSON.parse(query.sort) : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Project.countDocuments(filter);

    // Process project data to include additional information
    const enrichedProjects = projects.map((project) => {
      // Calculate submission statistics
      const submissionStats = {
        total: project.submissions?.length || 0,
        reviewed: project.submissions?.filter((s) => s.reviewedBy)?.length || 0,
        pending: project.submissions?.filter((s) => !s.reviewedBy)?.length || 0,
        latestSubmission: null,
      };

      // Get latest submission
      if (submissionStats.total > 0) {
        const sortedSubmissions = [...project.submissions].sort(
          (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
        );
        submissionStats.latestSubmission = sortedSubmissions[0];
      }

      return {
        ...project,
        teamName: project.team?.name || "No Team",
        teamSize: project.team?.members?.length || 0,
        sessionName: project.session?.name || "Unknown Session",
        supervisorName: project.supervisor?.user?.fullName || "No Supervisor",
        submissionStats,
      };
    });

    return {
      success: true,
      data: {
        projects: enrichedProjects,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get projects", { error });
    throw error;
  }
};

/**
 * Verify the supervisor's progress tracking setup and usage
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Verification results
 */
export const verifySupervisorProgressTracking = async (context) => {
  try {
    const { params } = context;
    const supervisorId = params.id;

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate(
      "user",
      "fullName email"
    );
    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Get all teams this supervisor is assigned to
    const supervisorTeams = await Team.find({
      "supervisors.supervisor": supervisorId,
    }).lean();

    // Results object
    const results = {
      supervisor: {
        id: supervisor._id,
        name: supervisor.user.fullName,
        email: supervisor.user.email,
      },
      teams: {
        total: supervisorTeams.length,
        withTracking: 0,
        withoutTracking: 0,
        withUpdates: 0,
        details: [],
      },
      milestones: {
        total: 0,
        updated: 0,
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        delayed: 0,
      },
      overview: {
        isSetupCorrectly: false,
        lastUpdated: null,
        updateFrequencyDays: 0,
        consistencyScore: 0,
        percentComplete: 0,
      },
    };

    // Process all teams
    for (const team of supervisorTeams) {
      // Find this supervisor's entry in the team
      const supervisorEntry = team.supervisors.find(
        (sup) => sup.supervisor && sup.supervisor.toString() === supervisorId
      );

      const teamStatus = {
        teamId: team._id,
        teamName: team.name,
        hasTracking: false,
        hasUpdates: false,
        milestonesCount: 0,
        updatedMilestonesCount: 0,
        lastUpdated: null,
        milestones: [],
      };

      if (supervisorEntry && supervisorEntry.progressTracking) {
        teamStatus.hasTracking = true;
        results.teams.withTracking++;

        const { milestones, lastUpdated } = supervisorEntry.progressTracking;

        if (milestones && milestones.length > 0) {
          teamStatus.milestonesCount = milestones.length;
          results.milestones.total += milestones.length;

          // Process each milestone
          milestones.forEach((milestone) => {
            const milestoneStatus = {
              title: milestone.title,
              status: milestone.status,
              progress: milestone.progress,
              lastUpdated: milestone.lastUpdated,
            };

            teamStatus.milestones.push(milestoneStatus);

            // Track milestone status counts
            if (milestone.status === "not_started") {
              results.milestones.notStarted++;
            } else if (milestone.status === "in_progress") {
              results.milestones.inProgress++;
            } else if (milestone.status === "completed") {
              results.milestones.completed++;
            } else if (milestone.status === "delayed") {
              results.milestones.delayed++;
            }

            // Check if milestone has been updated (not at default values)
            const isUpdated =
              milestone.status !== "not_started" || milestone.progress > 0;

            if (isUpdated) {
              teamStatus.updatedMilestonesCount++;
              results.milestones.updated++;
            }
          });
        }

        // Check if tracking has been updated
        if (teamStatus.updatedMilestonesCount > 0) {
          teamStatus.hasUpdates = true;
          results.teams.withUpdates++;
          teamStatus.lastUpdated = lastUpdated;

          // Track latest update for overall summary
          if (
            !results.overview.lastUpdated ||
            new Date(lastUpdated) > new Date(results.overview.lastUpdated)
          ) {
            results.overview.lastUpdated = lastUpdated;
          }
        }
      } else {
        results.teams.withoutTracking++;
      }

      results.teams.details.push(teamStatus);
    }

    // Calculate consistency score (0-100)
    if (results.teams.total > 0) {
      // Base setup score - percentage of teams with tracking
      const setupScore = Math.round(
        (results.teams.withTracking / results.teams.total) * 100
      );

      // Usage score - percentage of milestones that have been updated
      const usageScore =
        results.milestones.total > 0
          ? Math.round(
              (results.milestones.updated / results.milestones.total) * 100
            )
          : 0;

      // Completion score - percentage of milestones marked as completed
      const completionScore =
        results.milestones.total > 0
          ? Math.round(
              (results.milestones.completed / results.milestones.total) * 100
            )
          : 0;

      // Weighted average for final score
      results.overview.consistencyScore = Math.round(
        setupScore * 0.4 + usageScore * 0.4 + completionScore * 0.2
      );

      results.overview.percentComplete = completionScore;
      results.overview.isSetupCorrectly = setupScore >= 80; // 80% of teams have tracking set up
    }

    // Calculate update frequency if there have been updates
    if (results.overview.lastUpdated) {
      const now = new Date();
      const lastUpdate = new Date(results.overview.lastUpdated);
      const daysSinceLastUpdate = Math.round(
        (now - lastUpdate) / (1000 * 60 * 60 * 24)
      );

      results.overview.updateFrequencyDays = daysSinceLastUpdate;
    }

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    logger.error("Failed to verify supervisor progress tracking", {
      error,
      supervisorId: context.params.id,
    });
    throw error;
  }
};

/**
 * Get supervisor activity log
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Supervisor activity log
 */
export const getSupervisorActivity = async (context) => {
  try {
    const { params, query } = context;
    const supervisorId = params.id;
    const limit = parseInt(query?.limit) || 50;

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate(
      "user",
      "fullName email"
    );
    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Get project submissions reviewed by this supervisor
    const projects = await Project.find({
      "submissions.reviewedBy": supervisorId,
    })
      .select("name submissions")
      .sort({ "submissions.reviewedAt": -1 })
      .limit(limit)
      .lean();

    // Extract submission reviews
    const reviews = [];
    for (const project of projects) {
      if (project.submissions) {
        for (const submission of project.submissions) {
          if (
            submission.reviewedBy &&
            submission.reviewedBy.toString() === supervisorId
          ) {
            reviews.push({
              type: "submission_review",
              timestamp: submission.reviewedAt,
              project: {
                id: project._id,
                name: project.name,
              },
              submission: {
                title: submission.title,
                type: submission.submissionType,
              },
              details: {
                hasMarks: !!submission.marks,
                hasFeedback: !!submission.feedback,
              },
            });
          }
        }
      }
    }

    // Sort reviews by timestamp (most recent first)
    reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Take only the requested number
    const limitedReviews = reviews.slice(0, limit);

    return {
      success: true,
      data: {
        supervisor: {
          id: supervisor._id,
          name: supervisor.user.fullName,
          email: supervisor.user.email,
        },
        activity: limitedReviews,
        summary: {
          reviewsCount: reviews.length,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor activity", {
      error,
      supervisorId: context.params.id,
    });
    throw error;
  }
};

/**
 * Update a timeline task for a session
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Updated timeline task
 */
export const updateTimelineTask = async (context) => {
  try {
    const { params, body } = context;
    const { sessionId, taskId } = params;
    const { status, notes, completedDate } = body;

    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Find the timeline task
    const timeline = await SessionTimeline.findOne({
      session: sessionId,
      "tasks._id": taskId,
    });

    if (!timeline) {
      throw new NotFoundError("Timeline or task not found");
    }

    // Find and update the specific task
    const taskIndex = timeline.tasks.findIndex(
      (task) => task._id.toString() === taskId
    );

    if (taskIndex === -1) {
      throw new NotFoundError("Task not found in timeline");
    }

    // Update task fields
    if (status) {
      timeline.tasks[taskIndex].status = status;

      // If marked as completed, set completedDate
      if (status === "completed" && !timeline.tasks[taskIndex].completedDate) {
        timeline.tasks[taskIndex].completedDate = completedDate || new Date();
      }
    }

    if (notes) {
      timeline.tasks[taskIndex].notes = notes;
    }

    if (
      completedDate &&
      (status === "completed" ||
        timeline.tasks[taskIndex].status === "completed")
    ) {
      timeline.tasks[taskIndex].completedDate = new Date(completedDate);
    }

    // Update last modified date
    timeline.tasks[taskIndex].lastModified = new Date();
    timeline.lastModified = new Date();

    // Save the updated timeline
    await timeline.save();

    // Log the update
    logger.info(`Updated timeline task for session ${sessionId}`, {
      taskId,
      sessionId,
      updatedFields: { status, notes, completedDate },
    });

    return {
      success: true,
      message: "Timeline task updated successfully",
      data: timeline.tasks[taskIndex],
    };
  } catch (error) {
    logger.error("Failed to update timeline task", {
      error,
      sessionId: context.params.sessionId,
      taskId: context.params.taskId,
    });
    throw error;
  }
};

/**
 * Create a timeline for a session with default tasks
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Created session timeline
 */
export const createSessionTimeline = async (context) => {
  try {
    const { params, body } = context;
    const { sessionId } = params;
    const { tasks } = body;

    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Check if a timeline already exists for this session
    const existingTimeline = await SessionTimeline.findOne({
      session: sessionId,
    });
    if (existingTimeline) {
      throw new ValidationError("Timeline already exists for this session");
    }

    // Create default tasks if not provided
    let timelineTasks = tasks || [];

    if (!timelineTasks.length) {
      // Create default tasks based on session deadlines
      if (session.deadlines && session.deadlines.length > 0) {
        // Map session deadlines to timeline tasks
        timelineTasks = session.deadlines.map((deadline) => ({
          title: deadline.title,
          description: deadline.description || `Complete ${deadline.title}`,
          dueDate: deadline.dueDate,
          category: "deadline",
          status: "pending",
          priority: deadline.type === "final_submission" ? "high" : "medium",
          relatedDeadline: deadline._id,
        }));
      }

      // Add default administrative tasks
      const startDate = new Date(session.startDate);
      const endDate = new Date(session.endDate);

      // Add supervisor assignment task (2 weeks after start)
      const supervisorAssignmentDate = new Date(startDate);
      supervisorAssignmentDate.setDate(startDate.getDate() + 14);

      timelineTasks.push({
        title: "Assign Supervisors to Teams",
        description:
          "Ensure all teams have been assigned appropriate supervisors",
        dueDate: supervisorAssignmentDate,
        category: "administrative",
        status: "pending",
        priority: "high",
      });

      // Add mid-term progress check (halfway through the session)
      const midPoint = new Date(
        startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2
      );

      timelineTasks.push({
        title: "Mid-term Progress Check",
        description: "Evaluate progress of all teams and provide feedback",
        dueDate: midPoint,
        category: "review",
        status: "pending",
        priority: "medium",
      });

      // Add final evaluation task (1 week before end)
      const finalEvalDate = new Date(endDate);
      finalEvalDate.setDate(endDate.getDate() - 7);

      timelineTasks.push({
        title: "Final Evaluation",
        description: "Complete final evaluation of all projects",
        dueDate: finalEvalDate,
        category: "review",
        status: "pending",
        priority: "high",
      });
    }

    // Create the timeline
    const timeline = await SessionTimeline.create({
      session: sessionId,
      name: `Timeline for ${session.name}`,
      description: `Administrative timeline and tasks for the ${session.name} session`,
      tasks: timelineTasks,
      createdAt: new Date(),
      lastModified: new Date(),
    });

    logger.info(`Created timeline for session ${sessionId}`, {
      sessionId,
      timelineId: timeline._id,
      tasksCount: timelineTasks.length,
    });

    return {
      success: true,
      message: "Session timeline created successfully",
      data: timeline,
    };
  } catch (error) {
    logger.error("Failed to create session timeline", {
      error,
      sessionId: context.params.sessionId,
    });
    throw error;
  }
};

/**
 * Get supervisor performance metrics
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Supervisor performance metrics
 */
export const getSupervisorPerformance = async (context) => {
  try {
    const { params, query } = context;
    const supervisorId = params.id;

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate(
      "user",
      "fullName email"
    );
    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Get time range filter
    const timeRange = query.timeRange || "all";
    let startDate, endDate;

    if (timeRange === "week") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
    } else if (timeRange === "month") {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = new Date();
    } else if (timeRange === "custom" && query.fromDate && query.toDate) {
      startDate = new Date(query.fromDate);
      endDate = new Date(query.toDate);
    } else {
      // Default to all time
      startDate = new Date(0); // beginning of time
      endDate = new Date();
    }

    // Get all teams this supervisor is assigned to
    const teams = await Team.find({
      "supervisors.supervisor": supervisorId,
    })
      .populate("members.user", "fullName email")
      .populate("session")
      .lean();

    // Get all projects where this supervisor has reviewed submissions
    const projects = await Project.find({
      "submissions.reviewedBy": supervisorId,
    })
      .populate("team", "name")
      .lean();

    // Calculate performance metrics

    // 1. Team supervision metrics
    const teamMetrics = {
      totalTeams: teams.length,
      activeTeams: teams.filter((team) => team.status === "active").length,
      totalStudents: teams.reduce(
        (total, team) => total + (team.members?.length || 0),
        0
      ),
      teamsWithProgressTracking: 0,
      progressTrackingUsageRate: 0,
      averageProgressCompletion: 0,
    };

    // Calculate progress tracking metrics
    let totalMilestones = 0;
    let completedMilestones = 0;
    let teamsWithProgressTracking = 0;

    teams.forEach((team) => {
      const supervisorEntry = team.supervisors?.find(
        (s) => s.supervisor && s.supervisor.toString() === supervisorId
      );

      if (supervisorEntry?.progressTracking?.milestones?.length > 0) {
        teamsWithProgressTracking++;

        supervisorEntry.progressTracking.milestones.forEach((milestone) => {
          totalMilestones++;
          if (milestone.status === "completed") {
            completedMilestones++;
          }
        });
      }
    });

    teamMetrics.teamsWithProgressTracking = teamsWithProgressTracking;
    teamMetrics.progressTrackingUsageRate =
      teams.length > 0
        ? Math.round((teamsWithProgressTracking / teams.length) * 100)
        : 0;
    teamMetrics.averageProgressCompletion =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    // 2. Project review metrics
    const reviewMetrics = {
      totalSubmissionsReviewed: 0,
      submissionsWithFeedback: 0,
      submissionsWithMarks: 0,
      averageResponseTime: 0, // hours
      feedbackQuality: 0, // scale of 0-100
    };

    // Process all submissions
    let totalResponseTime = 0;
    let responseTimes = 0;
    let totalFeedbackLength = 0;

    projects.forEach((project) => {
      if (project.submissions) {
        project.submissions.forEach((submission) => {
          if (
            submission.reviewedBy &&
            submission.reviewedBy.toString() === supervisorId &&
            submission.reviewedAt
          ) {
            // Check if within time range
            const reviewDate = new Date(submission.reviewedAt);
            if (reviewDate >= startDate && reviewDate <= endDate) {
              reviewMetrics.totalSubmissionsReviewed++;

              if (submission.feedback) {
                reviewMetrics.submissionsWithFeedback++;
                totalFeedbackLength += submission.feedback.length || 0;
              }

              if (submission.marks) {
                reviewMetrics.submissionsWithMarks++;
              }

              // Calculate response time if available
              if (submission.submittedAt) {
                const submittedDate = new Date(submission.submittedAt);
                const responseTimeHours = Math.round(
                  (reviewDate - submittedDate) / (1000 * 60 * 60)
                );

                totalResponseTime += responseTimeHours;
                responseTimes++;
              }
            }
          }
        });
      }
    });

    // Calculate average values
    reviewMetrics.averageResponseTime =
      responseTimes > 0 ? Math.round(totalResponseTime / responseTimes) : 0;

    const avgFeedbackLength =
      reviewMetrics.submissionsWithFeedback > 0
        ? totalFeedbackLength / reviewMetrics.submissionsWithFeedback
        : 0;

    // Calculate feedback quality based on length and existence
    const feedbackRate =
      reviewMetrics.totalSubmissionsReviewed > 0
        ? (reviewMetrics.submissionsWithFeedback /
            reviewMetrics.totalSubmissionsReviewed) *
          100
        : 0;

    // Assume quality scales with length, capped at 100
    const lengthScore = Math.min(100, avgFeedbackLength / 5);

    reviewMetrics.feedbackQuality = Math.round(
      feedbackRate * 0.6 + lengthScore * 0.4
    );

    // 3. Time management metrics
    const timeManagementMetrics = {
      averageMeetingsPerTeam: 0,
      meetingAttendanceRate: 0,
    };

    // Get meetings within time range
    const meetings = await Meeting.find({
      supervisor: supervisorId,
      scheduledAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const meetingsPerTeam =
      teams.length > 0 ? meetings.length / teams.length : 0;
    timeManagementMetrics.averageMeetingsPerTeam = parseFloat(
      meetingsPerTeam.toFixed(1)
    );

    // Calculate attendance rate
    let totalExpectedAttendees = 0;
    let totalActualAttendees = 0;

    meetings.forEach((meeting) => {
      if (meeting.status === "completed") {
        // Each team member should attend
        const expectedTeamSize = meeting.expectedAttendees?.length || 0;
        const actualAttendees = meeting.attendees?.length || 0;

        totalExpectedAttendees += expectedTeamSize;
        totalActualAttendees += actualAttendees;
      }
    });

    timeManagementMetrics.meetingAttendanceRate =
      totalExpectedAttendees > 0
        ? Math.round((totalActualAttendees / totalExpectedAttendees) * 100)
        : 0;

    // 4. Calculate overall performance score (0-100)
    const overallPerformance = Math.round(
      teamMetrics.progressTrackingUsageRate * 0.25 +
        reviewMetrics.feedbackQuality * 0.35 +
        timeManagementMetrics.meetingAttendanceRate * 0.15 +
        teamMetrics.averageProgressCompletion * 0.25
    );

    return {
      success: true,
      data: {
        supervisor: {
          id: supervisor._id,
          name: supervisor.user.fullName,
          email: supervisor.user.email,
        },
        timeRange: {
          start: startDate,
          end: endDate,
          label: timeRange,
        },
        teamMetrics,
        reviewMetrics,
        timeManagementMetrics,
        overallPerformance,
        performanceLevel: getPerformanceLevel(overallPerformance),
        recommendations: generateRecommendations(
          teamMetrics,
          reviewMetrics,
          timeManagementMetrics
        ),
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor performance", {
      error,
      supervisorId: context.params.id,
    });
    throw error;
  }
};

/**
 * Get performance level based on score
 * @param {Number} score - Performance score (0-100)
 * @returns {String} Performance level
 */
const getPerformanceLevel = (score) => {
  if (score >= 90) return "outstanding";
  if (score >= 80) return "excellent";
  if (score >= 70) return "good";
  if (score >= 60) return "satisfactory";
  if (score >= 50) return "needs_improvement";
  return "concerning";
};

/**
 * Generate recommendations based on metrics
 * @param {Object} teamMetrics - Team supervision metrics
 * @param {Object} reviewMetrics - Project review metrics
 * @param {Object} timeManagementMetrics - Time management metrics
 * @returns {Array} List of recommendations
 */
const generateRecommendations = (
  teamMetrics,
  reviewMetrics,
  timeManagementMetrics
) => {
  const recommendations = [];

  // Team supervision recommendations
  if (teamMetrics.progressTrackingUsageRate < 70) {
    recommendations.push({
      area: "team_supervision",
      priority: "high",
      message: "Increase usage of progress tracking for teams",
    });
  }

  if (teamMetrics.averageProgressCompletion < 50) {
    recommendations.push({
      area: "team_supervision",
      priority: "medium",
      message: "Work with teams to make more progress on milestones",
    });
  }

  // Review metrics recommendations
  if (
    reviewMetrics.submissionsWithFeedback /
      reviewMetrics.totalSubmissionsReviewed <
    0.8
  ) {
    recommendations.push({
      area: "project_review",
      priority: "high",
      message: "Provide feedback on more submissions",
    });
  }

  if (reviewMetrics.averageResponseTime > 48) {
    recommendations.push({
      area: "project_review",
      priority: "medium",
      message: "Reduce response time on project submissions",
    });
  }

  if (reviewMetrics.feedbackQuality < 70) {
    recommendations.push({
      area: "project_review",
      priority: "high",
      message: "Improve quality and detail of feedback provided",
    });
  }

  // Time management recommendations
  if (timeManagementMetrics.averageMeetingsPerTeam < 2) {
    recommendations.push({
      area: "time_management",
      priority: "medium",
      message: "Schedule more regular meetings with each team",
    });
  }

  if (timeManagementMetrics.meetingAttendanceRate < 80) {
    recommendations.push({
      area: "time_management",
      priority: "low",
      message: "Improve student attendance at scheduled meetings",
    });
  }

  return recommendations;
};

/**
 * Assign a supervisor to a team
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Assignment result
 */
export const assignSupervisorToTeam = async (context) => {
  try {
    const { params, body } = context;
    const { teamId } = params;
    const { supervisorId, role = "primary" } = body;

    // Find the team
    const team = await Team.findById(teamId)
      .populate("members.user", "fullName email")
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email",
        },
      });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate(
      "user",
      "fullName email"
    );
    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Check if supervisor is already assigned to this team
    const existingSupervisor = team.supervisors.find(
      (s) => s.supervisor._id.toString() === supervisorId
    );

    if (existingSupervisor) {
      // Just update the role if it's different
      if (existingSupervisor.role !== role) {
        existingSupervisor.role = role;
        await team.save();

        logger.info(`Updated supervisor role for team ${teamId}`, {
          teamId,
          supervisorId,
          role,
        });

        return {
          success: true,
          message: `Supervisor role updated to ${role}`,
          data: {
            team: {
              id: team._id,
              name: team.name,
            },
            supervisor: {
              id: supervisor._id,
              name: supervisor.user.fullName,
              email: supervisor.user.email,
            },
            role,
          },
        };
      } else {
        return {
          success: false,
          message:
            "Supervisor is already assigned to this team with the same role",
          data: {
            team: {
              id: team._id,
              name: team.name,
            },
            supervisor: {
              id: supervisor._id,
              name: supervisor.user.fullName,
              email: supervisor.user.email,
            },
            role,
          },
        };
      }
    }

    // Check if there's a supervisor with the same role already
    if (role === "primary") {
      const existingPrimary = team.supervisors.find(
        (s) => s.role === "primary"
      );
      if (existingPrimary) {
        throw new ValidationError(
          "Team already has a primary supervisor. Please change their role first."
        );
      }
    }

    // Check if supervisor has reached their maximum team limit
    const supervisorTeamsCount = await Team.countDocuments({
      "supervisors.supervisor": supervisorId,
    });

    // Default max teams is 5, but can be overridden in supervisor settings
    const maxTeams = supervisor.settings?.maxTeams || 5;

    if (supervisorTeamsCount >= maxTeams) {
      throw new ValidationError(
        `Supervisor has reached their maximum team limit (${maxTeams})`
      );
    }

    // Assign supervisor to the team
    team.supervisors.push({
      supervisor: supervisorId,
      role,
      assignedAt: new Date(),
      progressTracking: {
        lastUpdated: new Date(),
        milestones: [
          {
            title: "Project Planning",
            description: "Initial project planning and scope definition",
            status: "not_started",
            progress: 0,
            lastUpdated: new Date(),
          },
          {
            title: "Research Phase",
            description: "Literature review and methodology research",
            status: "not_started",
            progress: 0,
            lastUpdated: new Date(),
          },
          {
            title: "Implementation",
            description: "Development and implementation of the solution",
            status: "not_started",
            progress: 0,
            lastUpdated: new Date(),
          },
          {
            title: "Testing & Validation",
            description: "Testing and validation of the implemented solution",
            status: "not_started",
            progress: 0,
            lastUpdated: new Date(),
          },
          {
            title: "Documentation",
            description: "Project documentation and final report preparation",
            status: "not_started",
            progress: 0,
            lastUpdated: new Date(),
          },
        ],
      },
    });

    await team.save();

    // Update supervisor's teams list
    if (!supervisor.teams.includes(teamId)) {
      supervisor.teams.push(teamId);
      await supervisor.save();
    }

    // Notify team members
    const teamMembers = team.members.map((member) => member.user._id);

    // Create notification for team members
    const notifications = teamMembers.map((memberId) => ({
      user: memberId,
      title: "Supervisor Assigned",
      message: `${supervisor.user.fullName} has been assigned as your ${role} supervisor`,
      type: "supervisor_assignment",
      meta: {
        teamId: team._id,
        teamName: team.name,
        supervisorId: supervisor._id,
        supervisorName: supervisor.user.fullName,
      },
    }));

    await Notification.insertMany(notifications);

    // Create notification for supervisor
    await Notification.create({
      user: supervisor.user._id,
      title: "Team Assignment",
      message: `You have been assigned as ${role} supervisor to team "${team.name}"`,
      type: "team_assignment",
      meta: {
        teamId: team._id,
        teamName: team.name,
      },
    });

    // Log the assignment
    logger.info(`Assigned supervisor to team ${teamId}`, {
      teamId,
      supervisorId,
      role,
    });

    return {
      success: true,
      message: `Supervisor assigned to team as ${role}`,
      data: {
        team: {
          id: team._id,
          name: team.name,
          members: team.members.map((m) => ({
            id: m.user._id,
            name: m.user.fullName,
            email: m.user.email,
          })),
        },
        supervisor: {
          id: supervisor._id,
          name: supervisor.user.fullName,
          email: supervisor.user.email,
        },
        role,
      },
    };
  } catch (error) {
    logger.error("Failed to assign supervisor to team", {
      error,
      teamId: context.params.teamId,
      supervisorId: context.body.supervisorId,
    });
    throw error;
  }
};

/**
 * Update supervisor configuration settings
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Update result
 */
export const updateSupervisorConfiguration = async (context) => {
  try {
    const { params, body } = context;
    const supervisorId = params.id;
    const {
      maxTeams,
      specialization,
      teamAssignmentPreference,
      projectTypePreference,
      adminId,
    } = body;

    // Find the supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate(
      "user",
      "fullName email"
    );
    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Initialize settings object if it doesn't exist
    if (!supervisor.settings) {
      supervisor.settings = {};
    }

    // Update settings with provided values
    const updates = {};

    if (maxTeams !== undefined) {
      // Ensure max teams is a valid number between 1 and 10
      const maxTeamsValue = parseInt(maxTeams);
      if (isNaN(maxTeamsValue) || maxTeamsValue < 1 || maxTeamsValue > 10) {
        throw new ValidationError("Max teams must be between 1 and 10");
      }
      supervisor.settings.maxTeams = maxTeamsValue;
      updates.maxTeams = maxTeamsValue;
    }

    if (specialization !== undefined) {
      supervisor.settings.specialization = specialization;
      updates.specialization = specialization;
    }

    if (teamAssignmentPreference !== undefined) {
      if (!["research", "project", "any"].includes(teamAssignmentPreference)) {
        throw new ValidationError(
          "Team assignment preference must be one of: research, project, any"
        );
      }
      supervisor.settings.teamAssignmentPreference = teamAssignmentPreference;
      updates.teamAssignmentPreference = teamAssignmentPreference;
    }

    if (projectTypePreference !== undefined) {
      if (
        !["software", "hardware", "research", "any"].includes(
          projectTypePreference
        )
      ) {
        throw new ValidationError(
          "Project type preference must be one of: software, hardware, research, any"
        );
      }
      supervisor.settings.projectTypePreference = projectTypePreference;
      updates.projectTypePreference = projectTypePreference;
    }

    // Save the updated supervisor
    await supervisor.save();

    // Create notification for supervisor
    await Notification.create({
      user: supervisor.user._id,
      title: "Configuration Updated",
      message:
        "Your supervisor configuration settings have been updated by an administrator",
      type: "admin_action",
      meta: {
        adminId,
        action: "update_configuration",
        updates,
      },
    });

    // Log the update
    logger.info(`Updated supervisor configuration for ${supervisorId}`, {
      supervisorId,
      adminId,
      updates,
    });

    return {
      success: true,
      message: "Supervisor configuration updated successfully",
      data: {
        settings: supervisor.settings,
      },
    };
  } catch (error) {
    logger.error(`Error updating supervisor configuration: ${error.message}`, {
      error,
      supervisorId,
      adminId,
    });
    throw new Error(
      `Failed to update supervisor configuration: ${error.message}`
    );
  }
};

/**
 * Create an administrative task for a session
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Created task
 */
export const createAdminTask = async (context) => {
  try {
    const { params, body } = context;
    const { sessionId } = params;
    const { title, description, dueDate, category, priority, assignedTo } =
      body;

    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Find session timeline or create one if it doesn't exist
    let timeline = await SessionTimeline.findOne({ session: sessionId });

    if (!timeline) {
      timeline = new SessionTimeline({
        session: sessionId,
        name: `Timeline for ${session.name}`,
        description: `Administrative timeline for the ${session.name} session`,
        tasks: [],
        createdBy: context.jwt.payload.sub,
      });
    }

    // Create the new task
    const newTask = {
      title,
      description,
      dueDate: new Date(dueDate),
      category: category || "administrative",
      status: "pending",
      priority: priority || "medium",
      assignedTo: assignedTo || [],
      createdAt: new Date(),
    };

    // Add task to timeline
    timeline.tasks.push(newTask);

    // Save the timeline
    await timeline.save();

    // Get the newly added task (last item in the array)
    const createdTask = timeline.tasks[timeline.tasks.length - 1];

    // If there are assigned users, create notifications
    if (assignedTo && assignedTo.length > 0) {
      const notifications = assignedTo.map((userId) => ({
        user: userId,
        title: "New Administrative Task",
        message: `You have been assigned a new task: ${title}`,
        type: "task_assignment",
        meta: {
          taskId: createdTask._id,
          sessionId,
          dueDate,
        },
      }));

      await Notification.insertMany(notifications);
    }

    logger.info(`Created admin task for session ${sessionId}`, {
      taskId: createdTask._id,
      sessionId,
      title,
    });

    return {
      success: true,
      message: "Administrative task created successfully",
      data: createdTask,
    };
  } catch (error) {
    logger.error("Failed to create admin task", {
      error,
      sessionId: context.params.sessionId,
    });
    throw error;
  }
};
