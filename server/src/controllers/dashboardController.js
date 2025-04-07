import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { TeamChat } from "../models/TeamChat.js";
import { TeamInvitation } from "../models/TeamInvitation.js";
import { User } from "../models/User.js";

export const getStudentDashboard = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id })
      .populate("user", "fullName email profilePicture studentId")
      .populate({
        path: "team",
        populate: {
          path: "members.user",
          select: "_id fullName email profilePicture studentId",
        },
      });

    if (!student) {
      return {
        success: false,
        error: "Student profile not found",
      };
    }

    // Find current session
    const currentSession = await Session.findOne({ status: "active" });

    // Handle case when no session is active
    if (!currentSession) {
      return {
        success: true,
        data: {
          student: {
            _id: student._id,
            user: student.user,
            studentId: student.studentId,
            department: student.department,
            year: student.year,
          },
          currentSession: null,
          team: student.team,
          pendingInvites: [],
        },
      };
    }

    // Get team data
    let enhancedTeam = student.team;

    // Get pending invitations
    const pendingInvites = await TeamInvitation.find({
      invitedStudent: student._id,
      status: "pending",
    })
      .populate("team")
      .populate("from", "fullName")
      .lean();

    // Return cleaned data structure
    return {
      success: true,
      data: {
        student: {
          _id: student._id,
          user: student.user,
          studentId: student.studentId,
          department: student.department,
          year: student.year,
        },
        currentSession,
        team: enhancedTeam,
        pendingInvites: pendingInvites || [],
      },
    };
  } catch (error) {
    // Log the error but don't throw it
    console.error("Student Dashboard Error:", error);
    return {
      success: false,
      error: "Failed to fetch student dashboard",
    };
  }
};

export const getSupervisorDashboard = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user._id })
      .populate("user", "_id fullName email")
      .lean();

    if (!supervisor) {
      return {
        success: false,
        error: "Supervisor profile not found",
      };
    }

    const currentSession = await Session.findOne({ isActive: true })
      .select("_id name startDate endDate deadlines")
      .lean();

    const supervisedTeams = await Team.find({
      supervisors: user._id,
      session: currentSession?._id,
    })
      .populate("members.user", "_id fullName email profilePicture studentId")
      .populate("project", "_id name type status submissionLink submittedAt")
      .lean();

    const analytics = {
      totalTeams: supervisedTeams.length,
      totalStudents: supervisedTeams.reduce(
        (acc, team) => acc + team.members.length,
        0
      ),
      projectSubmissions: supervisedTeams.filter(
        (team) => team.project?.submittedAt
      ).length,
      pendingReviews: supervisedTeams.filter(
        (team) => team.project?.status === "submitted"
      ).length,
    };

    const pendingRequests = await Project.find({
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "pending",
    })
      .populate("team", "name teamId")
      .populate("creator", "fullName email")
      .select("_id name type description createdAt")
      .lean();

    const projectStats = {
      submitted: 0,
      reviewed: 0,
      inProgress: 0,
      total: 0,
    };

    const projectTypes = {
      research_based: 0,
      project_based: 0,
    };

    const teamProjects = await Project.find({
      team: { $in: supervisedTeams.map((t) => t._id) },
    }).lean();

    teamProjects.forEach((project) => {
      projectStats.total++;

      if (project.status === "submitted") {
        projectStats.submitted++;
      } else if (project.status === "reviewed") {
        projectStats.reviewed++;
      } else if (project.status === "in_progress") {
        projectStats.inProgress++;
      }

      if (project.type) {
        projectTypes[project.type]++;
      }
    });

    const recentActivities = await Notification.find({
      type: { $in: ["project_submission", "team_update"] },
      team: { $in: supervisedTeams.map((t) => t._id) },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "fullName")
      .lean();

    return {
      success: true,
      data: {
        supervisor,
        currentSession,
        supervisedTeams,
        analytics: {
          ...analytics,
          projectTypes,
          projectStats,
        },
        pendingRequests,
        recentActivities,
      },
    };
  } catch (error) {
    console.error("Supervisor Dashboard Error:", error);
    return {
      success: false,
      error: "Failed to fetch supervisor dashboard data",
    };
  }
};

