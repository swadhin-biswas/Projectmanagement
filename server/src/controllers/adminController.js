// server/src/controllers/adminController.js
import { AdminAnalytics } from "../models/AdminAnalytics.js";
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { Timeline } from "../models/Timeline.js";
import { User } from "../models/User.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
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
        select: "fullName email profilePicture",
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

// Create a new session
export const createSession = async ({ body }) => {
  try {
    const {
      name,
      startDate,
      endDate,
      maxTeamSize = 4,
      minTeamSize = 2,
      allowStudentInitiatedTeams = true,
      allowSupervisorInitiatedProjects = true,
      description,
      academicPrograms,
      departments,
    } = body;

    // Validate session dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new ValidationError("End date must be after start date");
    }

    // Check if there's already an active session
    if (body.status === "active") {
      const activeSession = await Session.findOne({ status: "active" });
      if (activeSession) {
        throw new ValidationError("There is already an active session");
      }
    }

    // Create session
    const session = new Session({
      name,
      startDate: start,
      endDate: end,
      maxTeamSize,
      minTeamSize,
      allowStudentInitiatedTeams,
      allowSupervisorInitiatedProjects,
      description,
      academicPrograms,
      departments,
      status: body.status || "upcoming",
    });

    // Generate standard deadlines based on session duration
    session.generateAllDeadlines();
    // Add standard project types
    session.addProjectTypes();

    await session.save();

    return {
      success: true,
      message: "Session created successfully",
      data: session,
    };
  } catch (error) {
    logger.error("Failed to create session", { error });
    throw error;
  }
};

// Update session
export const updateSession = async ({ params, body }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // If updating to active, check if there's another active session
    if (body.status === "active" && session.status !== "active") {
      const activeSession = await Session.findOne({
        status: "active",
        _id: { $ne: params.id },
      });

      if (activeSession) {
        throw new ValidationError(
          "There is already an active session. Please end it before activating this session."
        );
      }
    }

    // Update fields
    if (body.name) session.name = body.name;
    if (body.description) session.description = body.description;
    if (body.startDate) session.startDate = new Date(body.startDate);
    if (body.endDate) session.endDate = new Date(body.endDate);
    if (body.status) session.status = body.status;
    if (body.deadlines) session.deadlines = body.deadlines;

    await session.save();

    logger.info("Session updated", {
      sessionId: session._id,
      name: session.name,
    });

    return {
      success: true,
      message: "Session updated successfully",
      data: session,
    };
  } catch (error) {
    logger.error("Failed to update session", { error, sessionId: params.id });
    throw error;
  }
};

// Assign supervisor to team
export const assignSupervisor = async ({ params, body }) => {
  try {
    const team = await Team.findById(params.teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    const supervisor = await Supervisor.findById(body.supervisorId);
    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Check if supervisor is already assigned to this team
    const isAlreadyAssigned = team.supervisors.some(
      (s) => s.supervisor.toString() === supervisor._id.toString()
    );
    if (isAlreadyAssigned) {
      throw new ValidationError("Supervisor is already assigned to this team");
    }

    // Add supervisor to team
    team.addSupervisor(supervisor._id);
    await team.save();

    // Add team to supervisor's list
    if (!supervisor.teams.includes(team._id)) {
      supervisor.teams.push(team._id);
      await supervisor.save();
    }

    logger.info("Supervisor assigned to team", {
      teamId: team._id,
      supervisorId: supervisor._id,
    });

    return {
      success: true,
      message: "Supervisor assigned to team successfully",
      data: {
        teamId: team._id,
        teamName: team.name,
        supervisor: {
          id: supervisor._id,
          name: supervisor.user.fullName,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to assign supervisor", {
      error,
      teamId: params.teamId,
      supervisorId: body?.supervisorId,
    });
    throw error;
  }
};

// Alias for assignSupervisor for backward compatibility
export const assignSupervisorToTeam = async ({ params, body }) => {
  try {
    const { teamId } = params;
    const { supervisorIds, sessionId } = body;

    // Validate team exists
    const team = await Team.findById(teamId).populate("session");
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if team belongs to the session
    if (sessionId && team.session._id.toString() !== sessionId) {
      throw new ValidationError(
        "Team does not belong to the specified session"
      );
    }

    // Validate supervisors exist and are approved
    const supervisors = await Supervisor.find({
      _id: { $in: supervisorIds },
      "user.isApproved": true,
    }).populate("user");

    if (supervisors.length !== supervisorIds.length) {
      throw new ValidationError(
        "One or more supervisors are invalid or not approved"
      );
    }

    // Check supervisor capacity
    for (const supervisor of supervisors) {
      const supervisorTeams = await Team.countDocuments({
        "supervisors.supervisor": supervisor._id,
        session: team.session._id,
      });

      if (supervisorTeams >= team.session.supervisorCapacity) {
        throw new ValidationError(
          `Supervisor ${supervisor.user.fullName} has reached maximum team capacity`
        );
      }
    }

    // Add supervisors to team
    const existingSupervisorIds = team.supervisors.map((s) =>
      s.supervisor.toString()
    );
    const newSupervisors = supervisorIds.filter(
      (id) => !existingSupervisorIds.includes(id)
    );

    if (newSupervisors.length === 0) {
      return {
        success: true,
        message: "All specified supervisors are already assigned to this team",
        data: team,
      };
    }

    // Add new supervisors to team
    for (const supervisorId of newSupervisors) {
      team.supervisors.push({
        supervisor: supervisorId,
        assignedAt: new Date(),
        status: "active",
      });

      // Add team to supervisor's teams
      await Supervisor.findByIdAndUpdate(supervisorId, {
        $addToSet: { teams: teamId },
      });

      // Notify team members
      const members = team.members.map((m) => m.user);
      await Notification.insertMany(
        members.map((userId) => ({
          title: "Supervisor Assigned",
          message: `A new supervisor has been assigned to your team ${team.name}.`,
          type: "supervisor_assignment",
          user: userId,
          isRead: false,
          metadata: {
            teamId: team._id,
            supervisorId,
          },
        }))
      );

      // Notify supervisor
      const supervisor = await Supervisor.findById(supervisorId).populate(
        "user"
      );
      if (supervisor && supervisor.user) {
        await Notification.create({
          title: "Team Assignment",
          message: `You have been assigned to supervise team ${team.name}.`,
          type: "team_assignment",
          user: supervisor.user._id,
          isRead: false,
          metadata: {
            teamId: team._id,
          },
        });
      }
    }

    await team.save();

    return {
      success: true,
      message: `${newSupervisors.length} supervisor(s) assigned successfully`,
      data: team,
    };
  } catch (error) {
    logger.error("Failed to assign supervisor to team", { error });
    throw error;
  }
};

// Helper function to calculate session progress
const calculateSessionProgress = (session) => {
  const now = new Date();
  const start = new Date(session.startDate);
  const end = new Date(session.endDate);

  if (now < start) return 0;
  if (now > end) return 100;

  const totalDuration = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / totalDuration) * 100);
};

