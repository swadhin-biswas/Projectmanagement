import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

// Get comprehensive admin dashboard analytics
export const getAdminDashboardAnalytics = async ({ query }) => {
  try {
    // Get current or specified session
    let session;
    if (query.sessionId) {
      session = await Session.findById(query.sessionId);
      if (!session) {
        throw new ValidationError("Session not found");
      }
    } else {
      session = await Session.findOne({ status: "active" });
      if (!session) {
        return {
          success: false,
          message: "No active session found",
        };
      }
    }

    // Get all users with role distribution
    const userStats = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const roleDistribution = {};
    userStats.forEach((stat) => {
      roleDistribution[stat._id] = stat.count;
    });

    // Get student stats
    const studentCount = roleDistribution.student || 0;

    // Get supervisor stats
    const supervisorCount = roleDistribution.supervisor || 0;

    // Get team stats
    const teams = await Team.find({ session: session._id });
    const teamsWithProject = await Team.find({
      session: session._id,
      project: { $exists: true, $ne: null },
    });

    // Get project stats
    const projects = await Project.find({ session: session._id });

    // Get project type distribution
    const projectTypeStats = await Project.aggregate([
      { $match: { session: session._id } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const projectTypeDistribution = {};
    projectTypeStats.forEach((stat) => {
      projectTypeDistribution[stat._id] = stat.count;
    });

    // Get project status distribution
    const projectStatusStats = await Project.aggregate([
      { $match: { session: session._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const projectStatusDistribution = {};
    projectStatusStats.forEach((stat) => {
      projectStatusDistribution[stat._id] = stat.count;
    });

    // Get submission stats
    const submissionStats = await Project.aggregate([
      { $match: { session: session._id } },
      {
        $project: {
          projectId: "$_id",
          submissionsCount: { $size: "$submissions" },
        },
      },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: "$submissionsCount" },
          avgSubmissionsPerProject: { $avg: "$submissionsCount" },
        },
      },
    ]);

    // Students in teams vs without teams
    const studentsInTeams = new Set();
    teams.forEach((team) => {
      team.members.forEach((member) => {
        studentsInTeams.add(member.user.toString());
      });
    });

    const studentsInTeamsCount = studentsInTeams.size;
    const studentsWithoutTeams = studentCount - studentsInTeamsCount;

    // Supervisors with projects vs without
    const supervisorsWithProjects = new Set();
    projects.forEach((project) => {
      project.supervisors.forEach((supervisor) => {
        if (supervisor.status === "accepted") {
          supervisorsWithProjects.add(supervisor.supervisor.toString());
        }
      });
    });

    const supervisorsWithProjectsCount = supervisorsWithProjects.size;
    const supervisorsWithoutProjects =
      supervisorCount - supervisorsWithProjectsCount;

    // Team size distribution
    const teamSizeDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    teams.forEach((team) => {
      const size = team.members.length;
      if (size >= 1 && size <= 4) {
        teamSizeDistribution[size]++;
      }
    });

    // Get deadline stats
    const deadlines = session.deadlines.map((deadline) => {
      const isPast = new Date(deadline.date) < new Date();
      return {
        ...deadline.toObject(),
        isPast,
        timeRemaining: isPast
          ? 0
          : Math.round(
              (new Date(deadline.date) - new Date()) / (1000 * 60 * 60 * 24)
            ),
      };
    });

    // Recent activity - get recently updated projects
    const recentProjects = await Project.find({ session: session._id })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("team", "name")
      .populate("supervisors.supervisor", "user")
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName",
        },
      });

    // Summary of teams with and without supervisors
    const teamsWithSupervisors = await Team.countDocuments({
      session: session._id,
      supervisors: { $exists: true, $not: { $size: 0 } },
    });

    const teamsWithoutSupervisors = teams.length - teamsWithSupervisors;

    return {
      success: true,
      data: {
        session: {
          _id: session._id,
          name: session.name,
          startDate: session.startDate,
          endDate: session.endDate,
          status: session.status,
          progress: session.progress,
          durationMonths: session.durationMonths,
        },
        userStats: {
          total: Object.values(roleDistribution).reduce(
            (sum, count) => sum + count,
            0
          ),
          roleDistribution,
        },
        studentStats: {
          total: studentCount,
          inTeams: studentsInTeamsCount,
          withoutTeams: studentsWithoutTeams,
          percentInTeams:
            studentCount > 0
              ? Math.round((studentsInTeamsCount / studentCount) * 100)
              : 0,
        },
        supervisorStats: {
          total: supervisorCount,
          withProjects: supervisorsWithProjectsCount,
          withoutProjects: supervisorsWithoutProjects,
          percentWithProjects:
            supervisorCount > 0
              ? Math.round(
                  (supervisorsWithProjectsCount / supervisorCount) * 100
                )
              : 0,
        },
        teamStats: {
          total: teams.length,
          withProject: teamsWithProject.length,
          withoutProject: teams.length - teamsWithProject.length,
          withSupervisors: teamsWithSupervisors,
          withoutSupervisors: teamsWithoutSupervisors,
          sizeDistribution: teamSizeDistribution,
        },
        projectStats: {
          total: projects.length,
          typeDistribution: projectTypeDistribution,
          statusDistribution: projectStatusDistribution,
          submissions:
            submissionStats.length > 0
              ? {
                  total: submissionStats[0].totalSubmissions,
                  average:
                    Math.round(
                      submissionStats[0].avgSubmissionsPerProject * 100
                    ) / 100,
                }
              : { total: 0, average: 0 },
        },
        deadlines,
        recentActivity: recentProjects.map((project) => ({
          _id: project._id,
          name: project.name,
          team: project.team?.name || "N/A",
          type: project.type,
          status: project.status,
          updatedAt: project.updatedAt,
          supervisors: project.supervisors
            .filter((s) => s.status === "accepted")
            .map((s) => s.supervisor?.user?.fullName || "Unknown"),
        })),
      },
    };
  } catch (error) {
    logger.error("Failed to get admin dashboard analytics", { error });
    throw error;
  }
};

// Get supervisor analytics
export const getSupervisorAnalytics = async ({ params, query }) => {
  try {
    const supervisorId = params.id;

    // Find supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate(
      "user",
      "fullName email department profilePicture"
    );

    if (!supervisor) {
      throw new ValidationError("Supervisor not found");
    }

    // Get session context
    let session;
    if (query.sessionId) {
      session = await Session.findById(query.sessionId);
      if (!session) {
        throw new ValidationError("Session not found");
      }
    } else {
      session = await Session.findOne({ status: "active" });
      if (!session) {
        return {
          success: false,
          message: "No active session found",
        };
      }
    }

    // Get teams supervised by this supervisor
    const teams = await Team.find({
      session: session._id,
      "supervisors.supervisor": supervisorId,
      "supervisors.status": "active",
    }).populate({
      path: "members.user",
      populate: {
        path: "user",
        select: "fullName email profilePicture",
      },
    });

    // Get projects supervised by this supervisor
    const projects = await Project.find({
      session: session._id,
      "supervisors.supervisor": supervisorId,
      "supervisors.status": "accepted",
    }).populate("team", "name teamId members");

    // Extract all students supervised by this supervisor
    const supervisedStudents = new Set();
    teams.forEach((team) => {
      team.members.forEach((member) => {
        supervisedStudents.add(member.user._id.toString());
      });
    });

    // Get project type distribution
    const projectTypeStats = {};
    projects.forEach((project) => {
      projectTypeStats[project.type] =
        (projectTypeStats[project.type] || 0) + 1;
    });

    // Get project status distribution
    const projectStatusStats = {};
    projects.forEach((project) => {
      projectStatusStats[project.status] =
        (projectStatusStats[project.status] || 0) + 1;
    });

    // Get submission data
    const submissionCount = projects.reduce(
      (count, project) => count + (project.submissions?.length || 0),
      0
    );

    // Get grading stats
    const gradedSubmissions = projects.reduce((count, project) => {
      return (
        count +
        (project.submissions?.filter(
          (submission) =>
            submission.marks && submission.marks.score !== undefined
        ).length || 0)
      );
    }, 0);

    // Calculate average team size
    const avgTeamSize =
      teams.length > 0
        ? teams.reduce((sum, team) => sum + team.members.length, 0) /
          teams.length
        : 0;

    return {
      success: true,
      data: {
        supervisor: {
          _id: supervisor._id,
          user: supervisor.user,
          specialization: supervisor.specialization,
          supervisorId: supervisor.supervisorId,
        },
        session: {
          _id: session._id,
          name: session.name,
          status: session.status,
        },
        stats: {
          teamsCount: teams.length,
          projectsCount: projects.length,
          studentsCount: supervisedStudents.size,
          submissionsCount: submissionCount,
          gradedSubmissionsCount: gradedSubmissions,
          pendingGradesCount: submissionCount - gradedSubmissions,
          avgTeamSize: Math.round(avgTeamSize * 10) / 10,
          projectTypes: projectTypeStats,
          projectStatuses: projectStatusStats,
        },
        teams: teams.map((team) => ({
          _id: team._id,
          name: team.name,
          teamId: team.teamId,
          memberCount: team.members.length,
          hasProject: team.project ? true : false,
        })),
        projects: projects.map((project) => ({
          _id: project._id,
          name: project.name,
          type: project.type,
          status: project.status,
          team: project.team
            ? {
                _id: project.team._id,
                name: project.team.name,
                teamId: project.team.teamId,
              }
            : null,
          submissionsCount: project.submissions?.length || 0,
          progress: project.progress,
        })),
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor analytics", {
      error,
      supervisorId: params.id,
    });
    throw error;
  }
};

