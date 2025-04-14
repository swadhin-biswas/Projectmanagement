import { Project } from "../models/Project.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { trackSubmissionActivity } from "../services/activityService.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import logger from "../utils/logger.js";

// Create a new project (for team leader)
export const createProject = async ({ body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate("team");

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    if (!student.team) {
      throw new ValidationError(
        "You must be part of a team to create a project"
      );
    }

    const team = await Team.findById(student.team._id);

    // Check if user is team leader
    const isLeader = team.members.find(
      (m) => m.user.toString() === user.id && m.role === "leader"
    );

    if (!isLeader) {
      throw new ForbiddenError("Only team leader can create projects");
    }

    // Check if team already has a project
    const existingProject = await Project.findOne({ team: team._id });
    if (existingProject) {
      throw new ValidationError("Team already has a project");
    }

    // Get active session
    const session = await Session.findOne({ isActive: true });
    if (!session) {
      throw new ValidationError("No active session found");
    }

    // Validate supervisors
    if (!body.supervisorIds || body.supervisorIds.length === 0) {
      throw new ValidationError("At least one supervisor must be selected");
    }

    const supervisors = await Supervisor.find({
      _id: { $in: body.supervisorIds },
      isApproved: true,
      status: "active",
    });

    if (supervisors.length === 0) {
      throw new NotFoundError("No valid supervisors found");
    }

    // Format supervisors for project schema
    const supervisorsList = supervisors.map((supervisor, index) => ({
      supervisor: supervisor._id,
      status: "pending",
      requestedAt: new Date(),
      isMainSupervisor: index === 0, // First supervisor is the main one
      role: index === 0 ? "primary" : "co_supervisor",
    }));

    // Create project with specified details
    const project = new Project({
      name: body.name,
      type: body.type,
      category: body.category,
      description: body.description,
      objectives: body.objectives || [],
      team: team._id,
      supervisors: supervisorsList,
      status: "pending_approval",
      session: session._id,
      technologies: body.technologies || [],
      tags: body.tags || [],
      createdBy: student._id,
      timeline: {
        startDate: body.timeline?.startDate
          ? new Date(body.timeline.startDate)
          : new Date(),
        endDate: body.timeline?.endDate
          ? new Date(body.timeline.endDate)
          : null,
        milestones:
          body.timeline?.milestones?.map((m) => ({
            title: m.title,
            description: m.description,
            dueDate: new Date(m.dueDate),
            status: "pending",
          })) || [],
        currentPhase: "planning",
      },
    });

    await project.save();

    // Update team with project reference
    team.project = project._id;
    await team.save();

    // Send notifications to supervisors
    for (const supervisor of supervisors) {
      await Notification.create({
        recipient: supervisor.user,
        type: "project_supervision_request",
        title: "New Project Supervision Request",
        message: `Team "${team.name}" has requested your supervision for project "${project.name}"`,
        relatedProject: project._id,
        relatedTeam: team._id,
        sender: user.id,
      });
    }

    return project;
  } catch (error) {
    throw error;
  }
};