// Get system overview and analytics
export const getSystemAnalytics = async ({ query }) => {
  try {
    // Get current session or specific session
    let session;
    if (query.sessionId) {
      session = await Session.findById(query.sessionId);
      if (!session) {
        throw new NotFoundError("Session not found");
      }
    } else {
      session = await Session.findOne({ status: "active" });
    }

    // Get all sessions for comparison
    const sessions = await Session.find().sort({ startDate: -1 }).limit(5);

    // Get all users with role counts
    const userCounts = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const roleDistribution = {};
    userCounts.forEach((item) => {
      roleDistribution[item._id] = item.count;
    });

    // Get all supervisors with their loads
    const supervisors = await Supervisor.find()
      .populate("user", "fullName email department isApproved")
      .populate({
        path: "teams",
        match: { session: session?._id },
        select: "name members projects",
      });

    const supervisorAnalytics = supervisors.map((sup) => ({
      _id: sup._id,
      name: sup.user.fullName,
      department: sup.user.department,
      currentLoad: sup.teams.length,
      maxLoad: session?.teamsPerSupervisor || 5,
      studentCount: sup.teams.reduce(
        (acc, team) => acc + team.members.length,
        0
      ),
      projectCount: sup.teams.reduce(
        (acc, team) => acc + (team.projects ? team.projects.length : 0),
        0
      ),
      isApproved: sup.user.isApproved,
    }));

    // Get pending supervisor approvals
    const pendingSupervisors = await User.countDocuments({
      role: "supervisor",
      isApproved: false,
    });

    // Get project type distribution
    const projects = await Project.find(
      session ? { session: session._id } : {}
    );
    const projectTypeStats = projects.reduce((acc, project) => {
      acc[project.type] = (acc[project.type] || 0) + 1;
      return acc;
    }, {});

    // Get project status distribution
    const projectStatusStats = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {});

    // Get team statistics
    const teams = await Team.find(session ? { session: session._id } : {});
    const teamStats = {
      total: teams.length,
      withSupervisor: teams.filter(
        (t) => t.supervisors && t.supervisors.length > 0
      ).length,
      withoutSupervisor: teams.filter(
        (t) => !t.supervisors || t.supervisors.length === 0
      ).length,
      averageSize:
        teams.reduce(
          (acc, team) => acc + (team.members ? team.members.length : 0),
          0
        ) / (teams.length || 1),
      sizeDistribution: {
        1: teams.filter((t) => t.members && t.members.length === 1).length,
        2: teams.filter((t) => t.members && t.members.length === 2).length,
        3: teams.filter((t) => t.members && t.members.length === 3).length,
        4: teams.filter((t) => t.members && t.members.length === 4).length,
      },
    };

    // Get submission statistics with timeline data
    const submissions = [];
    projects.forEach((project) => {
      if (project.submissions && project.submissions.length > 0) {
        project.submissions.forEach((sub) => {
          submissions.push({
            date: sub.submittedAt,
            projectId: project._id,
            projectName: project.name,
            type: sub.submissionType || "default",
          });
        });
      }
    });

    // Group submissions by week for trend analysis
    const submissionTrend = {};
    submissions.forEach((sub) => {
      const date = new Date(sub.date);
      const weekKey = `${date.getFullYear()}-${Math.floor(date.getDate() / 7)}`;
      submissionTrend[weekKey] = (submissionTrend[weekKey] || 0) + 1;
    });

    // Get recent activity for the dashboard
    const recentActivities = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "fullName role")
      .lean();

    // Calculate department distribution
    const departmentStats = await User.aggregate([
      { $match: { role: { $in: ["student", "supervisor"] } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get teams without supervisors for quick assignment
    const teamsWithoutSupervisor = await Team.countDocuments({
      session: session?._id,
      supervisors: { $size: 0 },
    });

    // Get top supervisors by team count
    const topSupervisors = await User.aggregate([
      { $match: { role: "supervisor", isApproved: true } },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "supervisors",
          as: "assignedTeams",
        },
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          department: 1,
          teamsCount: { $size: "$assignedTeams" },
        },
      },
      { $sort: { teamsCount: -1 } },
      { $limit: 10 },
    ]);

    return {
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          _id: s._id,
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate,
          status: s.status,
          progress: calculateSessionProgress(s),
        })),
        currentSession: session
          ? {
              _id: session._id,
              name: session.name,
              startDate: session.startDate,
              endDate: session.endDate,
              status: session.status,
              progress: calculateSessionProgress(session),
              deadlines: session.deadlines.map((d) => ({
                title: d.title,
                dueDate: d.dueDate,
                type: d.type,
                isPast: new Date(d.dueDate) < new Date(),
                daysRemaining: Math.ceil(
                  (new Date(d.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
                ),
              })),
            }
          : null,
        analytics: {
          totalSessions: sessions.length,
          totalSupervisors: roleDistribution.supervisor || 0,
          totalStudents: roleDistribution.student || 0,
          totalTeams: teams.length,
          pendingApprovals: pendingSupervisors,
          projectSubmissions: submissions.length,
          projectsInProgress: projectStatusStats["in_progress"] || 0,
          projectsCompleted: projectStatusStats["completed"] || 0,
          sessionProgress: session ? calculateSessionProgress(session) : 0,
          supervisorAssignmentStats: {
            teamsWithoutSupervisor,
            supervisorDistribution: topSupervisors,
          },
          departmentDistribution: departmentStats,
          projectTypeStats: {
            researchBased: projectTypeStats["research_based"] || 0,
            projectBased: projectTypeStats["project_based"] || 0,
          },
        },
        supervisorStats: {
          total: supervisors.length,
          analytics: supervisorAnalytics,
          pendingApprovals: pendingSupervisors,
        },
        projectStats: {
          total: projects.length,
          byType: projectTypeStats,
          byStatus: projectStatusStats,
          submissionTrend,
        },
        teamStats,
        recentActivities: recentActivities.map((activity) => ({
          _id: activity._id,
          message: activity.message,
          type: activity.type,
          createdAt: activity.createdAt,
          user: activity.user
            ? {
                name: activity.user.fullName,
                role: activity.user.role,
              }
            : null,
        })),
      },
    };
  } catch (error) {
    logger.error("Failed to get system analytics", { error });
    throw error;
  }
};