// Get student team analytics
export const getStudentTeamAnalytics = async ({ params, user }) => {
  try {
    const teamId = params.id;

    // Find team
    const team = await Team.findById(teamId)
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
          select: "fullName email department profilePicture",
        },
      })
      .populate("session", "name startDate endDate status")
      .populate("project");

    if (!team) {
      throw new ValidationError("Team not found");
    }

    // Check if user is a member of the team or a supervisor of the team
    const isTeamMember = team.members.some(
      (member) => member.user.user._id.toString() === user.id
    );

    const isTeamSupervisor = team.supervisors.some(
      (supervisor) => supervisor.supervisor.user._id.toString() === user.id
    );

    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isTeamMember && !isTeamSupervisor && !isAdmin) {
      throw new ValidationError("You do not have permission to view this team");
    }

    // Get project if exists
    let project = null;
    if (team.project) {
      project = await Project.findById(team.project).populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email department",
        },
      });
    }

    // Get submission stats if project exists
    let submissionStats = null;
    if (project) {
      const submissions = project.submissions || [];
      const gradedSubmissions = submissions.filter(
        (submission) => submission.marks && submission.marks.score !== undefined
      );

      submissionStats = {
        total: submissions.length,
        graded: gradedSubmissions.length,
        pending: submissions.length - gradedSubmissions.length,
        averageScore:
          gradedSubmissions.length > 0
            ? gradedSubmissions.reduce(
                (sum, submission) => sum + submission.marks.score,
                0
              ) / gradedSubmissions.length
            : null,
      };
    }

    // Get chat activity metrics
    const chatStats = {
      totalMessages: team.chatMessages?.length || 0,
      messagesByMember: {},
    };

    if (team.chatMessages && team.chatMessages.length > 0) {
      team.members.forEach((member) => {
        const memberMessages = team.chatMessages.filter(
          (msg) => msg.sender.toString() === member.user._id.toString()
        );

        chatStats.messagesByMember[member.user._id] = memberMessages.length;
      });
    }

    return {
      success: true,
      data: {
        team: {
          _id: team._id,
          name: team.name,
          teamId: team.teamId,
          session: team.session,
          status: team.status,
          description: team.description,
        },
        members: team.members.map((member) => ({
          _id: member.user._id,
          fullName: member.user.user.fullName,
          email: member.user.user.email,
          profilePicture: member.user.user.profilePicture,
          role: member.role,
          joinedAt: member.joinedAt,
          messageCount: chatStats.messagesByMember[member.user._id] || 0,
        })),
        supervisors: team.supervisors
          .filter((supervisor) => supervisor.status === "active")
          .map((supervisor) => ({
            _id: supervisor.supervisor._id,
            fullName: supervisor.supervisor.user.fullName,
            email: supervisor.supervisor.user.email,
            department: supervisor.supervisor.user.department,
            profilePicture: supervisor.supervisor.user.profilePicture,
            assignedAt: supervisor.assignedAt,
          })),
        project: project
          ? {
              _id: project._id,
              name: project.name,
              type: project.type,
              status: project.status,
              description: project.description,
              progress: project.progress,
              createdAt: project.createdAt,
              supervisors: project.supervisors
                .filter((supervisor) => supervisor.status === "accepted")
                .map((supervisor) => ({
                  _id: supervisor.supervisor._id,
                  fullName: supervisor.supervisor.user.fullName,
                  isMainSupervisor: supervisor.isMainSupervisor,
                })),
            }
          : null,
        submissionStats,
        chatStats: {
          totalMessages: chatStats.totalMessages,
          participation: Object.entries(chatStats.messagesByMember).map(
            ([memberId, count]) => {
              const member = team.members.find(
                (m) => m.user._id.toString() === memberId
              );
              return {
                memberId,
                fullName: member?.user.user.fullName || "Unknown",
                messageCount: count,
                percentage:
                  chatStats.totalMessages > 0
                    ? Math.round((count / chatStats.totalMessages) * 100)
                    : 0,
              };
            }
          ),
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get student team analytics", {
      error,
      teamId: params.id,
    });
    throw error;
  }
};

