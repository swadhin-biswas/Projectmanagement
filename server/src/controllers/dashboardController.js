// Import all necessary models - VERIFY PATHS
import { CalendarEvent } from "../models/CalendarEvent.js"; // Assuming this is needed based on previous student dashboard
import { Notification } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { TeamChat } from "../models/TeamChat.js";
import { TeamInvitation } from "../models/TeamInvitation.js";
import { User } from "../models/User.js";

// Import Logger - VERIFY PATH
import logger, { createErrorResponse } from "../utils/logger.js";

// --- Refactored Student Dashboard ---
export const getStudentDashboard = async ({ user, set }) => {
  try {
    // Validate user input first
    if (!user || !user.id) {
      if (set) set.status = 401;
      return {
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      };
    }

    const student = await Student.findOne({ user: user.id })
      .populate("user", "fullName email profilePicture studentId department")
      .populate({
        path: "team",
        populate: [
          {
            path: "members.user",
            select: "_id fullName email profilePicture studentId",
          },
          {
            path: "supervisor",
            select: "_id user",
            populate: { path: "user", select: "fullName email" },
          },
        ],
      })
      .lean(); // Use lean for performance

    if (!student) {
      if (set) set.status = 404;
      return {
        success: false,
        error: "Student profile not found",
        timestamp: new Date().toISOString(),
        data: {
          currentSession: {
            id: "",
            name: "",
            startDate: "",
            endDate: "",
          },
          team: null,
          upcomingDeadlines: [],
          recentActivities: [],
          notifications: [],
          projectStatus: {
            status: "not_started",
            progress: 0,
            lastUpdated: "",
          },
        },
      };
    }

    // Find active session - Add error handling for session query
    let currentSession = null;
    try {
      currentSession = await Session.findOne({ status: "active" }).lean();
    } catch (sessionErr) {
      logger.warn("Error fetching active session:", sessionErr);
      // Continue without session data
    }

    // Fetch Additional Data (Project, Notifications, Events, Invites)
    let project = null;
    let notifications = [];
    let upcomingEvents = [];
    let pendingInvites = [];
    let recentActivities = [];

    // Add Promise.all to run queries in parallel and handle errors better
    const [
      projectData,
      notificationsData,
      pendingInvitesData,
      upcomingEventsData,
      recentActivitiesData,
    ] = await Promise.allSettled([
      // Project
      student.team
        ? Team.findById(student.team._id).populate("project").lean()
        : Promise.resolve(null),

      // Notifications
      Notification.find({
        $or: [
          { recipientUser: user.id },
          ...(student.team ? [{ recipientTeam: student.team._id }] : []),
        ],
        type: { $ne: "team_invite" },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("sender", "fullName")
        .lean(),

      // Pending Team Invitations
      TeamInvitation.find({
        invitedStudent: student._id,
        status: "pending",
      })
        .populate({ path: "team", select: "name" })
        .populate({
          path: "from",
          select: "user",
          populate: { path: "user", select: "fullName" },
        })
        .lean(),

      // Upcoming Deadlines/Events
      CalendarEvent.find({
        endDate: { $gte: new Date() },
        $or: [
          { visibility: "public" },
          ...(student.team ? [{ relatedTeam: student.team._id }] : []),
        ],
      })
        .sort({ startDate: 1 })
        .limit(5)
        .lean(),

      // Recent Activities - can be from notification or other activity logs
      Notification.find({
        $or: [
          { recipientUser: user.id },
          ...(student.team ? [{ recipientTeam: student.team._id }] : []),
        ],
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("sender", "fullName")
        .lean(),
    ]);

    // Process results from Promise.allSettled, handling errors gracefully
    if (projectData.status === "fulfilled" && projectData.value?.project) {
      project = projectData.value.project;
    }

    if (notificationsData.status === "fulfilled") {
      notifications = notificationsData.value || [];
    }

    if (pendingInvitesData.status === "fulfilled") {
      pendingInvites = pendingInvitesData.value || [];
    }

    if (upcomingEventsData.status === "fulfilled") {
      upcomingEvents = upcomingEventsData.value || [];
    }

    if (recentActivitiesData.status === "fulfilled") {
      recentActivities = recentActivitiesData.value || [];
    }

    // Transform upcomingEvents into upcomingDeadlines format
    const upcomingDeadlines = upcomingEvents.map((event) => ({
      id: event._id.toString(),
      title: event.title || "Unnamed Event",
      dueDate: event.endDate || new Date().toISOString(),
      type: event.type || "event",
      isOverdue: new Date(event.endDate) < new Date(),
      daysRemaining: Math.ceil(
        (new Date(event.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // Transform notifications into recentActivities format if needed
    const formattedRecentActivities = recentActivities.map((activity) => ({
      id: activity._id.toString(),
      type: activity.type || "notification",
      description: activity.message || "Activity notification",
      timestamp: activity.createdAt || new Date().toISOString(),
    }));

    // Format project status
    const projectStatus = project
      ? {
          status: project.status || "not_started",
          progress: project.progress || 0,
          lastUpdated: project.updatedAt || new Date().toISOString(),
        }
      : {
          status: "not_started",
          progress: 0,
          lastUpdated: new Date().toISOString(),
        };

    // --- Assemble and Convert IDs ---
    const data = {
      student: {
        _id: student._id.toString(),
        user: { ...student.user, _id: student.user._id.toString() },
        department: student.user.department,
        year: student.year,
      },
      currentSession: currentSession
        ? {
            id: currentSession._id.toString(),
            name: currentSession.name || "",
            startDate: currentSession.startDate || "",
            endDate: currentSession.endDate || "",
          }
        : {
            id: "",
            name: "",
            startDate: "",
            endDate: "",
          },
      team: student.team
        ? {
            id: student.team._id.toString(),
            name: student.team.name || "",
            members: student.team.members.map((m) => ({
              id: m.user._id.toString(),
              name: m.user.fullName || "",
              role: m.role || "member",
              status: m.status || "active",
            })),
            projectId: project ? project._id.toString() : "",
          }
        : null,
      upcomingDeadlines: upcomingDeadlines,
      recentActivities: formattedRecentActivities,
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        message: n.message || "",
        type: n.type || "general",
        isRead: n.isRead || false,
        createdAt: n.createdAt || new Date().toISOString(),
      })),
      projectStatus: projectStatus,
      pendingInvites: pendingInvites.map((inv) => ({
        ...inv,
        _id: inv._id.toString(),
        team: { ...inv.team, _id: inv.team._id.toString() },
        from: {
          ...inv.from,
          _id: inv.from._id.toString(),
          user: { ...inv.from.user, _id: inv.from.user._id.toString() },
        },
      })),
    };

    if (set) set.status = 200;
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data,
    };
  } catch (error) {
    return createErrorResponse(
      error,
      "Failed to fetch student dashboard data",
      set,
      500,
      {
        currentSession: {
          id: "",
          name: "",
          startDate: "",
          endDate: "",
        },
        team: null,
        upcomingDeadlines: [],
        recentActivities: [],
        notifications: [],
        projectStatus: {
          status: "not_started",
          progress: 0,
          lastUpdated: "",
        },
      }
    );
  }
};

// --- Refactored Supervisor Dashboard ---
export const getSupervisorDashboard = async ({ user, set }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id }) // Use user.id from auth context
      .populate("user", "_id fullName email department") // Added department
      .lean();

    if (!supervisor) {
      if (set) set.status = 404;
      return {
        success: false,
        error: "Supervisor profile not found",
        timestamp: new Date().toISOString(),
      };
    }

    // Use consistent status check for session
    const currentSession = await Session.findOne({ status: "active" })
      .select("_id name startDate endDate deadlines")
      .lean();

    const supervisedTeams = await Team.find({
      // VERIFY: Does Team model use 'supervisor' (single ref) or 'supervisors' (array ref)? Adjust field name.
      supervisor: supervisor._id, // Assuming single supervisor reference using Supervisor model's _id
      // supervisors: user.id // Alternative if using array of User IDs
      ...(currentSession && { session: currentSession._id }), // Conditionally add session filter
    })
      .populate("members.user", "_id fullName email profilePicture studentId")
      .populate("project", "_id name type status submissionLink submittedAt")
      .lean();

    // --- Project Stats Calculation ---
    const projectStats = { submitted: 0, reviewed: 0, inProgress: 0, total: 0 };
    const projectTypes = { research_based: 0, project_based: 0 }; // Add other types if needed
    supervisedTeams.forEach((team) => {
      if (team.project) {
        projectStats.total++;
        const status = team.project.status || "unknown"; // Handle missing status
        const type = team.project.type || "unknown"; // Handle missing type

        if (status === "submitted") projectStats.submitted++;
        else if (status === "reviewed") projectStats.reviewed++;
        else if (status === "in_progress") projectStats.inProgress++; // Check actual status values

        if (projectTypes.hasOwnProperty(type)) {
          // Avoid errors for unexpected types
          projectTypes[type]++;
        }
      }
    });

    const analytics = {
      totalTeams: supervisedTeams.length,
      totalStudents: supervisedTeams.reduce(
        (acc, team) => acc + (team.members?.length || 0),
        0
      ),
      projectSubmissions: projectStats.submitted, // Use calculated stats
      pendingReviews: supervisedTeams.filter(
        (team) => team.project?.status === "submitted"
      ).length, // Keep this specific filter if needed
      projectTypes,
      projectStats,
    };

    // --- Pending Project Supervision Requests ---
    // VERIFY: Does Project model have 'supervisorRequests' array like [{ supervisor: Supervisor_id, status: 'pending' }] ? Adjust query.
    const pendingRequests = await Project.find({
      "supervisorRequests.supervisor": supervisor._id, // Example structure
      "supervisorRequests.status": "pending", // Example structure
      // Adjust based on your actual Project schema for supervisor requests
    })
      .populate({
        path: "team",
        select: "name teamId",
        populate: { path: "members.user", select: "fullName" },
      }) // Populate team name and members
      .select("_id name type description createdAt team") // Select necessary fields
      .lean();

    const recentActivities = await Notification.find({
      // Define relevant notification types for supervisors
      // type: { $in: ["project_submission", "team_update", "pending_review"] },
      recipientUser: user.id, // Notifications directly to the supervisor
      // Or maybe query notifications related to their teams:
      // team: { $in: supervisedTeams.map((t) => t._id) },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("sender", "fullName role") // Changed 'user' to 'sender'
      .lean();

    // --- Assemble and Convert IDs ---
    const data = {
      supervisor: {
        ...supervisor,
        _id: supervisor._id.toString(),
        user: { ...supervisor.user, _id: supervisor.user._id.toString() },
      },
      currentSession: currentSession
        ? { ...currentSession, _id: currentSession._id.toString() }
        : null,
      supervisedTeams: supervisedTeams.map((t) => ({
        ...t,
        _id: t._id.toString(),
        project: t.project
          ? { ...t.project, _id: t.project._id.toString() }
          : null,
        members: t.members.map((m) => ({
          ...m,
          user: { ...m.user, _id: m.user._id.toString() },
        })),
        // supervisor field might already be populated if fetched that way
      })),
      analytics, // Already contains counts and stats
      pendingRequests: pendingRequests.map((p) => ({
        ...p,
        _id: p._id.toString(),
        team: p.team
          ? {
              ...p.team,
              _id: p.team._id.toString(),
              members: p.team.members.map((m) => ({
                ...m,
                user: m.user ? { ...m.user, _id: m.user._id.toString() } : null,
              })),
            }
          : null,
        // creator population might be needed if part of your schema
      })),
      recentActivities: recentActivities.map((a) => ({
        ...a,
        _id: a._id.toString(),
        sender: a.sender ? { ...a.sender, _id: a.sender._id.toString() } : null,
      })),
    };

    if (set) set.status = 200;
    return { success: true, timestamp: new Date().toISOString(), data };
  } catch (error) {
    return createErrorResponse(
      error,
      "Failed to fetch supervisor dashboard data",
      set
    );
  }
};

// --- Refactored Admin Dashboard ---
// This function already incorporated many fixes in the previous step
export const getAdminDashboard = async ({ set }) => {
  // Added set
  try {
    const sessions = await Session.find()
      .sort({ startDate: -1 })
      .limit(5)
      .lean();

    const now = new Date();
    let currentSession = sessions.find((s) => s.status === "active");
    if (!currentSession) {
      currentSession = sessions.find(
        (s) => now >= new Date(s.startDate) && now <= new Date(s.endDate)
      );
    }
    if (!currentSession && sessions.length > 0) {
      currentSession = sessions[0]; // Fallback to most recent
    }

    let currentSessionProgress = 0;
    if (currentSession) {
      const start = new Date(currentSession.startDate);
      const end = new Date(currentSession.endDate);
      const totalDuration = end - start;
      if (now >= start && now <= end) {
        currentSessionProgress =
          totalDuration > 0 ? ((now - start) / totalDuration) * 100 : 0;
      } else if (now > end) {
        currentSessionProgress = 100;
      }
      currentSessionProgress = Math.max(
        0,
        Math.min(100, Math.round(currentSessionProgress))
      );
    }

    // --- Aggregations ---
    const userCountsPromise = User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]).exec();
    const projectStatsPromise = Project.aggregate([
      ...(currentSession ? [{ $match: { session: currentSession._id } }] : []),
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec();
    const projectTypeStatsPromise = Project.aggregate([
      ...(currentSession ? [{ $match: { session: currentSession._id } }] : []),
      { $group: { _id: "$type", count: { $sum: 1 } } }, // Assuming 'type' field
    ]).exec();
    // VERIFY: Lookup fields in supervisorStats
    const supervisorStatsPromise = User.aggregate([
      { $match: { role: "supervisor", isApproved: true } },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "supervisor",
          as: "assignedTeams",
        },
      }, // CHECK foreignField
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
    ]).exec();
    const departmentStatsPromise = User.aggregate([
      { $match: { role: { $in: ["student", "supervisor"] } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();

    // --- Simple Counts ---
    const teamsCountPromise = currentSession
      ? Team.countDocuments({ session: currentSession._id })
      : Team.countDocuments();
    const pendingApprovalsPromise = User.countDocuments({
      isApproved: false,
      role: { $nin: ["superadmin", "student"] },
    });
    // VERIFY: Check for supervisor field / array
    const teamsWithoutSupervisorPromise = Team.countDocuments({
      ...(currentSession ? { session: currentSession._id } : {}),
      supervisor: { $exists: false },
    }); // CHECK field

    // --- Recent Activity ---
    const recentActivitiesPromise = Notification.find() // Consider admin-specific filters?
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("sender", "fullName role")
      .lean();

    // --- Await all promises ---
    const [
      userCounts,
      projectStats,
      projectTypeStats,
      supervisorStats,
      departmentStats,
      teamsCount,
      pendingApprovals,
      teamsWithoutSupervisor,
      recentActivities,
    ] = await Promise.all([
      userCountsPromise,
      projectStatsPromise,
      projectTypeStatsPromise,
      supervisorStatsPromise,
      departmentStatsPromise,
      teamsCountPromise,
      pendingApprovalsPromise,
      teamsWithoutSupervisorPromise,
      recentActivitiesPromise,
    ]);

    // --- Process results ---
    const roleCountMap = userCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const projectStatsMap = projectStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const projectTypeStatsMap = projectTypeStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const enhancedSessions = sessions.map((session) => {
      const start = new Date(session.startDate);
      const end = new Date(session.endDate);
      const totalDuration = end - start;
      const totalDays =
        totalDuration > 0
          ? Math.ceil(totalDuration / (1000 * 60 * 60 * 24))
          : 0;
      let sessionProgress = 0;
      if (now >= start && now <= end) {
        sessionProgress =
          totalDuration > 0 ? ((now - start) / totalDuration) * 100 : 0;
      } else if (now > end) {
        sessionProgress = 100;
      }
      return {
        ...session,
        _id: session._id.toString(),
        progress: Math.max(0, Math.min(100, Math.round(sessionProgress))),
        totalDays: totalDays,
        remainingDays: Math.max(
          0,
          Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        ),
      };
    });

    // --- Assemble and Convert IDs ---
    const finalData = {
      sessions: enhancedSessions,
      currentSession: currentSession
        ? {
            ...currentSession,
            _id: currentSession._id.toString(),
            progress: currentSessionProgress,
          }
        : null,
      analytics: {
        totalSessions: sessions.length,
        totalSupervisors: roleCountMap.supervisor || 0,
        totalStudents: roleCountMap.student || 0,
        totalUsers: Object.values(roleCountMap).reduce(
          (sum, count) => sum + count,
          0
        ),
        totalTeams: teamsCount,
        pendingApprovals,
        projectSubmissions: projectStatsMap.submitted || 0,
        projectsInProgress: projectStatsMap.in_progress || 0,
        projectsCompleted: projectStatsMap.completed || 0,
        sessionsActive: sessions.filter((s) => s.status === "active").length,
        sessionProgress: currentSessionProgress,
        supervisorAssignmentStats: {
          teamsWithoutSupervisor,
          supervisorDistribution: supervisorStats.map((s) => ({
            ...s,
            _id: s._id.toString(),
          })),
        },
        departmentDistribution: departmentStats.map((d) => ({
          department: d._id,
          count: d.count,
        })),
        projectTypeStats: {
          researchBased: projectTypeStatsMap.research_based || 0,
          projectBased: projectTypeStatsMap.project_based || 0,
          // Add other types dynamically?
          // ...Object.fromEntries(projectTypeStats.map(item => [item._id, item.count]))
        },
      },
      recentActivities: recentActivities.map((a) => ({
        ...a,
        _id: a._id.toString(),
        sender: a.sender ? { ...a.sender, _id: a.sender._id.toString() } : null,
      })),
    };

    if (set) set.status = 200;
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: finalData,
    };
  } catch (error) {
    return createErrorResponse(
      error,
      "Failed to fetch admin dashboard data",
      set
    );
  }
};

// --- Refactored Session Analytics ---
export const getSessionDetailedAnalytics = async ({ params, set }) => {
  // Added set
  try {
    const sessionId = params.id; // Assuming id comes from route params
    if (!sessionId) {
      if (set) set.status = 400;
      return {
        success: false,
        error: "Session ID is required",
        timestamp: new Date().toISOString(),
      };
    }

    const session = await Session.findById(sessionId).lean(); // Use lean
    if (!session) {
      if (set) set.status = 404;
      return {
        success: false,
        error: "Session not found",
        timestamp: new Date().toISOString(),
      };
    }

    // Run queries in parallel
    const teamsCountPromise = Team.countDocuments({ session: session._id });
    const projectsQuery = { session: session._id };
    const projectsCountPromise = Project.countDocuments(projectsQuery);
    const projectStatusStatsPromise = Project.aggregate([
      { $match: projectsQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec();
    const projectTypeStatsPromise = Project.aggregate([
      { $match: projectsQuery },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]).exec();
    const weeklySubmissionsPromise = Project.aggregate([
      { $match: { session: session._id, submittedAt: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%U", date: "$submittedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    const [
      teamsCount,
      projectsCount,
      projectStatusStats,
      projectTypeStats,
      weeklySubmissions,
    ] = await Promise.all([
      teamsCountPromise,
      projectsCountPromise,
      projectStatusStatsPromise,
      projectTypeStatsPromise,
      weeklySubmissionsPromise,
    ]);

    const data = {
      sessionInfo: {
        // Convert ID
        ...session,
        _id: session._id.toString(),
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
        })), // Assuming _id is week string
      },
    };

    if (set) set.status = 200;
    return { success: true, timestamp: new Date().toISOString(), data };
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch session analytics", set);
  }
};

// --- Refactored Team Chat ---
export const getTeamChat = async ({ params, user, set }) => {
  // Added set, user
  try {
    const teamId = params.teamId;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
    const skip = (page - 1) * limit;

    if (!teamId) {
      if (set) set.status = 400;
      return {
        success: false,
        error: "Team ID is required",
        timestamp: new Date().toISOString(),
      };
    }

    // Check if user is an active member of the team directly
    // VERIFY: Assumes 'members' array on Team has { user: User_id, status: 'active' }
    const team = await Team.findOne({
      _id: teamId,
      "members.user": user.id, // Use authenticated user ID
      "members.status": "active",
    }).lean(); // Find team and check membership in one query

    if (!team) {
      // Could be team not found OR user not an active member
      // Check if team exists at all for a better error message
      const teamExists = await Team.findById(teamId).lean();
      if (!teamExists) {
        if (set) set.status = 404;
        return {
          success: false,
          error: "Team not found",
          timestamp: new Date().toISOString(),
        };
      } else {
        if (set) set.status = 403; // Forbidden
        return {
          success: false,
          error: "You are not an active member of this team",
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Fetch messages and count in parallel
    const chatMessagesPromise = TeamChat.find({ team: team._id })
      .sort({ createdAt: -1 }) // Fetch newest first
      .skip(skip)
      .limit(limit)
      .populate("sender", "fullName profilePicture _id") // Select _id for conversion
      .lean();

    const totalCountPromise = TeamChat.countDocuments({ team: team._id });

    const [chatMessages, totalCount] = await Promise.all([
      chatMessagesPromise,
      totalCountPromise,
    ]);

    const data = {
      // Convert IDs and reverse messages for chronological display
      messages: chatMessages.reverse().map((m) => ({
        ...m,
        _id: m._id.toString(),
        sender: m.sender ? { ...m.sender, _id: m.sender._id.toString() } : null,
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    };

    if (set) set.status = 200;
    return { success: true, timestamp: new Date().toISOString(), data };
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch team chat", set);
  }
};