// Get all supervisors with assignment stats
export const getSupervisors = async ({ query }) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchQuery = { role: "supervisor" };

    // Add filters if provided
    if (query.sessionId) {
      // Filter by specific session
      matchQuery["teams.session"] = query.sessionId;
    }

    // Get supervisors
    const supervisors = await User.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "supervisors",
          localField: "_id",
          foreignField: "user",
          as: "supervisorProfile",
        },
      },
      { $unwind: "$supervisorProfile" },
      {
        $lookup: {
          from: "teams",
          localField: "supervisorProfile.teams",
          foreignField: "_id",
          as: "assignedTeams",
        },
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          department: 1,
          profilePicture: 1,
          specialization: "$supervisorProfile.specialization",
          isApproved: 1,
          status: 1,
          assignedTeamsCount: { $size: "$assignedTeams" },
          studentsCount: {
            $reduce: {
              input: "$assignedTeams",
              initialValue: 0,
              in: { $add: ["$$value", { $size: "$$this.members" }] },
            },
          },
        },
      },
      { $sort: query.sort ? JSON.parse(query.sort) : { fullName: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination
    const totalCount = await User.countDocuments({ role: "supervisor" });

    return {
      success: true,
      data: {
        supervisors,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisors", { error });
    throw error;
  }
};

// Get all students with pagination and filters
export const getStudents = async ({ query }) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base match query
    const matchQuery = { role: "student" };

    // Add filters if provided
    if (query.department) {
      matchQuery.department = query.department;
    }

    if (query.status) {
      matchQuery.status = query.status;
    }

    if (query.hasTeam === "true") {
      // Only get students who have a team
      matchQuery["studentProfile.team"] = { $exists: true, $ne: null };
    } else if (query.hasTeam === "false") {
      // Only get students without a team
      matchQuery["studentProfile.team"] = { $exists: false };
    }

    // Get students
    const students = await User.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "user",
          as: "studentProfile",
        },
      },
      { $unwind: "$studentProfile" },
      {
        $lookup: {
          from: "teams",
          localField: "studentProfile.team",
          foreignField: "_id",
          as: "teamInfo",
        },
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          department: 1,
          profilePicture: 1,
          studentId: "$studentProfile.studentId",
          semester: "$studentProfile.semester",
          batch: "$studentProfile.batch",
          status: 1,
          teamId: { $arrayElemAt: ["$teamInfo._id", 0] },
          teamName: { $arrayElemAt: ["$teamInfo.name", 0] },
          isTeamLeader: "$studentProfile.isTeamLeader",
          skills: "$studentProfile.skills",
        },
      },
      { $sort: query.sort ? JSON.parse(query.sort) : { fullName: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination
    const totalCount = await User.countDocuments({ role: "student" });

    return {
      success: true,
      data: {
        students,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get students", { error });
    throw error;
  }
};

// Get all projects with pagination and filters
export const getProjects = async ({ query }) => {
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

    if (query.type) {
      matchQuery.type = query.type;
    }

    if (query.status) {
      matchQuery.status = query.status;
    }

    if (query.supervisorId) {
      // Get teams supervised by this supervisor
      const supervisor = await Supervisor.findOne({ user: query.supervisorId });
      if (supervisor) {
        const teams = await Team.find({ supervisors: supervisor._id });
        matchQuery.team = { $in: teams.map((team) => team._id) };
      }
    }

    // Get projects
    const projects = await Project.find(matchQuery)
      .populate({
        path: "team",
        select: "name members",
        populate: {
          path: "members",
          select: "user",
          populate: {
            path: "user",
            select: "fullName profilePicture",
          },
        },
      })
      .populate({
        path: "session",
        select: "name startDate endDate",
      })
      .sort(query.sort ? JSON.parse(query.sort) : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Project.countDocuments(matchQuery);

    return {
      success: true,
      data: {
        projects,
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

// Get supervisor performance metrics
export const getSupervisorPerformance = async ({ params }) => {
  try {
    const supervisor = await Supervisor.findById(params.id)
      .populate("user", "fullName email department status")
      .populate({
        path: "assignedTeams",
        select: "name members session status",
        populate: {
          path: "session",
          select: "name startDate endDate status",
        },
      });

    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Collect all the teams supervised by this supervisor
    const teams = supervisor.assignedTeams || [];

    // Get all projects for these teams
    const teamIds = teams.map((team) => team._id);
    const projects = await Project.find({ team: { $in: teamIds } });

    // Collect all student IDs from the teams
    const studentIds = new Set();
    teams.forEach((team) => {
      team.members.forEach((member) => {
        studentIds.add(member.user.toString());
      });
    });

    // Get marking data for students
    const marksData = supervisor.marksGiven || [];

    // Calculate statistics
    const teamCount = teams.length;
    const activeTeamCount = teams.filter((t) => t.status === "active").length;
    const studentCount = studentIds.size;
    const projectCount = projects.length;

    // Calculate marking metrics
    const totalMarksAssigned = marksData.reduce(
      (sum, entry) => sum + entry.marks.length,
      0
    );
    const avgMarksPerStudent =
      studentCount > 0 ? totalMarksAssigned / studentCount : 0;

    // Calculate average scoring
    let totalScore = 0;
    let scoreCount = 0;

    marksData.forEach((entry) => {
      entry.marks.forEach((mark) => {
        totalScore += mark.score;
        scoreCount++;
      });
    });

    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

    // Calculate progress tracking metrics
    const progressTrackingFrequency = supervisor.progressTracking
      ? {
          studentTracking: (
            supervisor.progressTracking.trackedStudents || []
          ).reduce((sum, ts) => sum + (ts.progressNotes?.length || 0), 0),
          teamTracking: (supervisor.progressTracking.trackedTeams || []).reduce(
            (sum, tt) => sum + (tt.progressNotes?.length || 0),
            0
          ),
        }
      : { studentTracking: 0, teamTracking: 0 };

    // Calculate meeting frequency
    const meetingCount = supervisor.scheduledMeetings?.length || 0;
    const meetingsPerTeam = teamCount > 0 ? meetingCount / teamCount : 0;

    // Get recent activity stats
    const recentActivity = supervisor.recentActivity || [];
    const activityByType = recentActivity.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        supervisor: {
          _id: supervisor._id,
          user: supervisor.user,
          specialization: supervisor.specialization,
          supervisorId: supervisor.supervisorId,
        },
        performance: {
          teamManagement: {
            totalTeams: teamCount,
            activeTeams: activeTeamCount,
            totalStudents: studentCount,
            studentsPerTeam: teamCount > 0 ? studentCount / teamCount : 0,
          },
          assessmentMetrics: {
            totalMarksAssigned,
            avgMarksPerStudent,
            avgScore,
            assessmentDistribution: marksData.reduce((acc, entry) => {
              entry.marks.forEach((mark) => {
                acc[mark.type] = (acc[mark.type] || 0) + 1;
              });
              return acc;
            }, {}),
          },
          progressTracking: {
            studentProgressUpdates: progressTrackingFrequency.studentTracking,
            teamProgressUpdates: progressTrackingFrequency.teamTracking,
            updatesPerTeam:
              teamCount > 0
                ? (progressTrackingFrequency.studentTracking +
                    progressTrackingFrequency.teamTracking) /
                  teamCount
                : 0,
          },
          engagement: {
            totalMeetings: meetingCount,
            meetingsPerTeam,
            activityBreakdown: activityByType,
            mostFrequentActivity:
              Object.entries(activityByType).sort(
                (a, b) => b[1] - a[1]
              )[0]?.[0] || "none",
          },
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor performance", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Supervise a supervisor - update their configuration
export const updateSupervisorConfiguration = async ({ params, body }) => {
  try {
    const supervisor = await Supervisor.findById(params.id);

    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Update configuration fields as provided
    if (body.maxTeams !== undefined) {
      supervisor.maxTeams = body.maxTeams;
    }

    if (body.specialization) {
      supervisor.specialization = body.specialization;
    }

    if (body.teamAssignmentPreference) {
      supervisor.preferences = {
        ...(supervisor.preferences || {}),
        teamAssignment: body.teamAssignmentPreference,
      };
    }

    if (body.projectTypePreference) {
      supervisor.preferences = {
        ...(supervisor.preferences || {}),
        projectType: body.projectTypePreference,
      };
    }

    await supervisor.save();

    logger.info("Supervisor configuration updated", {
      supervisorId: supervisor._id,
      updatedBy: body.adminId,
    });

    return {
      success: true,
      message: "Supervisor configuration updated successfully",
      data: {
        supervisorId: supervisor._id,
        updatedFields: Object.keys(body).filter((k) => k !== "adminId"),
      },
    };
  } catch (error) {
    logger.error("Failed to update supervisor configuration", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Get supervisor activity log
export const getSupervisorActivity = async ({ params, query }) => {
  try {
    const supervisor = await Supervisor.findById(params.id).populate(
      "user",
      "fullName email"
    );

    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    const limit = parseInt(query.limit) || 50;

    // Get recent activity
    const recentActivity = (supervisor.recentActivity || [])
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    // Get related entity details where needed
    const activityWithDetails = [];

    for (const activity of recentActivity) {
      let entityDetails = null;

      if (activity.relatedTo && activity.relatedModel) {
        try {
          switch (activity.relatedModel) {
            case "Student":
              const student = await Student.findById(
                activity.relatedTo
              ).populate("user", "fullName");
              if (student) {
                entityDetails = {
                  name: student.user.fullName,
                  id: student._id,
                };
              }
              break;
            case "Team":
              const team = await Team.findById(activity.relatedTo);
              if (team) {
                entityDetails = {
                  name: team.name,
                  id: team._id,
                };
              }
              break;
            case "Project":
              const project = await Project.findById(activity.relatedTo);
              if (project) {
                entityDetails = {
                  name: project.title,
                  id: project._id,
                };
              }
              break;
          }
        } catch (err) {
          logger.warn("Failed to get entity details for activity", {
            error: err,
            activityId: activity._id,
          });
        }
      }

      activityWithDetails.push({
        ...activity.toObject(),
        entityDetails,
      });
    }

    return {
      success: true,
      data: {
        supervisor: {
          _id: supervisor._id,
          name: supervisor.user.fullName,
          email: supervisor.user.email,
        },
        activities: activityWithDetails,
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor activity", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Verify progress tracking done by a supervisor
export const verifySupervisorProgressTracking = async ({ params }) => {
  try {
    const supervisor = await Supervisor.findById(params.id).populate(
      "user",
      "fullName"
    );

    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Get all progress tracking data
    const studentProgressTracking =
      supervisor.progressTracking?.trackedStudents || [];
    const teamProgressTracking =
      supervisor.progressTracking?.trackedTeams || [];

    // Get all teams supervised by this supervisor
    const teams = await Team.find({
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "active",
    }).populate({
      path: "members.user",
      select: "fullName",
    });

    // Create a map of studentId -> studentName for easier lookup
    const studentMap = {};
    teams.forEach((team) => {
      team.members.forEach((member) => {
        if (member.status === "active") {
          studentMap[member.user._id.toString()] = {
            name: member.user.fullName,
            team: {
              id: team._id,
              name: team.name,
            },
          };
        }
      });
    });

    // Create a map of teamId -> teamName for easier lookup
    const teamMap = {};
    teams.forEach((team) => {
      teamMap[team._id.toString()] = {
        name: team.name,
        memberCount: team.members.filter((m) => m.status === "active").length,
      };
    });

    // Analyze student progress tracking
    const studentTracking = studentProgressTracking.map((tracked) => {
      const studentId = tracked.student.toString();
      const student = studentMap[studentId];

      return {
        studentId,
        studentName: student?.name || "Unknown Student",
        team: student?.team || null,
        lastUpdated: tracked.lastUpdated,
        trackingCount: tracked.progressNotes?.length || 0,
        latestStatus:
          tracked.progressNotes?.length > 0
            ? tracked.progressNotes[tracked.progressNotes.length - 1].status
            : null,
        latestProgress:
          tracked.progressNotes?.length > 0
            ? tracked.progressNotes[tracked.progressNotes.length - 1]
                .progressPercentage
            : null,
      };
    });

    // Analyze team progress tracking
    const teamTracking = teamProgressTracking.map((tracked) => {
      const teamId = tracked.team.toString();
      const team = teamMap[teamId];

      return {
        teamId,
        teamName: team?.name || "Unknown Team",
        memberCount: team?.memberCount || 0,
        lastUpdated: tracked.lastUpdated,
        trackingCount: tracked.progressNotes?.length || 0,
        latestDynamics:
          tracked.progressNotes?.length > 0
            ? tracked.progressNotes[tracked.progressNotes.length - 1]
                .teamDynamics
            : null,
        latestProgress:
          tracked.progressNotes?.length > 0
            ? tracked.progressNotes[tracked.progressNotes.length - 1]
                .overallProgress
            : null,
      };
    });

    // Identify students without tracking
    const studentsWithoutTracking = Object.entries(studentMap)
      .filter(
        ([studentId]) =>
          !studentProgressTracking.some(
            (t) => t.student.toString() === studentId
          )
      )
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.name,
        team: data.team,
      }));

    // Identify teams without tracking
    const teamsWithoutTracking = Object.entries(teamMap)
      .filter(
        ([teamId]) =>
          !teamProgressTracking.some((t) => t.team.toString() === teamId)
      )
      .map(([teamId, data]) => ({
        teamId,
        teamName: data.name,
        memberCount: data.memberCount,
      }));

    return {
      success: true,
      data: {
        supervisor: {
          _id: supervisor._id,
          name: supervisor.user.fullName,
        },
        trackingMetrics: {
          studentTracking: {
            tracked: studentTracking.length,
            total: Object.keys(studentMap).length,
            trackingPercentage:
              Object.keys(studentMap).length > 0
                ? (studentTracking.length / Object.keys(studentMap).length) *
                  100
                : 0,
          },
          teamTracking: {
            tracked: teamTracking.length,
            total: Object.keys(teamMap).length,
            trackingPercentage:
              Object.keys(teamMap).length > 0
                ? (teamTracking.length / Object.keys(teamMap).length) * 100
                : 0,
          },
        },
        studentTrackingDetails: studentTracking,
        teamTrackingDetails: teamTracking,
        gaps: {
          studentsWithoutTracking,
          teamsWithoutTracking,
        },
        recommendations: [
          ...(studentsWithoutTracking.length > 0
            ? ["Set up progress tracking for students without monitoring"]
            : []),
          ...(teamsWithoutTracking.length > 0
            ? ["Set up progress tracking for teams without monitoring"]
            : []),
          studentTracking.filter(
            (st) =>
              !st.lastUpdated ||
              new Date(st.lastUpdated) <
                new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          ).length > 0
            ? ["Update progress for students not updated in the last two weeks"]
            : [],
          teamTracking.filter(
            (tt) =>
              !tt.lastUpdated ||
              new Date(tt.lastUpdated) <
                new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          ).length > 0
            ? ["Update progress for teams not updated in the last two weeks"]
            : [],
        ],
      },
    };
  } catch (error) {
    logger.error("Failed to verify supervisor progress tracking", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Review supervisor marking activity
export const reviewSupervisorMarkingActivity = async ({ params }) => {
  try {
    const supervisor = await Supervisor.findById(params.id).populate(
      "user",
      "fullName"
    );

    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    // Get marking data
    const markingData = supervisor.marksGiven || [];

    // Get supervised students with teams
    const teams = await Team.find({
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "active",
    }).populate({
      path: "members.user",
      select: "fullName",
    });

    // Create a map of studentId -> studentName and team for easier lookup
    const studentMap = {};
    teams.forEach((team) => {
      team.members.forEach((member) => {
        if (member.status === "active") {
          studentMap[member.user._id.toString()] = {
            name: member.user.fullName,
            team: {
              id: team._id,
              name: team.name,
            },
          };
        }
      });
    });

    // Analyze marking activity
    const markingAnalysis = markingData.map((marking) => {
      const studentId = marking.student.toString();
      const student = studentMap[studentId];

      return {
        studentId,
        studentName: student?.name || "Unknown Student",
        team: student?.team || null,
        markCount: marking.marks?.length || 0,
        markingTypes: marking.marks?.map((m) => m.type) || [],
        averageScore:
          marking.marks?.length > 0
            ? marking.marks.reduce((sum, m) => sum + m.score, 0) /
              marking.marks.length
            : null,
        lastMarkedDate:
          marking.marks?.length > 0
            ? marking.marks[marking.marks.length - 1].date
            : null,
        hasFeedback:
          marking.marks?.some((m) => m.feedback?.length > 0) || false,
      };
    });

    // Identify students without marking
    const studentsWithoutMarking = Object.entries(studentMap)
      .filter(
        ([studentId]) =>
          !markingData.some((m) => m.student.toString() === studentId)
      )
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.name,
        team: data.team,
      }));

    // Calculate statistics
    const totalMarks = markingData.reduce(
      (sum, m) => sum + (m.marks?.length || 0),
      0
    );
    const studentsWithMarks = markingData.length;
    const totalStudents = Object.keys(studentMap).length;

    // Generate quality metrics
    const marksWithFeedback = markingData.reduce((sum, m) => {
      return (
        sum +
        (m.marks?.filter((mark) => mark.feedback?.length > 0)?.length || 0)
      );
    }, 0);

    const marksWithBreakdown = markingData.reduce((sum, m) => {
      return (
        sum +
        (m.marks?.filter(
          (mark) => mark.breakdown && Object.keys(mark.breakdown).length > 0
        )?.length || 0)
      );
    }, 0);

    return {
      success: true,
      data: {
        supervisor: {
          _id: supervisor._id,
          name: supervisor.user.fullName,
        },
        markingMetrics: {
          totalMarks,
          studentsWithMarks,
          totalStudents,
          markingCoverage:
            totalStudents > 0 ? (studentsWithMarks / totalStudents) * 100 : 0,
          marksPerStudent:
            studentsWithMarks > 0 ? totalMarks / studentsWithMarks : 0,
          qualityMetrics: {
            percentWithFeedback:
              totalMarks > 0 ? (marksWithFeedback / totalMarks) * 100 : 0,
            percentWithBreakdown:
              totalMarks > 0 ? (marksWithBreakdown / totalMarks) * 100 : 0,
          },
        },
        markingDetails: markingAnalysis,
        gaps: {
          studentsWithoutMarking,
          incompleteCategories: markingAnalysis
            .filter((m) => !m.markingTypes.includes("overall"))
            .map((m) => ({
              studentId: m.studentId,
              studentName: m.studentName,
              team: m.team,
              missingCategories: [
                "proposal",
                "progress",
                "final",
                "presentation",
                "overall",
              ].filter((t) => !m.markingTypes.includes(t)),
            })),
        },
        recommendations: [
          ...(studentsWithoutMarking.length > 0
            ? ["Provide marks for students without any assessments"]
            : []),
          marksWithFeedback / totalMarks < 0.8
            ? ["Increase the amount of written feedback provided with marks"]
            : [],
          markingAnalysis.filter((m) => !m.markingTypes.includes("overall"))
            .length > 0
            ? ["Ensure all students have an overall assessment"]
            : [],
        ],
      },
    };
  } catch (error) {
    logger.error("Failed to review supervisor marking activity", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Fix missing or incomplete supervisor functionality
export const fixSupervisorFunctionality = async ({ params, body }) => {
  try {
    const supervisor = await Supervisor.findById(params.id).populate(
      "user",
      "fullName email"
    );

    if (!supervisor) {
      throw new NotFoundError("Supervisor not found");
    }

    const { action } = body;

    switch (action) {
      case "initialize_progress_tracking": {
        // Set up progress tracking for all students and teams
        const teams = await Team.find({
          "supervisors.supervisor": supervisor._id,
          "supervisors.status": "active",
        }).populate({
          path: "members.user",
          select: "fullName",
        });

        // Initialize progress tracking
        if (!supervisor.progressTracking) {
          supervisor.progressTracking = {
            trackedStudents: [],
            trackedTeams: [],
          };
        }

        // Initialize team tracking
        for (const team of teams) {
          const existingTeamTracking =
            supervisor.progressTracking.trackedTeams.find(
              (tt) => tt.team.toString() === team._id.toString()
            );

          if (!existingTeamTracking) {
            supervisor.progressTracking.trackedTeams.push({
              team: team._id,
              progressNotes: [
                {
                  note: "Initial progress tracking set up by admin",
                  date: new Date(),
                  overallProgress: 0,
                  teamDynamics: "good",
                  concerns: [],
                  achievements: [],
                },
              ],
              lastUpdated: new Date(),
            });
          }

          // Initialize student tracking
          for (const member of team.members) {
            if (member.status === "active") {
              const existingStudentTracking =
                supervisor.progressTracking.trackedStudents.find(
                  (ts) => ts.student.toString() === member.user._id.toString()
                );

              if (!existingStudentTracking) {
                supervisor.progressTracking.trackedStudents.push({
                  student: member.user._id,
                  progressNotes: [
                    {
                      note: "Initial progress tracking set up by admin",
                      date: new Date(),
                      progressPercentage: 0,
                      status: "on_track",
                      milestones: [],
                    },
                  ],
                  lastUpdated: new Date(),
                });
              }
            }
          }
        }

        await supervisor.save();

        return {
          success: true,
          message: "Progress tracking initialized for all students and teams",
          data: {
            teamsTracked: supervisor.progressTracking.trackedTeams.length,
            studentsTracked: supervisor.progressTracking.trackedStudents.length,
          },
        };
      }

      case "fix_missing_marks": {
        // Identify and add placeholder marks for students without any
        const teams = await Team.find({
          "supervisors.supervisor": supervisor._id,
          "supervisors.status": "active",
        });

        const studentIds = new Set();
        teams.forEach((team) => {
          team.members.forEach((member) => {
            if (member.status === "active") {
              studentIds.add(member.user.toString());
            }
          });
        });

        // Get all projects
        const projects = await Project.find({
          team: { $in: teams.map((t) => t._id) },
        });
        const projectMap = {};
        projects.forEach((project) => {
          projectMap[project.team.toString()] = project._id;
        });

        let fixedCount = 0;

        // Check each student
        for (const studentId of studentIds) {
          const studentTeam = teams.find((team) =>
            team.members.some((m) => m.user.toString() === studentId)
          );

          if (studentTeam && projectMap[studentTeam._id.toString()]) {
            const projectId = projectMap[studentTeam._id.toString()];

            // Check if student has marks
            const hasMarks = supervisor.marksGiven.some(
              (m) => m.student.toString() === studentId
            );

            if (!hasMarks) {
              // Add placeholder mark
              supervisor.marksGiven.push({
                student: studentId,
                project: projectId,
                marks: [
                  {
                    type: "progress",
                    score: 70, // Default placeholder score
                    feedback:
                      "Initial assessment created by admin. Please update with actual assessment.",
                    date: new Date(),
                  },
                ],
              });

              fixedCount++;
            }
          }
        }

        await supervisor.save();

        return {
          success: true,
          message: `Added placeholder marks for ${fixedCount} students without assessments`,
          data: {
            studentsFixed: fixedCount,
          },
        };
      }

      case "add_meeting_template": {
        // Add template meetings for teams without scheduled meetings
        const teams = await Team.find({
          "supervisors.supervisor": supervisor._id,
          "supervisors.status": "active",
        }).select("_id name");

        if (!supervisor.scheduledMeetings) {
          supervisor.scheduledMeetings = [];
        }

        let addedCount = 0;

        // For each team, check if there's a meeting
        for (const team of teams) {
          const hasTeamMeeting = supervisor.scheduledMeetings.some(
            (m) =>
              m.entityType === "Team" &&
              m.entityId.toString() === team._id.toString()
          );

          if (!hasTeamMeeting) {
            // Schedule a template weekly meeting
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(10, 0, 0, 0); // 10 AM

            supervisor.scheduledMeetings.push({
              title: `Weekly Progress Meeting with ${team.name}`,
              description: "Regular weekly progress review meeting",
              withEntity: "team",
              entityId: team._id,
              entityType: "Team",
              date: nextWeek,
              duration: 60,
              location: "Online",
              meetingLink: "https://meet.google.com/",
              agenda: [
                "Progress review",
                "Address challenges",
                "Set goals for next week",
              ],
              isRecurring: true,
              recurringPattern: {
                frequency: "weekly",
                endDate: new Date(
                  nextWeek.getTime() + 60 * 24 * 60 * 60 * 1000
                ), // 60 days
              },
              reminderSent: false,
            });

            addedCount++;
          }
        }

        await supervisor.save();

        return {
          success: true,
          message: `Added template meetings for ${addedCount} teams`,
          data: {
            teamsWithNewMeetings: addedCount,
            totalScheduledMeetings: supervisor.scheduledMeetings.length,
          },
        };
      }

      default:
        throw new ValidationError(`Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error("Failed to fix supervisor functionality", {
      error,
      supervisorId: params.id,
      action: body.action,
    });
    throw error;
  }
};

// Process supervisor approval
export const processSupervisorApproval = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findById(params.id).populate(
      "user",
      "fullName email department"
    );

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Validate admin privileges
    const admin = await User.findById(user.id);
    if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
      throw new ForbiddenError("Only administrators can approve supervisors");
    }

    if (body.action === "approve") {
      // Update supervisor status
      await User.findByIdAndUpdate(supervisor.user._id, {
        status: "active",
        isApproved: true,
      });

      // Send approval notification
      const notification = {
        type: "account_approved",
        message: "Your supervisor account has been approved",
        details: {
          approvedBy: admin.fullName,
          department: supervisor.user.department,
        },
      };

      if (!supervisor.notifications) {
        supervisor.notifications = [];
      }
      supervisor.notifications.push(notification);

      // Send approval email
      await sendEmail({
        to: supervisor.user.email,
        subject: "Supervisor Account Approved",
        template: "supervisorApproval",
        context: {
          name: supervisor.user.fullName,
          loginUrl: `${process.env.CLIENT_URL}/login`,
        },
      });

      await supervisor.save();

      return {
        success: true,
        message: "Supervisor approved successfully",
        data: {
          supervisorId: supervisor._id,
          email: supervisor.user.email,
          approvedBy: admin.fullName,
          approvedAt: new Date(),
        },
      };
    } else if (body.action === "reject") {
      // Send rejection notification
      await sendEmail({
        to: supervisor.user.email,
        subject: "Supervisor Account Application Status",
        template: "supervisorRejection",
        context: {
          name: supervisor.user.fullName,
          reason: body.reason || "Does not meet current requirements",
        },
      });

      // Delete supervisor account
      await User.findByIdAndDelete(supervisor.user._id);
      await Supervisor.findByIdAndDelete(supervisor._id);

      return {
        success: true,
        message: "Supervisor application rejected",
        data: {
          email: supervisor.user.email,
          rejectedBy: admin.fullName,
          rejectedAt: new Date(),
        },
      };
    }

    throw new ValidationError("Invalid action specified");
  } catch (error) {
    logger.error("Failed to process supervisor approval", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Get detailed admin analytics
export const getDetailedAnalytics = async ({ query }) => {
  try {
    const session = query.sessionId
      ? await Session.findById(query.sessionId)
      : await Session.findOne({ status: "active" });

    if (!session) {
      throw new NotFoundError("No active or specified session found");
    }

    // Get all teams in session
    const teams = await Team.find({ session: session._id })
      .populate("members.user", "fullName department")
      .populate("supervisors.supervisor");

    // Get all projects in session
    const projects = await Project.find({ session: session._id });

    // Calculate analytics
    const analytics = {
      session: {
        name: session.name,
        startDate: session.startDate,
        endDate: session.endDate,
        progress: calculateSessionProgress(session),
        status: session.status,
      },
      teams: {
        total: teams.length,
        withSupervisor: teams.filter((t) => t.supervisors.length > 0).length,
        withoutSupervisor: teams.filter((t) => t.supervisors.length === 0)
          .length,
        sizeDistribution: {
          size1: teams.filter((t) => t.members.length === 1).length,
          size2: teams.filter((t) => t.members.length === 2).length,
          size3: teams.filter((t) => t.members.length === 3).length,
          size4: teams.filter((t) => t.members.length === 4).length,
        },
      },
      projects: {
        total: projects.length,
        typeDistribution: projects.reduce((acc, p) => {
          acc[p.type] = (acc[p.type] || 0) + 1;
          return acc;
        }, {}),
        statusDistribution: projects.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
      },
      supervisors: {
        total: await Supervisor.countDocuments(),
        pending: await User.countDocuments({
          role: "supervisor",
          isApproved: false,
        }),
        active: await User.countDocuments({
          role: "supervisor",
          isApproved: true,
          status: "active",
        }),
        workloadDistribution: await getWorkloadDistribution(),
      },
      deadlines: session.deadlines.map((d) => ({
        ...d.toObject(),
        isPast: new Date() > new Date(d.dueDate),
        daysRemaining: Math.max(
          0,
          Math.ceil((new Date(d.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
        ),
      })),
    };

    return {
      success: true,
      data: analytics,
    };
  } catch (error) {
    logger.error("Failed to get detailed analytics", { error });
    throw error;
  }
};

// Helper function to get supervisor workload distribution
const getWorkloadDistribution = async () => {
  const supervisors = await Supervisor.find()
    .populate("user", "fullName department")
    .populate("teams");

  return supervisors.map((s) => ({
    _id: s._id,
    name: s.user.fullName,
    department: s.user.department,
    teamCount: s.teams.length,
    studentCount: s.teams.reduce(
      (acc, t) => acc + t.members.filter((m) => m.status === "active").length,
      0
    ),
    projectTypes: s.teams.reduce((acc, t) => {
      if (t.project) {
        acc[t.project.type] = (acc[t.project.type] || 0) + 1;
      }
      return acc;
    }, {}),
  }));
};

// Enhanced: Create a timeline for sessions
export const createSessionTimeline = async ({ params, body, user }) => {
  try {
    const { sessionId } = params;
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Create timeline
    const timeline = new Timeline({
      session: sessionId,
      name: body.name || `${session.name} Timeline`,
      description: body.description || `Timeline for ${session.name}`,
      startDate: body.startDate || session.startDate,
      endDate: body.endDate || session.endDate,
      createdBy: user._id,
      scope: body.scope || "global",
      targetDepartments: body.targetDepartments || [],
      targetTeams: body.targetTeams || [],
      targetUsers: body.targetUsers || [],
    });

    // Add timeline segments
    if (body.segments && Array.isArray(body.segments)) {
      timeline.segments = body.segments;
    } else {
      // Create default segments based on session
      const sessionDuration = session.endDate - session.startDate;
      const segmentDuration = Math.floor(sessionDuration / 3); // 3 default segments

      // Setup phase
      timeline.segments.push({
        name: "Setup Phase",
        description: "Initial setup and team formation",
        startDate: new Date(session.startDate),
        endDate: new Date(session.startDate.getTime() + segmentDuration),
        color: "#3498db",
        importance: 7,
        tasks: [
          {
            title: "Team Formation",
            description: "Form teams for the session",
            startDate: new Date(session.startDate),
            dueDate: new Date(
              session.startDate.getTime() + segmentDuration / 3
            ),
            assignedTo: "students",
            priority: "high",
            createdBy: user._id,
          },
          {
            title: "Supervisor Assignment",
            description: "Assign supervisors to teams",
            startDate: new Date(
              session.startDate.getTime() + segmentDuration / 3
            ),
            dueDate: new Date(
              session.startDate.getTime() + segmentDuration / 2
            ),
            assignedTo: "admins",
            priority: "high",
            createdBy: user._id,
          },
        ],
      });

      // Development phase
      timeline.segments.push({
        name: "Development Phase",
        description: "Main project development period",
        startDate: new Date(session.startDate.getTime() + segmentDuration),
        endDate: new Date(session.startDate.getTime() + segmentDuration * 2),
        color: "#2ecc71",
        importance: 10,
        tasks: [
          {
            title: "Progress Report",
            description: "Submit progress report",
            startDate: new Date(session.startDate.getTime() + segmentDuration),
            dueDate: new Date(
              session.startDate.getTime() +
                segmentDuration +
                segmentDuration / 2
            ),
            assignedTo: "students",
            priority: "medium",
            createdBy: user._id,
          },
        ],
      });

      // Final phase
      timeline.segments.push({
        name: "Final Phase",
        description: "Project completion and evaluation",
        startDate: new Date(session.startDate.getTime() + segmentDuration * 2),
        endDate: new Date(session.endDate),
        color: "#e74c3c",
        importance: 9,
        tasks: [
          {
            title: "Final Submission",
            description: "Submit final project",
            startDate: new Date(
              session.startDate.getTime() + segmentDuration * 2
            ),
            dueDate: new Date(session.endDate.getTime() - segmentDuration / 4),
            assignedTo: "students",
            priority: "critical",
            createdBy: user._id,
          },
          {
            title: "Evaluation",
            description: "Evaluate submitted projects",
            startDate: new Date(
              session.endDate.getTime() - segmentDuration / 4
            ),
            dueDate: new Date(session.endDate),
            assignedTo: "supervisors",
            priority: "high",
            createdBy: user._id,
          },
        ],
      });
    }

    await timeline.save();

    return {
      success: true,
      message: "Timeline created successfully",
      data: timeline,
    };
  } catch (error) {
    logger.error("Failed to create session timeline", { error });
    throw error;
  }
};

// Enhanced: Get session timeline
export const getSessionTimeline = async ({ params, query }) => {
  try {
    const { sessionId } = params;

    const timeline = await Timeline.findOne({
      session: sessionId,
      scope: query.scope || "global",
    })
      .populate("createdBy", "fullName email")
      .lean();

    if (!timeline) {
      return {
        success: false,
        message: "No timeline found for this session",
      };
    }

    // Calculate the progress for the timeline on-the-fly
    let totalProgress = 0;
    let weightSum = 0;

    for (const segment of timeline.segments) {
      let segmentProgress = 0;

      if (segment.tasks && segment.tasks.length > 0) {
        let taskProgressSum = 0;
        segment.tasks.forEach((task) => {
          taskProgressSum += task.progress;
        });
        segmentProgress = Math.round(taskProgressSum / segment.tasks.length);
      }

      segment.progress = segmentProgress;
      totalProgress += segmentProgress * segment.importance;
      weightSum += segment.importance;
    }

    const overallProgress =
      weightSum > 0 ? Math.round(totalProgress / weightSum) : 0;

    return {
      success: true,
      data: {
        ...timeline,
        overallProgress,
      },
    };
  } catch (error) {
    logger.error("Failed to get session timeline", { error });
    throw error;
  }
};

// Enhanced: Update timeline task
export const updateTimelineTask = async ({ params, body }) => {
  try {
    const { timelineId, segmentId, taskId } = params;

    const timeline = await Timeline.findById(timelineId);
    if (!timeline) {
      throw new NotFoundError("Timeline not found");
    }

    const segment = timeline.segments.id(segmentId);
    if (!segment) {
      throw new NotFoundError("Timeline segment not found");
    }

    const task = segment.tasks.id(taskId);
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    // Update task fields
    Object.keys(body).forEach((key) => {
      if (key !== "_id" && key !== "createdAt" && key !== "updatedAt") {
        task[key] = body[key];
      }
    });

    task.lastUpdated = new Date();

    // Recalculate progress after update
    if (body.status === "completed") {
      task.progress = 100;
    }

    await timeline.save();

    // If task is updated, check if notifications need to be sent
    if (
      task.status === "delayed" ||
      (body.priority === "critical" && task.status !== "completed")
    ) {
      // Create notifications for relevant users
      const session = await Session.findById(timeline.session);

      // Determine notification recipients based on assignedTo
      let userIds = [];

      if (task.targetUsers && task.targetUsers.length > 0) {
        userIds = task.targetUsers;
      } else if (task.targetTeams && task.targetTeams.length > 0) {
        // Get all members from targeted teams
        const teams = await Team.find({
          _id: { $in: task.targetTeams },
          session: timeline.session,
        });

        teams.forEach((team) => {
          team.members.forEach((member) => {
            userIds.push(member.user);
          });
        });
      } else {
        // Based on general assignedTo
        const roleMap = {
          students: "student",
          supervisors: "supervisor",
          admins: "admin",
        };

        if (task.assignedTo !== "all") {
          const role = roleMap[task.assignedTo];
          const users = await User.find({
            role,
            status: "active",
          });
          userIds = users.map((u) => u._id);
        }
      }

      // Create notifications
      const notifications = userIds.map((userId) => ({
        title:
          task.status === "delayed" ? "Task Delayed" : "Critical Task Update",
        message: `Task "${task.title}" in ${segment.name} has been updated. Status: ${task.status}, Priority: ${task.priority}`,
        type: "task_update",
        user: userId,
        isRead: false,
        metadata: {
          timelineId: timeline._id,
          segmentId: segment._id,
          taskId: task._id,
          sessionId: timeline.session,
        },
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    return {
      success: true,
      message: "Task updated successfully",
      data: task,
    };
  } catch (error) {
    logger.error("Failed to update timeline task", { error });
    throw error;
  }
};

// Enhanced: Get session analytics
export const getSessionAnalytics = async ({ params, query }) => {
  try {
    const { sessionId } = params;
    const timeRange = query.timeRange || "month"; // week, month, semester
    const groupBy = query.groupBy || "day"; // day, week, month

    // Validate session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Get the most recent analytics data
    const latestAnalytics = await AdminAnalytics.findOne({
      session: sessionId,
    }).sort({ date: -1 });

    // Get aggregated metrics for trends
    const startDate = new Date();
    let endDate = new Date();

    switch (timeRange) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "semester":
        startDate.setTime(session.startDate.getTime());
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const analyticsData = await AdminAnalytics.getAggregatedMetrics(
      sessionId,
      startDate,
      endDate,
      groupBy
    );

    // Get performance metrics
    const performanceMetrics = await AdminAnalytics.getPerformanceMetrics(
      sessionId,
      timeRange
    );

    // Get detailed data about supervision
    const supervisorData = await Supervisor.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "supervisors.supervisor",
          as: "supervisedTeams",
        },
      },
      {
        $project: {
          _id: 1,
          name: "$userDetails.fullName",
          email: "$userDetails.email",
          department: "$userDetails.department",
          teamsCount: { $size: "$supervisedTeams" },
          studentsCount: { $size: "$students" },
          responseRate: { $ifNull: ["$metrics.responseRate", 0] },
          avgResponseTime: { $ifNull: ["$metrics.avgResponseTime", 0] },
        },
      },
      { $sort: { teamsCount: -1 } },
    ]);

    // Get student progress statistics
    const studentProgress = await Team.aggregate([
      { $match: { session: mongoose.Types.ObjectId(sessionId) } },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      {
        $unwind: { path: "$projectDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgProgress: { $avg: { $ifNull: ["$projectDetails.progress", 0] } },
        },
      },
    ]);

    // Get teams without supervisors
    const teamsWithoutSupervisor = await Team.countDocuments({
      session: sessionId,
      "supervisors.0": { $exists: false },
    });

    return {
      success: true,
      data: {
        overview: latestAnalytics
          ? {
              students: latestAnalytics.studentMetrics.totalRegistered,
              supervisors: latestAnalytics.supervisorMetrics.totalActive,
              teams: latestAnalytics.teamMetrics.totalActive,
              averageProgress: latestAnalytics.studentMetrics.averageProgress,
              atRiskTeams: latestAnalytics.teamMetrics.atRiskPercentage,
            }
          : null,
        trends: analyticsData,
        performance: performanceMetrics,
        supervision: {
          supervisors: supervisorData,
          teamsWithoutSupervisor,
          pendingSupervisors: await User.countDocuments({
            role: "supervisor",
            isApproved: false,
          }),
        },
        teamProgress: studentProgress,
        timeline: {
          deadlines: await Timeline.findOne({ session: sessionId }).then(
            (timeline) => (timeline ? timeline.getUpcomingTasks(30) : [])
          ),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get session analytics", { error });
    throw error;
  }
};

// Enhanced: Create administrative task
export const createAdminTask = async ({ body, user }) => {
  try {
    const {
      sessionId,
      title,
      description,
      startDate,
      dueDate,
      assignedTo,
      targetUsers,
      targetTeams,
      priority,
    } = body;

    // Validate session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Find or create timeline
    let timeline = await Timeline.findOne({ session: sessionId });
    if (!timeline) {
      // Create a new timeline
      timeline = new Timeline({
        session: sessionId,
        name: `${session.name} Timeline`,
        description: `Administrative timeline for ${session.name}`,
        startDate: session.startDate,
        endDate: session.endDate,
        createdBy: user._id,
        segments: [
          {
            name: "Administrative Tasks",
            description: "Tasks created by administrators",
            startDate: session.startDate,
            endDate: session.endDate,
            color: "#3498db",
          },
        ],
      });
    }

    // Find the appropriate segment or use the first one
    let segment;
    const now = new Date();

    for (const seg of timeline.segments) {
      if (now >= seg.startDate && now <= seg.endDate) {
        segment = seg;
        break;
      }
    }

    // If no suitable segment found, use the first one
    if (!segment && timeline.segments.length > 0) {
      segment = timeline.segments[0];
    }

    // If still no segment, create one
    if (!segment) {
      segment = {
        name: "Administrative Tasks",
        description: "Tasks created by administrators",
        startDate: session.startDate,
        endDate: session.endDate,
        color: "#3498db",
        tasks: [],
      };
      timeline.segments.push(segment);
    }

    // Create new task
    const newTask = {
      title,
      description,
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      assignedTo,
      targetUsers: targetUsers || [],
      targetTeams: targetTeams || [],
      priority: priority || "medium",
      status: "pending",
      createdBy: user._id,
    };

    segment.tasks.push(newTask);
    await timeline.save();

    // Create notifications for task assignees
    await createTaskNotifications(newTask, timeline, segment);

    return {
      success: true,
      message: "Task created successfully",
      data: newTask,
    };
  } catch (error) {
    logger.error("Failed to create admin task", { error });
    throw error;
  }
};

// Helper function for task notifications
const createTaskNotifications = async (task, timeline, segment) => {
  // Determine notification recipients
  let userIds = [];

  if (task.targetUsers && task.targetUsers.length > 0) {
    userIds = task.targetUsers;
  } else if (task.targetTeams && task.targetTeams.length > 0) {
    // Get all members from targeted teams
    const teams = await Team.find({
      _id: { $in: task.targetTeams },
      session: timeline.session,
    });

    teams.forEach((team) => {
      team.members.forEach((member) => {
        userIds.push(member.user);
      });
    });
  } else {
    // Based on general assignedTo
    const roleMap = {
      students: "student",
      supervisors: "supervisor",
      admins: "admin",
    };

    if (task.assignedTo !== "all") {
      const role = roleMap[task.assignedTo];
      const users = await User.find({
        role,
        status: "active",
      });
      userIds = users.map((u) => u._id);
    } else {
      // If 'all', get active users
      const users = await User.find({ status: "active" });
      userIds = users.map((u) => u._id);
    }
  }

  // Create notifications
  const notifications = userIds.map((userId) => ({
    title: "New Task Assigned",
    message: `New task "${
      task.title
    }" has been assigned to you. Due: ${new Date(
      task.dueDate
    ).toLocaleDateString()}`,
    type: "task_assignment",
    user: userId,
    isRead: false,
    metadata: {
      timelineId: timeline._id,
      segmentId: segment._id,
      taskId: task._id,
      sessionId: timeline.session,
    },
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }
};