// Get project analytics
export const getProjectAnalytics = async ({ params, user }) => {
  try {
    const project = await Project.findById(params.id)
      .populate("team", "name teamId members")
      .populate({
        path: "team",
        populate: {
          path: "members.user",
          populate: {
            path: "user",
            select: "fullName email profilePicture",
          },
        },
      })
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName email department profilePicture",
        },
      })
      .populate("session", "name startDate endDate deadlines")
      .populate("createdBy", "user")
      .populate({
        path: "createdBy",
        populate: {
          path: "user",
          select: "fullName email",
        },
      });

    if (!project) {
      throw new ValidationError("Project not found");
    }

    // Check permissions - team members, supervisors, or admin can view
    const isTeamMember = project.team.members.some(
      (member) => member.user.user._id.toString() === user.id
    );

    const isProjectSupervisor = project.supervisors.some(
      (supervisor) =>
        supervisor.supervisor.user._id.toString() === user.id &&
        supervisor.status === "accepted"
    );

    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isTeamMember && !isProjectSupervisor && !isAdmin) {
      throw new ValidationError(
        "You do not have permission to view this project"
      );
    }

    // Process submissions with grading info
    const submissions = (project.submissions || []).map((submission) => {
      return {
        ...submission.toObject(),
        isGraded: submission.marks && submission.marks.score !== undefined,
      };
    });

    // Calculate submission stats
    const submissionStats = {
      total: submissions.length,
      graded: submissions.filter((s) => s.isGraded).length,
      pending: submissions.filter((s) => !s.isGraded).length,
      averageScore:
        submissions.filter((s) => s.isGraded).length > 0
          ? submissions
              .filter((s) => s.isGraded)
              .reduce((sum, s) => sum + s.marks.score, 0) /
            submissions.filter((s) => s.isGraded).length
          : null,
    };

    // Get relevant deadlines from session
    const relevantDeadlines = project.session.deadlines
      .filter((deadline) =>
        ["project_submission", "report_submission", "presentation"].includes(
          deadline.type
        )
      )
      .map((deadline) => ({
        ...deadline.toObject(),
        isPast: new Date(deadline.date) < new Date(),
        timeRemaining: Math.max(
          0,
          Math.round(
            (new Date(deadline.date) - new Date()) / (1000 * 60 * 60 * 24)
          )
        ),
      }));

    // Calculate progress by component if available
    let componentProgress = null;
    if (project.type === "research" && project.researchComponents) {
      const components = Object.keys(project.researchComponents);
      const completedComponents = components.filter(
        (key) => project.researchComponents[key].status === "completed"
      );

      componentProgress = {
        type: "research",
        total: components.length,
        completed: completedComponents.length,
        percentage:
          components.length > 0
            ? Math.round((completedComponents.length / components.length) * 100)
            : 0,
        components: Object.entries(project.researchComponents).map(
          ([key, value]) => ({
            name: key,
            status: value.status,
            notes: value.notes,
          })
        ),
      };
    } else if (project.type === "project" && project.projectComponents) {
      const components = Object.keys(project.projectComponents);
      const completedComponents = components.filter(
        (key) => project.projectComponents[key].status === "completed"
      );

      componentProgress = {
        type: "project",
        total: components.length,
        completed: completedComponents.length,
        percentage:
          components.length > 0
            ? Math.round((completedComponents.length / components.length) * 100)
            : 0,
        components: Object.entries(project.projectComponents).map(
          ([key, value]) => ({
            name: key,
            status: value.status,
            notes: value.notes,
          })
        ),
      };
    }

    return {
      success: true,
      data: {
        project: {
          _id: project._id,
          name: project.name,
          type: project.type,
          description: project.description,
          objectives: project.objectives,
          status: project.status,
          technologies: project.technologies,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          createdBy: project.createdBy
            ? {
                _id: project.createdBy._id,
                fullName: project.createdBy.user?.fullName || "Unknown",
              }
            : null,
        },
        team: {
          _id: project.team._id,
          name: project.team.name,
          teamId: project.team.teamId,
          members: project.team.members.map((member) => ({
            _id: member.user._id,
            fullName: member.user.user?.fullName || "Unknown",
            role: member.role,
          })),
        },
        supervisors: project.supervisors
          .filter((supervisor) => supervisor.status === "accepted")
          .map((supervisor) => ({
            _id: supervisor.supervisor._id,
            fullName: supervisor.supervisor.user?.fullName || "Unknown",
            department: supervisor.supervisor.user?.department,
            isMainSupervisor: supervisor.isMainSupervisor,
          })),
        session: {
          _id: project.session._id,
          name: project.session.name,
          startDate: project.session.startDate,
          endDate: project.session.endDate,
        },
        progress: {
          overall: project.progress,
          components: componentProgress,
          milestones:
            project.timeline?.milestones?.map((milestone) => ({
              ...milestone.toObject(),
              isPast: new Date(milestone.dueDate) < new Date(),
            })) || [],
        },
        submissions: {
          list: submissions.sort(
            (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
          ),
          stats: submissionStats,
        },
        deadlines: relevantDeadlines,
        finalGrade: project.finalGrade,
      },
    };
  } catch (error) {
    logger.error("Failed to get project analytics", {
      error,
      projectId: params.id,
    });
    throw error;
  }
};