// Submit project (for team members)
export const submitProject = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate("team");

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const project = await Project.findById(params.projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if user is in the project team
    const team = await Team.findById(project.team);
    const isMember = team.members.some(
      (m) =>
        m.user.toString() === student._id.toString() && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this project team");
    }

    // Check if current session is active
    const session = await Session.findById(project.session);
    if (!session.isActive) {
      throw new ValidationError(
        "Submissions are only allowed during active sessions"
      );
    }

    // Check deadline
    const submissionDeadline = session.deadlines.find(
      (d) => d.type === "project_submission" || d.type === "final_submission"
    );

    const now = new Date();
    let isLate = false;

    if (submissionDeadline) {
      const deadlineDate = new Date(submissionDeadline.dueDate);
      isLate = now > deadlineDate;

      if (
        isLate &&
        !submissionDeadline.submissionOptions?.allowLateSubmission
      ) {
        throw new ValidationError("Submission deadline has passed");
      }
    }

    // Create submission
    project.submissions.push({
      title: body.title,
      description: body.description,
      githubUrl: body.githubUrl,
      deployedUrl: body.deployedUrl || "",
      submittedBy: student._id,
      submittedAt: new Date(),
      status: "pending_review",
      version: project.submissions.length + 1,
    });

    // Update project status and notify team members
    project.status = "submitted";
    project.lastSubmittedAt = new Date();

    // Notify team members
    const teamMembers = team.members
      .filter((m) => m.user.toString() !== student._id.toString())
      .map((m) => m.user);

    const notifications = teamMembers.map((memberId) => ({
      user: memberId,
      type: "project_submission",
      title: "New Project Submission",
      message: `A new version of the project "${project.name}" has been submitted`,
      link: `/student/project/${project._id}/submissions`,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Also notify supervisor if assigned
    if (project.supervisor) {
      await Notification.create({
        user: project.supervisor,
        type: "submission_for_review",
        title: "New Project Submission",
        message: `Team ${team.name} has submitted a new version of project "${project.name}"`,
        link: `/supervisor/review/project/${project._id}`,
      });
    }

    await project.save();
    await trackSubmissionActivity(project._id, user.id, submission);

    return {
      success: true,
      data: project,
      message: "Project submitted successfully",
    };
  } catch (error) {
    logger.error("Failed to submit project", {
      error,
      userId: user.id,
      projectId: params.projectId,
    });
    throw error;
  }
};

// Submit project report
export const submitProjectReport = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate("team");

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    // Find the project
    const project = await Project.findById(params.id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if user is in the project team
    const team = await Team.findById(project.team);
    if (!team) {
      throw new NotFoundError("Project team not found");
    }

    const isMember = team.members.some(
      (m) => m.user.toString() === user.id && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this project team");
    }

    // Check if current session is active
    const session = await Session.findById(project.session);
    if (!session?.isActive) {
      throw new ValidationError(
        "Submissions are only allowed during active sessions"
      );
    }

    // Check for submission deadline if it exists
    let isLate = false;
    const submissionDeadline = session.deadlines?.find(
      (d) => d.type === body.submissionType || d.type === "submission"
    );

    if (submissionDeadline) {
      const deadlineDate = new Date(submissionDeadline.dueDate);
      const now = new Date();
      isLate = now > deadlineDate;

      if (isLate && !submissionDeadline.allowLateSubmission) {
        throw new ValidationError(
          `Submission deadline (${deadlineDate.toLocaleDateString()}) has passed`
        );
      }
    }

    // Create new submission entry
    const newSubmission = {
      title: body.title,
      description: body.description,
      fileUrl: body.fileUrl,
      submissionType: body.submissionType,
      submittedBy: student._id,
      submittedAt: new Date(),
      attachments: body.attachments || [],
      isLate: isLate,
    };

    // Add to project submissions
    project.submissions.push(newSubmission);
    await project.save();

    // Track this activity
    await trackSubmissionActivity({
      user: user.id,
      project: project._id,
      team: team._id,
      action: "submitted_report",
      details: {
        submissionType: body.submissionType,
        title: body.title,
      },
    });

    // Notify supervisors
    for (const supervisorObj of project.supervisors) {
      const supervisor = await Supervisor.findById(supervisorObj.supervisor);
      if (supervisor) {
        await Notification.create({
          recipient: supervisor.user,
          type: "project_submission",
          title: "New Project Report Submission",
          message: `Team "${team.name}" has submitted a "${body.submissionType}" for project "${project.name}"`,
          relatedProject: project._id,
          relatedTeam: team._id,
          sender: user.id,
        });
      }
    }

    // Return the new submission
    return project.submissions[project.submissions.length - 1];
  } catch (error) {
    throw error;
  }
};

// Get project by ID
export const getProjectById = async ({ params, user }) => {
  try {
    const projectId = params.id;

    const project = await Project.findById(projectId)
      .populate({
        path: "team",
        populate: {
          path: "members.user",
          select: "fullName email profilePicture",
        },
      })
      .populate({
        path: "supervisors.user",
        select: "fullName email department",
      })
      .populate("session")
      .populate({
        path: "submissions.submittedBy",
        populate: {
          path: "user",
          select: "fullName email profilePicture",
        },
      });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check permissions based on user role
    if (user.role === "student") {
      // For students, check if they are part of the team
      const student = await Student.findOne({ user: user.id });
      if (!student) {
        throw new NotFoundError("Student profile not found");
      }

      const team = await Team.findById(project.team._id);
      const isMember = team.members.some(
        (m) =>
          m.user.toString() === student._id.toString() && m.status === "active"
      );

      if (!isMember) {
        throw new ForbiddenError("You don't have access to this project");
      }
    } else if (user.role === "supervisor") {
      // For supervisors, check if they are supervising this project
      const supervisor = await Supervisor.findOne({ user: user.id });
      if (!supervisor) {
        throw new NotFoundError("Supervisor profile not found");
      }

      const isSupervisor = project.supervisors.some(
        (s) => s.user._id.toString() === supervisor.user.toString()
      );

      if (!isSupervisor) {
        throw new ForbiddenError("You don't have access to this project");
      }
    }
    // Admin and super_admin have access to all projects

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    logger.error("Failed to get project by ID", {
      error,
      userId: user.id,
      projectId: params.id,
    });
    throw error;
  }
};

// Get all projects for the current student
export const getMyProjects = async ({ user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate("team");

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    if (!student.team) {
      return {
        success: true,
        data: [],
        message: "You are not part of any team",
      };
    }

    const projects = await Project.find({ team: student.team._id })
      .populate({
        path: "team",
        select: "name members",
        populate: {
          path: "members.user",
          select: "fullName email profilePicture",
        },
      })
      .populate({
        path: "supervisors.user",
        select: "fullName email department",
      })
      .populate("session", "name startDate endDate status")
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: projects,
    };
  } catch (error) {
    logger.error("Failed to get student projects", { error, userId: user.id });
    throw error;
  }
};