export const getAdminDashboard = async () => {
  try {
    const sessions = await Session.find()
      .sort({ startDate: -1 })
      .limit(5)
      .lean();

    const currentSession = sessions.find(
      (s) =>
        s.status === "active" ||
        (new Date() >= new Date(s.startDate) &&
          new Date() <= new Date(s.endDate))
    );

    // Calculate sessionProgress for currentSession
    let sessionProgress = 0;
    if (currentSession) {
      const now = new Date();
      const start = new Date(currentSession.startDate);
      const end = new Date(currentSession.endDate);

      if (now >= start && now <= end) {
        sessionProgress = ((now - start) / (end - start)) * 100;
      } else if (now > end) {
        sessionProgress = 100;
      }
    }

    const userCounts = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const roleCountMap = userCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const teamsCount = currentSession
      ? await Team.countDocuments({ session: currentSession._id })
      : 0;

    const pendingApprovals = await User.countDocuments({
      role: "supervisor",
      isApproved: false,
    });

    const projectStats = await Project.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const projectStatsMap = projectStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const recentActivities = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "fullName role")
      .lean();

    const enhancedSessions = sessions.map((session) => {
      const now = new Date();
      const start = new Date(session.startDate);
      const end = new Date(session.endDate);

      let sessionProgress = 0;
      if (now >= start && now <= end) {
        sessionProgress = ((now - start) / (end - start)) * 100;
      } else if (now > end) {
        sessionProgress = 100;
      }

      return {
        ...session,
        progress: Math.round(sessionProgress),
        totalDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
        remainingDays: Math.max(
          0,
          Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        ),
      };
    });

    const supervisorStats = await User.aggregate([
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

    const teamsWithoutSupervisor = await Team.countDocuments({
      session: currentSession?._id,
      supervisors: { $size: 0 },
    });

    const departmentStats = await User.aggregate([
      { $match: { role: { $in: ["student", "supervisor"] } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return {
      success: true,
      data: {
        sessions: enhancedSessions,
        currentSession: currentSession
          ? {
              ...currentSession,
              progress: Math.round(sessionProgress),
            }
          : null,
        analytics: {
          totalSessions: sessions.length,
          totalSupervisors: roleCountMap.supervisor || 0,
          totalStudents: roleCountMap.student || 0,
          totalTeams: teamsCount,
          pendingApprovals,
          projectSubmissions: projectStatsMap.submitted || 0,
          projectsInProgress: projectStatsMap.in_progress || 0,
          projectsCompleted: projectStatsMap.completed || 0,
          sessionsActive: sessions.filter((s) => s.status === "active").length,
          sessionProgress: Math.round(sessionProgress),
          supervisorAssignmentStats: {
            teamsWithoutSupervisor,
            supervisorDistribution: supervisorStats,
          },
          departmentDistribution: departmentStats,
          projectTypeStats: {
            researchBased: projectStatsMap.research_based || 0,
            projectBased: projectStatsMap.project_based || 0,
          },
        },
        recentActivities,
      },
    };
  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    return {
      success: false,
      error: "Failed to fetch admin dashboard data",
    };
  }
};

export const getSessionDetailedAnalytics = async ({ params }) => {
  try {
    const session = await Session.findById(params.id);
    if (!session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    const teamsCount = await Team.countDocuments({ session: session._id });

    const projectsQuery = { session: session._id };
    const projectsCount = await Project.countDocuments(projectsQuery);

    const projectStatusStats = await Project.aggregate([
      { $match: projectsQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const projectTypeStats = await Project.aggregate([
      { $match: projectsQuery },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const weeklySubmissions = await Project.aggregate([
      {
        $match: {
          session: session._id,
          submittedAt: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%U",
              date: "$submittedAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      success: true,
      data: {
        sessionInfo: {
          _id: session._id,
          name: session.name,
          status: session.status,
          startDate: session.startDate,
          endDate: session.endDate,
          deadlines: session.deadlines,
        },
        stats: {
          teamsCount,
          projectsCount,
          projectStatusBreakdown: projectStatusStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          projectTypeBreakdown: projectTypeStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          weeklySubmissions: weeklySubmissions.map((item) => ({
            week: item._id,
            count: item.count,
          })),
        },
      },
    };
  } catch (error) {
    console.error("Session Analytics Error:", error);
    return {
      success: false,
      error: "Failed to fetch session analytics",
    };
  }
};

export const getTeamChat = async ({ params, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });

    if (!student) {
      return {
        success: false,
        error: "Student profile not found",
      };
    }

    const team = await Team.findById(params.teamId);
    if (!team) {
      return {
        success: false,
        error: "Team not found",
      };
    }

    const isMember = team.members.some(
      (m) =>
        m.user.toString() === student._id.toString() && m.status === "active"
    );

    if (!isMember) {
      return {
        success: false,
        error: "You are not a member of this team",
      };
    }

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
    const skip = (page - 1) * limit;

    const chatMessages = await TeamChat.find({ team: team._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "fullName profilePicture")
      .lean();

    const totalCount = await TeamChat.countDocuments({ team: team._id });

    return {
      success: true,
      data: {
        messages: chatMessages.reverse(),
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (error) {
    console.error("Team Chat Error:", error);
    return {
      success: false,
      error: "Failed to fetch team chat",
    };
  }
};