// Get session overview with analytics
export const getSessionOverview = async ({ params }) => {
  try {
    const session = await Session.findById(params.id);

    if (!session) {
      throw new ValidationError("Session not found");
    }

    // Get basic stats
    const teamsCount = await Team.countDocuments({ session: session._id });
    const projectsCount = await Project.countDocuments({
      session: session._id,
    });

    // Get teams with their projects
    const teams = await Team.find({ session: session._id })
      .populate("project", "name type status progress")
      .select("name teamId members supervisors project")
      .lean();

    // Extract unique student and supervisor counts
    const uniqueStudentIds = new Set();
    const uniqueSupervisorIds = new Set();

    teams.forEach((team) => {
      // Add students
      team.members?.forEach((member) => {
        uniqueStudentIds.add(member.user.toString());
      });

      // Add supervisors
      team.supervisors?.forEach((supervisor) => {
        if (supervisor.status === "active") {
          uniqueSupervisorIds.add(supervisor.supervisor.toString());
        }
      });
    });

    // Get project type distribution
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

    // Get deadlines with status
    const now = new Date();
    const deadlines = session.deadlines.map((deadline) => {
      const deadlineDate = new Date(deadline.date);
      const isPast = deadlineDate < now;

      return {
        ...deadline.toObject(),
        isPast,
        timeRemaining: isPast
          ? 0
          : Math.round((deadlineDate - now) / (1000 * 60 * 60 * 24)),
      };
    });

    // Get teams without projects
    const teamsWithoutProjects = teams.filter((team) => !team.project).length;

    // Get teams without supervisors
    const teamsWithoutSupervisors = teams.filter(
      (team) => !team.supervisors || team.supervisors.length === 0
    ).length;

    return {
      success: true,
      data: {
        session: {
          _id: session._id,
          name: session.name,
          startDate: session.startDate,
          endDate: session.endDate,
          status: session.status,
          progress: session.progress,
          durationMonths: session.durationMonths,
        },
        stats: {
          teamsCount,
          projectsCount,
          studentsCount: uniqueStudentIds.size,
          supervisorsCount: uniqueSupervisorIds.size,
          teamsWithoutProjects,
          teamsWithoutSupervisors,
          projectTypeDistribution,
          projectStatusDistribution,
        },
        deadlines,
      },
    };
  } catch (error) {
    logger.error("Failed to get session overview", {
      error,
      sessionId: params.id,
    });
    throw error;
  }
};