// Update project
export const updateProject = async ({ params, body, user }) => {
  try {
    const student = await Student.findOne({ user: user.id }).populate("team");

    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const project = await Project.findById(params.id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if user is part of the team
    const team = await Team.findById(project.team);
    const isMember = team.members.some(
      (m) =>
        m.user.toString() === student._id.toString() && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this project team");
    }

    // Only allow updates if project is in draft or rejected status
    // unless the user is an admin
    if (user.role !== "admin" && user.role !== "super_admin") {
      if (!["draft", "rejected"].includes(project.status)) {
        throw new ForbiddenError(
          "Project can only be updated when in draft or rejected status"
        );
      }
    }

    // Update project fields
    if (body.name) project.name = body.name;
    if (body.description) project.description = body.description;
    if (body.type) project.type = body.type;

    // Update objectives if provided
    if (body.objectives) {
      project.objectives = body.objectives;
    }

    // Update technologies if provided
    if (body.technologies) {
      project.technologies = body.technologies;
    }

    // Update milestones if provided
    if (body.milestones) {
      // Keep existing milestone status if available
      const updatedMilestones = body.milestones.map((newMilestone) => {
        const existingMilestone = project.milestones.find(
          (m) => m._id.toString() === newMilestone._id
        );

        return {
          ...newMilestone,
          status: existingMilestone
            ? existingMilestone.status
            : newMilestone.status || "pending",
        };
      });

      project.milestones = updatedMilestones;
    }

    // Update supervisors if provided
    if (body.supervisorIds && Array.isArray(body.supervisorIds)) {
      // Get existing supervisors to preserve status
      const existingSupervisors = project.supervisors || [];

      // Create updated supervisors array
      const updatedSupervisors = [];

      for (const supId of body.supervisorIds) {
        const supervisor = await Supervisor.findOne({ user: supId });
        if (!supervisor) {
          throw new NotFoundError(`Supervisor with ID ${supId} not found`);
        }

        // Check if this supervisor already exists in the project
        const existingSupervisor = existingSupervisors.find(
          (s) => s.user.toString() === supervisor.user.toString()
        );

        updatedSupervisors.push({
          user: supervisor.user,
          status: existingSupervisor ? existingSupervisor.status : "pending",
        });
      }

      project.supervisors = updatedSupervisors;
    }

    await project.save();

    return {
      success: true,
      data: project,
      message: "Project updated successfully",
    };
  } catch (error) {
    logger.error("Failed to update project", {
      error,
      userId: user.id,
      projectId: params.id,
    });
    throw error;
  }
};

// Get project submissions
export const getProjectSubmissions = async ({ params, user }) => {
  try {
    const student = await Student.findOne({ user: user.id });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const project = await Project.findById(params.id)
      .populate({
        path: "submissions.submittedBy",
        select: "user",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate({
        path: "submissions.feedback.givenBy",
        select: "user",
        populate: {
          path: "user",
          select: "fullName",
        },
      });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if user is in the project team
    const team = await Team.findById(project.team);
    if (!team) {
      throw new NotFoundError("Project team not found");
    }

    const isMember = team.members.some(
      (m) => m.user.toString() === user.id && m.status === "active"
    );

    if (!isMember) {
      throw new ForbiddenError("You are not a member of this project team");
    }

    // Format submissions with proper naming
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
              givenBy: submission.feedback.givenBy?.user?.fullName || "Unknown",
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

    return formattedSubmissions;
  } catch (error) {
    logger.error("Failed to get project submissions", {
      error,
      userId: user.id,
      projectId: params.id,
    });
    throw error;
  }
};

// Get available supervisors
export const getAvailableSupervisors = async ({ user }) => {
  try {
    // Get active session
    const activeSession = await Session.findOne({ isActive: true });
    if (!activeSession) {
      throw new ValidationError("No active session found");
    }

    // Get all approved and active supervisors
    const supervisors = await Supervisor.find({
      isApproved: true,
      status: "active",
    }).populate({
      path: "user",
      select: "fullName email department",
    });

    // Count how many projects each supervisor is already overseeing for the active session
    const supervisorProjects = await Project.aggregate([
      {
        $match: {
          session: activeSession._id,
          "supervisors.status": { $in: ["accepted", "pending"] },
        },
      },
      { $unwind: "$supervisors" },
      {
        $group: {
          _id: "$supervisors.supervisor",
          count: { $sum: 1 },
        },
      },
    ]);

    // Map to a dictionary for easier lookup
    const projectCounts = {};
    supervisorProjects.forEach((item) => {
      projectCounts[item._id.toString()] = item.count;
    });

    // Format response with necessary information
    const formattedSupervisors = supervisors.map((supervisor) => {
      const currentProjects = projectCounts[supervisor._id.toString()] || 0;

      return {
        _id: supervisor._id,
        name: supervisor.user?.fullName || "Unknown",
        email: supervisor.user?.email,
        department: supervisor.user?.department || "Not specified",
        expertise: supervisor.expertise || [],
        researchInterests: supervisor.researchInterests || [],
        maxProjects: supervisor.maxProjects || 5,
        currentProjects: currentProjects,
        availability: supervisor.maxProjects
          ? Math.max(0, supervisor.maxProjects - currentProjects)
          : "Unlimited",
      };
    });

    // Sort by availability (most available first)
    formattedSupervisors.sort((a, b) => {
      if (a.availability === "Unlimited") return -1;
      if (b.availability === "Unlimited") return 1;
      return b.availability - a.availability;
    });

    return formattedSupervisors;
  } catch (error) {
    throw error;
  }
};