// Get student analytics
export const getStudentAnalytics = async ({ params, user }) => {
  try {
    const studentId = params.id;

    // Find student
    const student = await Student.findById(studentId).populate(
      "user",
      "fullName email profilePicture status"
    );

    if (!student) {
      throw new ValidationError("Student not found");
    }

    // Check permissions - only self, supervisors for their teams, or admin can view
    const isSelf = student.user._id.toString() === user.id;
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    let isSupervisor = false;

    if (user.role === "supervisor") {
      // Find if this supervisor supervises any team containing this student
      const supervisor = await Supervisor.findOne({ user: user.id });

      if (supervisor) {
        const supervisedTeams = await Team.find({
          "supervisors.supervisor": supervisor._id,
          "supervisors.status": "active",
          "members.user": studentId,
        });

        isSupervisor = supervisedTeams.length > 0;
      }
    }

    if (!isSelf && !isSupervisor && !isAdmin) {
      throw new ValidationError(
        "You do not have permission to view this student"
      );
    }

    // Get active session
    const activeSession = await Session.findOne({ status: "active" });

    // Get student teams
    const teams = await Team.find({
      "members.user": studentId,
      ...(activeSession ? { session: activeSession._id } : {}),
    })
      .populate("project", "name type status progress")
      .populate({
        path: "supervisors.supervisor",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .select("name teamId members supervisors project session status");

    // Extract leadership roles
    const leadershipTeams = teams.filter((team) => {
      const memberRecord = team.members.find(
        (m) => m.user.toString() === studentId
      );
      return memberRecord && memberRecord.role === "leader";
    });

    // Get projects this student is part of
    const projectIds = teams
      .filter((team) => team.project)
      .map((team) => team.project._id);

    const projects = await Project.find({
      _id: { $in: projectIds },
    }).select("name type status submissions finalGrade");

    // Calculate team participation stats
    const teamStats = {
      total: teams.length,
      asLeader: leadershipTeams.length,
      asMember: teams.length - leadershipTeams.length,
      withProjects: teams.filter((team) => team.project).length,
      withoutProjects: teams.filter((team) => !team.project).length,
    };

    // Calculate submission stats
    const submissions = [];
    projects.forEach((project) => {
      project.submissions?.forEach((submission) => {
        if (submission.submittedBy.toString() === studentId) {
          submissions.push({
            ...submission.toObject(),
            projectName: project.name,
          });
        }
      });
    });

    const submissionStats = {
      total: submissions.length,
      graded: submissions.filter((s) => s.marks && s.marks.score !== undefined)
        .length,
      pending: submissions.filter(
        (s) => !s.marks || s.marks.score === undefined
      ).length,
    };

    // Calculate average grade if available
    const grades = submissions
      .filter((s) => s.marks && s.marks.score !== undefined)
      .map((s) => s.marks.score);

    const averageGrade =
      grades.length > 0
        ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length
        : null;

    // Get final grades if available
    const finalGrades = projects
      .filter(
        (project) =>
          project.finalGrade && project.finalGrade.score !== undefined
      )
      .map((project) => ({
        projectName: project.name,
        grade: project.finalGrade.score,
        outOf: project.finalGrade.outOf,
        givenAt: project.finalGrade.givenAt,
      }));

    return {
      success: true,
      data: {
        student: {
          _id: student._id,
          studentId: student.studentId,
          user: student.user,
          semester: student.semester,
          batch: student.batch,
          skills: student.skills,
        },
        teams: teams.map((team) => ({
          _id: team._id,
          name: team.name,
          teamId: team.teamId,
          role:
            team.members.find((m) => m.user.toString() === studentId)?.role ||
            "member",
          project: team.project
            ? {
                _id: team.project._id,
                name: team.project.name,
                type: team.project.type,
                status: team.project.status,
                progress: team.project.progress,
              }
            : null,
          supervisors: team.supervisors
            .filter((s) => s.status === "active")
            .map((s) => ({
              _id: s.supervisor._id,
              fullName: s.supervisor.user?.fullName || "Unknown",
            })),
        })),
        stats: {
          teams: teamStats,
          submissions: submissionStats,
          averageGrade:
            averageGrade !== null ? Math.round(averageGrade * 10) / 10 : null,
        },
        submissions: submissions.sort(
          (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
        ),
        grades: finalGrades,
      },
    };
  } catch (error) {
    logger.error("Failed to get student analytics", {
      error,
      studentId: params.id,
    });
    throw error;
  }
};

// System overview analytics
export const getSystemOverview = async (context) => {
  try {
    // Get user counts
    const userCount = await User.countDocuments();
    const studentCount = await User.countDocuments({ role: "student" });
    const supervisorCount = await User.countDocuments({ role: "supervisor" });
    const adminCount = await User.countDocuments({ role: "admin" });

    // Get team and project counts
    const teamCount = await Team.countDocuments();
    const projectCount = await Project.countDocuments();

    // Get active session
    const activeSession = await Session.findOne({ status: "active" });

    return {
      success: true,
      data: {
        users: {
          total: userCount,
          students: studentCount,
          supervisors: supervisorCount,
          admins: adminCount,
        },
        teams: teamCount,
        projects: projectCount,
        activeSession: activeSession
          ? {
              id: activeSession._id,
              name: activeSession.name,
              startDate: activeSession.startDate,
              endDate: activeSession.endDate,
            }
          : null,
      },
    };
  } catch (error) {
    logger.error("Error getting system overview", { error });
    return {
      success: false,
      error: error.message || "Failed to get system overview",
    };
  }
};

// Team statistics
export const getTeamStatistics = async (context) => {
  try {
    // Implement team statistics logic
    return {
      success: true,
      data: {
        message: "Team statistics endpoint - to be implemented",
      },
    };
  } catch (error) {
    logger.error("Error getting team statistics", { error });
    return {
      success: false,
      error: error.message || "Failed to get team statistics",
    };
  }
};

// Submission statistics
export const getSubmissionStatistics = async (context) => {
  try {
    // Implement submission statistics logic
    return {
      success: true,
      data: {
        message: "Submission statistics endpoint - to be implemented",
      },
    };
  } catch (error) {
    logger.error("Error getting submission statistics", { error });
    return {
      success: false,
      error: error.message || "Failed to get submission statistics",
    };
  }
};

// Performance metrics
export const getPerformanceMetrics = async (context) => {
  try {
    // Implement performance metrics logic
    return {
      success: true,
      data: {
        message: "Performance metrics endpoint - to be implemented",
      },
    };
  } catch (error) {
    logger.error("Error getting performance metrics", { error });
    return {
      success: false,
      error: error.message || "Failed to get performance metrics",
    };
  }
};

// Session analytics
export const getSessionAnalytics = async (sessionId) => {
  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Get teams and projects for this session
    const teamsCount = await Team.countDocuments({ session: sessionId });
    const projectsCount = await Project.countDocuments({ session: sessionId });

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
        stats: {
          teams: teamsCount,
          projects: projectsCount,
          progress: session.progressPercentage || 0,
        },
      },
    };
  } catch (error) {
    logger.error("Error getting session analytics", { error, sessionId });
    return {
      success: false,
      error: error.message || "Failed to get session analytics",
    };
  }
};

// Get team performance analytics
export const getTeamAnalytics = async ({ params, user }) => {
  try {
    const team = await Team.findById(params.teamId)
      .populate("members.user")
      .populate("supervisors.supervisor")
      .populate({
        path: "project",
        populate: {
          path: "submissions",
          populate: {
            path: "submittedBy feedback.providedBy",
            select: "fullName email"
          }
        }
      });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Calculate submission performance
    const submissions = team.project?.submissions || [];
    const submissionAnalytics = {
      total: submissions.length,
      onTime: submissions.filter(s => !s.isLateSubmission).length,
      late: submissions.filter(s => s.isLateSubmission).length,
      averageScore: calculateAverageScore(submissions),
      byType: groupSubmissionsByType(submissions)
    };

    // Calculate individual contributions
    const memberContributions = team.members.map(member => ({
      id: member.user._id,
      name: member.user.fullName,
      role: member.role,
      submissions: countMemberSubmissions(submissions, member.user._id),
      averageScore: calculateMemberAverageScore(submissions, member.user._id),
      lastSubmission: getLastMemberSubmission(submissions, member.user._id)
    }));

    // Calculate project progress
    const projectProgress = team.project ? {
      status: team.project.status,
      progress: team.project.progress,
      milestones: calculateMilestoneProgress(team.project),
      lastUpdate: team.project.updatedAt
    } : null;

    return {
      success: true,
      data: {
        teamInfo: {
          name: team.name,
          memberCount: team.members.length,
          supervisors: team.supervisors.map(s => ({
            name: s.supervisor.user.fullName,
            role: s.role
          }))
        },
        submissionAnalytics,
        memberContributions,
        projectProgress
      }
    };
  } catch (error) {
    logger.error("Failed to get team analytics", { error, teamId: params.teamId });
    throw error;
  }
};

// Helper functions
const calculateAverageScore = (submissions) => {
  const gradedSubmissions = submissions.filter(s => s.marks && s.marks.score !== undefined);
  if (gradedSubmissions.length === 0) return null;
  const total = gradedSubmissions.reduce((acc, s) => acc + s.marks.score, 0);
  return Math.round((total / gradedSubmissions.length) * 10) / 10;
};

const calculateProjectContribution = (submissions, project) => {
  if (!project || !submissions || submissions.length === 0) return null;
  const totalSubmissions = project.submissions?.length || 0;
  if (totalSubmissions === 0) return null;
  return Math.round((submissions.length / totalSubmissions) * 100);
};

const calculateOverallGrade = (grades) => {
  if (!grades || grades.length === 0) return null;
  const validGrades = grades.filter(g => g.score !== undefined);
  if (validGrades.length === 0) return null;
  const total = validGrades.reduce((acc, g) => acc + g.score, 0);
  return Math.round((total / validGrades.length) * 10) / 10;
};

const groupSubmissionsByType = (submissions) => {
  return submissions.reduce((acc, s) => {
    acc[s.submissionType] = (acc[s.submissionType] || 0) + 1;
    return acc;
  }, {});
};

const calculateMilestoneProgress = (project) => {
  if (!project.milestones || project.milestones.length === 0) return null;

  const completed = project.milestones.filter(m => m.status === "completed").length;
  return {
    total: project.milestones.length,
    completed,
    percentage: (completed / project.milestones.length) * 100
  };
};

const getTeamRole = (team, studentId) => {
  const member = team.members.find(m => m.user._id.toString() === studentId.toString());
  return member ? member.role : null;
};

const calculateFeedbackStats = (submissions) => {
  const feedbackSubmissions = submissions.filter(s => s.feedback);
  return {
    total: feedbackSubmissions.length,
    averageResponseTime: calculateAverageFeedbackTime(feedbackSubmissions),
    byType: groupFeedbackByType(feedbackSubmissions)
  };
};

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

    // Get all supervisors with their detailed loads
    const supervisors = await Supervisor.find()
      .populate('user', 'fullName email department')
      .populate({
        path: 'teams',
        match: { session: session?._id },
        select: 'name members projects submissions'
      });

    const supervisorAnalytics = supervisors.map(sup => ({
      _id: sup._id,
      name: sup.user.fullName,
      department: sup.user.department,
      currentLoad: sup.teams.length,
      maxLoad: session?.teamsPerSupervisor || 5,
      studentCount: sup.teams.reduce((acc, team) => acc + team.members.length, 0),
      projectCount: sup.teams.reduce((acc, team) => acc + (team.projects ? team.projects.length : 0), 0),
      submissionCount: sup.teams.reduce((acc, team) =>
        acc + team.projects.reduce((pacc, proj) => pacc + (proj.submissions ? proj.submissions.length : 0), 0), 0),
      activeTeams: sup.teams.filter(t => t.status === 'active').length,
      completedProjects: sup.teams.reduce((acc, team) =>
        acc + team.projects.filter(p => p.status === 'completed').length, 0)
    }));

    // Get detailed project statistics
    const projects = await Project.find(session ? { session: session._id } : {});
    const projectTypeStats = projects.reduce((acc, project) => {
      acc[project.type] = (acc[project.type] || 0) + 1;
      return acc;
    }, {});

    // Get detailed team statistics with submission rates
    const teams = await Team.find(session ? { session: session._id } : {});
    const teamStats = {
      total: teams.length,
      withSupervisor: teams.filter(t => t.supervisors.length > 0).length,
      withoutSupervisor: teams.filter(t => t.supervisors.length === 0).length,
      averageSize: teams.reduce((acc, team) => acc + team.members.length, 0) / teams.length || 0,
      submissionRate: teams.reduce((acc, team) => {
        const projectCount = team.projects ? team.projects.length : 0;
        const submissionCount = team.projects ? team.projects.reduce((pacc, proj) =>
          pacc + (proj.submissions ? proj.submissions.length : 0), 0) : 0;
        return acc + (projectCount > 0 ? submissionCount / projectCount : 0);
      }, 0) / teams.length || 0,
      completionRate: teams.reduce((acc, team) => {
        const projectCount = team.projects ? team.projects.length : 0;
        const completedCount = team.projects ? team.projects.filter(p => p.status === 'completed').length : 0;
        return acc + (projectCount > 0 ? completedCount / projectCount : 0);
      }, 0) / teams.length || 0
    };

    return {
      success: true,
      data: {
        session: session ? {
          _id: session._id,
          name: session.name,
          startDate: session.startDate,
          endDate: session.endDate,
          status: session.status,
          progress: calculateSessionProgress(session),
          remainingDays: Math.ceil((new Date(session.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
          totalDuration: Math.ceil((new Date(session.endDate) - new Date(session.startDate)) / (1000 * 60 * 60 * 24))
        } : null,
        supervisorStats: {
          total: supervisors.length,
          analytics: supervisorAnalytics,
          averageLoad: supervisorAnalytics.reduce((acc, sup) => acc + sup.currentLoad, 0) / supervisors.length || 0
        },
        projectStats: {
          total: projects.length,
          byType: projectTypeStats,
          researchBased: projectTypeStats.research_based || 0,
          projectBased: projectTypeStats.project_based || 0,
          completionRate: projects.filter(p => p.status === 'completed').length / projects.length || 0
        },
        teamStats: {
          ...teamStats,
          supervisorAssignmentRate: teamStats.withSupervisor / teamStats.total || 0
        },
        timelineAnalytics: {
          deadlines: session?.deadlines.map(d => ({
            title: d.title,
            dueDate: d.dueDate,
            type: d.type,
            isPast: new Date(d.dueDate) < new Date(),
            daysRemaining: Math.ceil((new Date(d.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
          })) || []
        }
      }
    };
  } catch (error) {
    logger.error("Failed to get system analytics", { error });
    throw error;
  }
}
