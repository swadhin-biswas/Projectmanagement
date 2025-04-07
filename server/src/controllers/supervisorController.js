// server/src/controllers/supervisorController.js
import { Project } from "../models/Project.js";
import { Student } from "../models/Student.js";
import { Supervisor } from "../models/Supervisor.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { sendBulkEmail, sendEmail } from "../services/emailService.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import logger from "../utils/logger.js";

// Get supervised projects
export const getSupervisedProjects = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const projects = await Project.find({
      "supervisors.user": supervisor._id,
      "supervisors.status": "accepted",
    })
      .populate("team")
      .populate("session")
      .populate({
        path: "team",
        populate: {
          path: "members.user",
          select: "fullName email profilePicture",
        },
      });

    return {
      success: true,
      data: projects,
    };
  } catch (error) {
    logger.error("Failed to get supervised projects", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Get project requests
export const getProjectRequests = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const pendingProjects = await Project.find({
      "supervisors.user": supervisor._id,
      "supervisors.status": "pending",
    })
      .populate("team")
      .populate("session")
      .populate({
        path: "team",
        populate: {
          path: "members.user",
          select: "fullName email profilePicture",
        },
      });

    return {
      success: true,
      data: pendingProjects,
    };
  } catch (error) {
    logger.error("Failed to get project requests", { error, userId: user.id });
    throw error;
  }
};

// Respond to project request
export const respondToProjectRequest = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const project = await Project.findById(params.projectId);

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Find supervisor in the project
    const supervisorIndex = project.supervisors.findIndex(
      (s) =>
        s.user.toString() === supervisor.user.toString() &&
        s.status === "pending"
    );

    if (supervisorIndex === -1) {
      throw new ValidationError("You have no pending request for this project");
    }

    // Update supervisor status
    if (body.response === "accepted") {
      project.supervisors[supervisorIndex].status = "accepted";
      project.supervisors[supervisorIndex].respondedAt = new Date();

      // Update project status if this was the only pending supervisor
      const pendingSupervisors = project.supervisors.filter(
        (s) => s.status === "pending"
      );
      if (pendingSupervisors.length === 0) {
        project.status = "approved";
      }
    } else if (body.response === "rejected") {
      // Remove supervisor from project
      project.supervisors.splice(supervisorIndex, 1);
    } else {
      throw new ValidationError(
        "Invalid response. Must be 'accepted' or 'rejected'"
      );
    }

    await project.save();

    return {
      success: true,
      data: project,
      message: `Project request ${body.response}`,
    };
  } catch (error) {
    logger.error("Failed to respond to project request", {
      error,
      userId: user.id,
      projectId: params.projectId,
    });
    throw error;
  }
};

// Provide feedback on submission
export const provideSubmissionFeedback = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const project = await Project.findById(params.projectId);

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Check if supervisor is assigned to this project
    const isSupervisor = project.supervisors.some(
      (s) =>
        s.user.toString() === supervisor.user.toString() &&
        s.status === "accepted"
    );

    if (!isSupervisor) {
      throw new ForbiddenError("You are not a supervisor for this project");
    }

    // Find the submission
    const submissionIndex = project.submissions.findIndex(
      (s) => s._id.toString() === params.submissionId
    );

    if (submissionIndex === -1) {
      throw new NotFoundError("Submission not found");
    }

    // Add feedback
    project.submissions[submissionIndex].feedback = {
      comment: body.feedback,
      providedBy: supervisor.user,
      providedAt: new Date(),
      marks: body.marks,
      outOf: body.outOf || 100,
    };

    // Update project status
    project.status = "reviewed";

    await project.save();

    return {
      success: true,
      data: project,
      message: "Feedback provided successfully",
    };
  } catch (error) {
    logger.error("Failed to provide submission feedback", {
      error,
      userId: user.id,
      projectId: params.projectId,
      submissionId: params.submissionId,
    });
    throw error;
  }
};

// Get supervisor dashboard
export const getSupervisorDashboard = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id }).populate(
      "user",
      "fullName email department specialization"
    );

    if (!supervisor) {
      return {
        success: false,
        error: "Supervisor profile not found",
      };
    }

    // Get teams supervised by this supervisor
    const teams = await Team.find({
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "active",
    })
      .populate("members.user", "fullName email profilePicture")
      .populate("project", "name type status")
      .lean();

    if (!teams) {
      return {
        success: true,
        data: {
          supervisor: {
            _id: supervisor._id,
            user: supervisor.user,
          },
          supervisedTeams: [],
          analytics: {
            totalTeams: 0,
            totalStudents: 0,
            projectSubmissions: 0,
            pendingReviews: 0,
          },
        },
      };
    }

    // Calculate analytics
    const totalTeams = teams.length;
    const studentSet = new Set();

    teams.forEach((team) => {
      team.members.forEach((member) => {
        if (member.status === "active") {
          studentSet.add(member.user._id.toString());
        }
      });
    });

    const totalStudents = studentSet.size;

    const projectSubmissions = teams.filter(
      (team) => team.project && team.project.status === "submitted"
    ).length;

    const pendingReviews = teams.filter(
      (team) => team.project && team.project.status === "pending_review"
    ).length;

    return {
      success: true,
      data: {
        supervisor: {
          _id: supervisor._id,
          user: supervisor.user,
          department: supervisor.user.department,
          specialization: supervisor.user.specialization || "",
        },
        supervisedTeams: teams.map((team) => ({
          _id: team._id,
          name: team.name,
          teamId: team.teamId,
          memberCount: team.members.filter((m) => m.status === "active").length,
          maxMembers: team.maxMembers,
          hasSupervisor: true,
          hasProject: Boolean(team.project),
          project: team.project,
        })),
        analytics: {
          totalTeams,
          totalStudents,
          projectSubmissions,
          pendingReviews,
        },
      },
    };
  } catch (error) {
    console.error("Failed to get supervisor dashboard", error);
    return {
      success: false,
      error: "Failed to get supervisor dashboard",
    };
  }
};

// Mark student submission with enhanced feedback
export const markStudentSubmission = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const student = await Student.findById(params.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Enhanced team verification
    const team = await Team.findOne({
      _id: student.team,
      "supervisors.supervisor": supervisor._id,
    });

    if (!team) {
      throw new ForbiddenError("You are not supervising this student's team");
    }

    // Get the project
    const project = await Project.findOne({ team: team._id });
    if (!project) {
      throw new NotFoundError("No project found for this student's team");
    }

    // Record the marks with detailed feedback
    const markData = {
      type: body.category,
      score: body.marks,
      feedback: body.feedback || "",
      breakdown: body.breakdown || {},
      improvements: body.improvements || [],
      strengths: body.strengths || [],
      date: new Date(),
    };

    await supervisor.assignMarks(student._id, project._id, markData);

    // Create notification with enhanced details
    const notification = {
      title: `New ${body.category} Assessment`,
      message: `Your supervisor has provided a new assessment for your ${body.category}.`,
      details: {
        score: body.marks,
        category: body.category,
        hasFeedback: Boolean(body.feedback),
        supervisor: supervisor.user.fullName,
      },
      type: "assessment",
      from: supervisor.user,
      isUrgent: body.isUrgent || false,
      createdAt: new Date(),
    };

    // Add to student notifications
    if (!student.notifications) {
      student.notifications = [];
    }
    student.notifications.push(notification);

    // Send email notification if enabled
    if (student.notificationPreferences?.emailNotifications) {
      await sendEmail({
        to: student.user.email,
        subject: `New Assessment: ${body.category}`,
        template: "assessmentNotification",
        context: {
          studentName: student.user.fullName,
          category: body.category,
          score: body.marks,
          feedback: body.feedback,
          supervisorName: supervisor.user.fullName,
        },
      });
    }

    await student.save();

    return {
      success: true,
      message: "Student marks recorded successfully",
      data: markData,
    };
  } catch (error) {
    logger.error("Failed to mark student submission", {
      error,
      userId: user.id,
      studentId: params.studentId,
    });
    throw error;
  }
};

// Send feedback to student
export const sendStudentFeedback = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const student = await Student.findById(params.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Check if supervisor is assigned to student's team
    const team = await Team.findOne({
      _id: student.team,
      "supervisors.supervisor": supervisor._id,
    });

    if (!team) {
      throw new ForbiddenError("You are not supervising this student's team");
    }

    // Create notification for student
    const notification = {
      type: `supervisor_message`,
      message: body.message,
      from: supervisor.user,
      isRead: false,
      isUrgent: body.isUrgent || false,
      messageType: body.type || "general",
      createdAt: new Date(),
    };

    if (!student.notifications) {
      student.notifications = [];
    }

    student.notifications.push(notification);
    await student.save();

    // Add to supervisor's recent activity
    supervisor.recentActivity.push({
      type: "notification_sent",
      relatedTo: student._id,
      relatedModel: "Student",
      description: `Sent feedback to ${student.user.fullName}`,
      timestamp: new Date(),
    });

    await supervisor.save();

    return {
      success: true,
      message: "Feedback sent to student successfully",
    };
  } catch (error) {
    logger.error("Failed to send feedback to student", {
      error,
      userId: user.id,
      studentId: params.studentId,
    });
    throw error;
  }
};

// Notify team with enhanced messaging
export const notifyTeam = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const team = await Team.findOne({
      _id: params.teamId,
      "supervisors.supervisor": supervisor._id,
    });

    if (!team) {
      throw new ForbiddenError("You are not supervising this team");
    }

    const { message, isUrgent, type = "general", requiresAction = false } = body;

    // Enhanced notification creation
    const notificationData = {
      type: "supervisor_message",
      message: message,
      title: `${isUrgent ? "[URGENT] " : ""}Message from Supervisor`,
      details: {
        type: type,
        category: type,
        requiresAction: requiresAction,
        dueDate: body.dueDate,
        priority: isUrgent ? "high" : "normal",
      },
      from: supervisor.user._id,
      isRead: false,
      isUrgent: isUrgent,
      createdAt: new Date(),
    };

    // Send to all active team members
    const notifications = [];
    for (const member of team.members.filter((m) => m.status === "active")) {
      const studentUser = await Student.findById(member.user);
      if (studentUser) {
        if (!studentUser.notifications) {
          studentUser.notifications = [];
        }

        studentUser.notifications.push(notificationData);

        // Send email if enabled for student
        if (
          studentUser.notificationPreferences?.emailNotifications &&
          body.isUrgent
        ) {
          await sendEmail({
            to: studentUser.user.email,
            subject: notificationData.title,
            template: "supervisorNotification",
            context: {
              studentName: studentUser.user.fullName,
              message: message,
              supervisorName: supervisor.user.fullName,
              teamName: team.name,
              dueDate: body.dueDate,
              requiresAction: requiresAction,
            },
          });
        }

        await studentUser.save();
        notifications.push(studentUser._id);
      }
    }

    // Add to team's activity log
    team.activityLog.push({
      type: "supervisor_notification",
      by: supervisor.user._id,
      message: message,
      timestamp: new Date(),
      metadata: {
        isUrgent: isUrgent,
        category: type,
      },
    });

    await team.save();

    return {
      success: true,
      message: "Notification sent to team successfully",
      data: {
        notifiedMembers: notifications.length,
        sentAt: new Date(),
        deliveryStatus: {
          total: team.members.length,
          delivered: notifications.length,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to notify team", {
      error,
      userId: user.id,
      teamId: params.teamId,
    });
    throw error;
  }
};

// Get supervised students
export const getSupervisedStudents = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get all teams supervised by this supervisor
    const teams = await Team.find({
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "active",
    }).populate({
      path: "members.user",
      select: "fullName email department profilePicture studentId",
      populate: {
        path: "student",
        model: "Student",
      },
    });

    // Extract all students from these teams
    const students = [];
    teams.forEach((team) => {
      team.members.forEach((member) => {
        if (member.status === "active") {
          students.push({
            _id: member.user._id,
            studentId: member.user.studentId,
            fullName: member.user.fullName,
            email: member.user.email,
            department: member.user.department,
            profilePicture: member.user.profilePicture,
            teamId: team._id,
            teamName: team.name,
            role: member.role,
          });
        }
      });
    });

    return {
      success: true,
      data: students,
    };
  } catch (error) {
    logger.error("Failed to get supervised students", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Get supervised teams
export const getSupervisedTeams = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const teams = await Team.find({
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "active",
    })
      .populate({
        path: "members.user",
        select: "fullName email profilePicture studentId",
      })
      .populate("projects");

    return {
      success: true,
      data: teams,
    };
  } catch (error) {
    logger.error("Failed to get supervised teams", { error, userId: user.id });
    throw error;
  }
};

// Get team details
export const getTeamDetails = async ({ params, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const team = await Team.findById(params.teamId)
      .populate({
        path: "members.user",
        select: "fullName email profilePicture studentId",
      })
      .populate("projects")
      .populate("session");

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Check if supervisor is assigned to this team
    const isSupervisor = team.supervisors.some(
      (s) =>
        s.supervisor.toString() === supervisor._id.toString() &&
        s.status === "active"
    );

    if (!isSupervisor) {
      throw new ForbiddenError("You are not a supervisor for this team");
    }

    return {
      success: true,
      data: team,
    };
  } catch (error) {
    logger.error("Failed to get team details", {
      error,
      userId: user.id,
      teamId: params.teamId,
    });
    throw error;
  }
};

// Get supervisor profile
export const getSupervisorProfile = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id }).populate(
      "user",
      "fullName email department profilePicture status"
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
      userId: user.id,
    });
    throw error;
  }
};

// Update supervisor profile
export const updateSupervisorProfile = async ({ body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Update user fields
    if (body.fullName || body.email || body.department || body.profilePicture) {
      await User.findByIdAndUpdate(user.id, {
        ...(body.fullName && { fullName: body.fullName }),
        ...(body.email && { email: body.email }),
        ...(body.department && { department: body.department }),
        ...(body.profilePicture && { profilePicture: body.profilePicture }),
      });
    }

    // Update supervisor-specific fields
    if (body.specialization) {
      supervisor.specialization = body.specialization;
    }

    if (body.bio) {
      supervisor.bio = body.bio;
    }

    if (body.researchInterests) {
      supervisor.researchInterests = body.researchInterests;
    }

    await supervisor.save();

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    logger.error("Failed to update supervisor profile", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Send bulk emails to multiple students or teams
export const sendBulkNotification = async ({ body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id }).populate(
      "user",
      "fullName email department"
    );

    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const {
      recipients = [],
      recipientType, // 'all', 'team', 'selected'
      teamId,
      studentIds = [],
      subject,
      message,
      isUrgent = false,
      type = "general", // 'general', 'warning', 'praise'
      requiresAction = false,
      dueDate,
      sendEmail = true,
    } = body;

    // Validate the input
    if (
      recipientType !== "all" &&
      recipientType !== "team" &&
      recipientType !== "selected"
    ) {
      throw new ValidationError("Invalid recipient type");
    }

    if (recipientType === "team" && !teamId) {
      throw new ValidationError("Team ID is required when sending to a team");
    }

    if (
      recipientType === "selected" &&
      (!studentIds || studentIds.length === 0)
    ) {
      throw new ValidationError(
        "At least one student ID is required when sending to selected students"
      );
    }

    // Get the students based on the recipient type
    let students = [];
    let teamName = null;

    if (recipientType === "all") {
      // Get all teams supervised by this supervisor
      const teams = await Team.find({
        "supervisors.supervisor": supervisor._id,
        "supervisors.status": "active",
      }).populate({
        path: "members.user",
        select: "fullName email department profilePicture studentId",
        populate: {
          path: "student",
          model: "Student",
        },
      });

      // Extract all students from these teams
      teams.forEach((team) => {
        team.members.forEach((member) => {
          if (member.status === "active") {
            students.push({
              _id: member.user._id,
              student: member.user.student,
              studentId: member.user.studentId,
              fullName: member.user.fullName,
              email: member.user.email,
              department: member.user.department,
              profilePicture: member.user.profilePicture,
              teamId: team._id,
              teamName: team.name,
              role: member.role,
            });
          }
        });
      });
    } else if (recipientType === "team") {
      // Get the specific team and its members
      const team = await Team.findOne({
        _id: teamId,
        "supervisors.supervisor": supervisor._id,
      }).populate({
        path: "members.user",
        select: "fullName email department profilePicture studentId",
        populate: {
          path: "student",
          model: "Student",
        },
      });

      if (!team) {
        throw new NotFoundError(
          "Team not found or you are not supervising this team"
        );
      }

      teamName = team.name;

      // Extract students from this team
      team.members.forEach((member) => {
        if (member.status === "active") {
          students.push({
            _id: member.user._id,
            student: member.user.student,
            studentId: member.user.studentId,
            fullName: member.user.fullName,
            email: member.user.email,
            department: member.user.department,
            profilePicture: member.user.profilePicture,
            teamId: team._id,
            teamName: team.name,
            role: member.role,
          });
        }
      });

      // Add to team's activity log
      team.activityLog.push({
        type: "supervisor_notification",
        by: supervisor.user._id,
        message: message,
        timestamp: new Date(),
        metadata: {
          isUrgent: isUrgent,
          type: type,
        },
      });

      await team.save();
    } else if (recipientType === "selected") {
      // Get the specific students from multiple teams
      for (const studentId of studentIds) {
        // Find the student
        const student = await Student.findById(studentId).populate({
          path: "user",
          select: "fullName email department profilePicture studentId",
        });

        if (!student) {
          continue; // Skip if student not found
        }

        // Check if supervisor is supervising this student
        const team = await Team.findOne({
          _id: student.team,
          "supervisors.supervisor": supervisor._id,
        });

        if (!team) {
          continue; // Skip if supervisor is not supervising this student
        }

        students.push({
          _id: student.user._id,
          student: student._id,
          studentId: student.user.studentId,
          fullName: student.user.fullName,
          email: student.user.email,
          department: student.user.department,
          profilePicture: student.user.profilePicture,
          teamId: team._id,
          teamName: team.name,
        });
      }
    }

    if (students.length === 0) {
      throw new ValidationError("No students found for the selected criteria");
    }

    // Notification data to be stored for each student
    const notificationData = {
      type: "supervisor_message",
      title: subject,
      message: message,
      details: {
        type: type,
        category: type,
        requiresAction: requiresAction,
        dueDate: dueDate,
        priority: isUrgent ? "high" : "normal",
      },
      from: supervisor.user._id,
      isRead: false,
      isUrgent: isUrgent,
      createdAt: new Date(),
    };

    // Create a notification for each student and optionally send email
    const notificationPromises = [];
    const emailRecipients = [];

    for (const student of students) {
      // Get the student document
      const studentDoc = await Student.findById(student.student);

      if (!studentDoc) {
        continue;
      }

      // Add notification to the student
      if (!studentDoc.notifications) {
        studentDoc.notifications = [];
      }

      studentDoc.notifications.push(notificationData);
      notificationPromises.push(studentDoc.save());

      // Collect email addresses if email sending is enabled
      if (sendEmail && studentDoc.notificationPreferences?.emailNotifications) {
        emailRecipients.push({
          email: student.email,
          name: student.fullName,
          studentId: student.studentId,
        });
      }
    }

    // Wait for all the notifications to be saved
    await Promise.all(notificationPromises);

    // Send emails if required
    if (sendEmail && emailRecipients.length > 0) {
      const emails = emailRecipients.map((recipient) => recipient.email);

      // Different templates based on notification type
      const templateName = teamName ? "teamNotification" : "supervisorFeedback";

      await sendBulkEmail({
        to: emails,
        subject: `${isUrgent ? "[URGENT] " : ""}${
          subject || "Message from your supervisor"
        }`,
        template: templateName,
        context: {
          message: message,
          supervisorName: supervisor.user.fullName,
          teamName: teamName,
          isUrgent: isUrgent,
          requiresAction: requiresAction,
          dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : null,
          dashboardUrl: `${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/student/dashboard`,
          year: new Date().getFullYear(),
        },
        useIndividualEmails: true, // Send individual emails to ensure privacy
      });
    }

    // Add to supervisor's recent activity
    supervisor.recentActivity.push({
      type: "notification_sent",
      description: `Sent ${
        recipientType === "all"
          ? "mass notification to all students"
          : recipientType === "team"
          ? `notification to team ${teamName}`
          : "notification to selected students"
      }`,
      timestamp: new Date(),
    });

    await supervisor.save();

    return {
      success: true,
      message: "Notification sent successfully",
      data: {
        recipientCount: students.length,
        emailsSent: sendEmail ? emailRecipients.length : 0,
        recipientType: recipientType,
        sentAt: new Date(),
      },
    };
  } catch (error) {
    logger.error("Failed to send bulk notification", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Track student progress
export const trackStudentProgress = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const student = await Student.findById(params.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Verify that supervisor is assigned to student's team
    const team = await Team.findOne({
      _id: student.team,
      "supervisors.supervisor": supervisor._id,
    });

    if (!team) {
      throw new ForbiddenError("You are not supervising this student's team");
    }

    // Create progress note
    const progressData = {
      note: body.note,
      progressPercentage: body.progressPercentage,
      status: body.status || "on_track",
      milestones: body.milestones || [],
      date: new Date(),
    };

    // Update student progress
    const updatedProgress = await supervisor.updateStudentProgress(
      student._id,
      progressData
    );

    // Notify the student if specified
    if (body.notifyStudent) {
      // Add notification
      const notification = {
        type: "progress_update",
        message: `Your supervisor has updated your progress: ${body.note}`,
        from: supervisor.user._id,
        isRead: false,
        createdAt: new Date(),
      };

      if (!student.notifications) {
        student.notifications = [];
      }

      student.notifications.push(notification);
      await student.save();
    }

    return {
      success: true,
      message: "Student progress tracked successfully",
      data: updatedProgress,
    };
  } catch (error) {
    logger.error("Failed to track student progress", {
      error,
      userId: user.id,
      studentId: params.studentId,
    });
    throw error;
  }
};

// Track team progress with enhanced analytics
export const trackTeamProgress = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const team = await Team.findOne({
      _id: params.teamId,
      "supervisors.supervisor": supervisor._id,
    });

    if (!team) {
      throw new ForbiddenError("You are not supervising this team");
    }

    // Create progress note
    const progressData = {
      note: body.note,
      overallProgress: body.overallProgress,
      teamDynamics: body.teamDynamics || "good",
      concerns: body.concerns || [],
      achievements: body.achievements || [],
      date: new Date(),
      nextMilestone: body.nextMilestone,
      recommendedActions: body.recommendedActions || []
    };

    // Update team progress
    const updatedProgress = await supervisor.updateTeamProgress(
      team._id,
      progressData
    );

    // Notify team members if specified
    if (body.notifyTeam) {
      const notification = {
        type: "progress_update",
        message: `Team Progress Update: ${body.note}`,
        title: "Progress Tracking Update",
        details: {
          progress: body.overallProgress,
          nextMilestone: body.nextMilestone,
          recommendedActions: body.recommendedActions
        },
        from: supervisor.user._id,
        isRead: false,
        createdAt: new Date(),
        isUrgent: body.overallProgress < 50 // Mark as urgent if progress is low
      };

      // Notify each active member
      const activeMembers = team.members.filter((m) => m.status === "active");
      for (const member of activeMembers) {
        const student = await Student.findById(member.user);
        if (student) {
          if (!student.notifications) {
            student.notifications = [];
          }
          student.notifications.push(notification);
          await student.save();

          // Send email for low progress
          if (body.overallProgress < 50 && student.notificationPreferences?.emailNotifications) {
            await sendEmail({
              to: student.user.email,
              subject: "Progress Alert",
              template: "progressAlert",
              context: {
                studentName: student.user.fullName,
                teamName: team.name,
                progress: body.overallProgress,
                supervisorName: supervisor.user.fullName,
                message: body.note,
                recommendedActions: body.recommendedActions
              }
            });
          }
        }
      }
    }

    return {
      success: true,
      message: "Team progress tracked successfully",
      data: updatedProgress,
    };
  } catch (error) {
    logger.error("Failed to track team progress", {
      error,
      userId: user.id,
      teamId: params.teamId,
    });
    throw error;
  }
};

// Get student progress history
export const getStudentProgressHistory = async ({ params, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const student = await Student.findById(params.studentId).populate(
      "user",
      "fullName email department profilePicture studentId"
    );
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Verify that supervisor is assigned to student's team
    const team = await Team.findOne({
      _id: student.team,
      "supervisors.supervisor": supervisor._id,
    });

    if (!team) {
      throw new ForbiddenError("You are not supervising this student's team");
    }

    // Get progress history
    const trackedStudent = supervisor.progressTracking?.trackedStudents?.find(
      (ts) => ts.student.toString() === student._id.toString()
    );

    return {
      success: true,
      data: {
        student: {
          _id: student._id,
          fullName: student.user.fullName,
          email: student.user.email,
          studentId: student.user.studentId,
          profilePicture: student.user.profilePicture,
          department: student.user.department,
        },
        progressHistory: trackedStudent ? trackedStudent.progressNotes : [],
        team: {
          _id: team._id,
          name: team.name,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get student progress history", {
      error,
      userId: user.id,
      studentId: params.studentId,
    });
    throw error;
  }
};

// Get team progress history
export const getTeamProgressHistory = async ({ params, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const team = await Team.findById(params.teamId).populate({
      path: "members.user",
      select: "fullName email profilePicture studentId",
    });

    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Verify that supervisor is assigned to this team
    const isSupervisor = team.supervisors.some(
      (s) =>
        s.supervisor.toString() === supervisor._id.toString() &&
        s.status === "active"
    );

    if (!isSupervisor) {
      throw new ForbiddenError("You are not supervising this team");
    }

    // Get progress history
    const trackedTeam = supervisor.progressTracking?.trackedTeams?.find(
      (tt) => tt.team.toString() === team._id.toString()
    );

    return {
      success: true,
      data: {
        team: {
          _id: team._id,
          name: team.name,
          memberCount: team.members.filter((m) => m.status === "active").length,
          members: team.members
            .filter((m) => m.status === "active")
            .map((m) => ({
              _id: m.user._id,
              fullName: m.user.fullName,
              role: m.role,
            })),
        },
        progressHistory: trackedTeam ? trackedTeam.progressNotes : [],
      },
    };
  } catch (error) {
    logger.error("Failed to get team progress history", {
      error,
      userId: user.id,
      teamId: params.teamId,
    });
    throw error;
  }
};

// Schedule a meeting with student or team
export const scheduleMeeting = async ({ body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const {
      entityType,
      entityId,
      title,
      description,
      date,
      duration,
      location,
      meetingLink,
      agenda,
      isRecurring,
      recurringPattern,
      notifyAttendees,
    } = body;

    // Validate entity exists
    let entityModel;
    if (entityType === "Student") {
      entityModel = await Student.findById(entityId).populate(
        "user",
        "fullName email"
      );
      if (!entityModel) {
        throw new NotFoundError("Student not found");
      }

      // Verify supervisor is assigned to student's team
      const team = await Team.findOne({
        _id: entityModel.team,
        "supervisors.supervisor": supervisor._id,
      });

      if (!team) {
        throw new ForbiddenError("You are not supervising this student's team");
      }
    } else if (entityType === "Team") {
      entityModel = await Team.findById(entityId);
      if (!entityModel) {
        throw new NotFoundError("Team not found");
      }

      // Verify supervisor is assigned to this team
      const isSupervisor = entityModel.supervisors.some(
        (s) =>
          s.supervisor.toString() === supervisor._id.toString() &&
          s.status === "active"
      );

      if (!isSupervisor) {
        throw new ForbiddenError("You are not supervising this team");
      }
    } else {
      throw new ValidationError("Invalid entity type");
    }

    // Create meeting data
    const meetingData = {
      title,
      description,
      withEntity: entityType === "Student" ? "student" : "team",
      entityId,
      entityType,
      date: new Date(date),
      duration: duration || 60,
      location,
      meetingLink,
      agenda: agenda || [],
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? recurringPattern : undefined,
      reminderSent: false,
    };

    // Schedule the meeting
    const scheduledMeeting = await supervisor.scheduleMeeting(meetingData);

    // Notify attendees if requested
    if (notifyAttendees) {
      if (entityType === "Student") {
        // Notify individual student
        const notification = {
          type: "meeting_scheduled",
          message: `Your supervisor has scheduled a meeting: ${title}`,
          details: {
            meetingDate: date,
            meetingTitle: title,
            isRecurring: isRecurring,
          },
          from: supervisor.user._id,
          isRead: false,
          createdAt: new Date(),
        };

        if (!entityModel.notifications) {
          entityModel.notifications = [];
        }

        entityModel.notifications.push(notification);
        await entityModel.save();

        // Send email notification if possible
        // This would need to be implemented via emailService.js
      } else if (entityType === "Team") {
        // Notify all team members
        const activeMembers = entityModel.members.filter(
          (m) => m.status === "active"
        );

        // Add to team's activity log
        entityModel.activityLog.push({
          type: "meeting_scheduled",
          by: supervisor.user._id,
          message: `Meeting scheduled: ${title} on ${new Date(
            date
          ).toLocaleDateString()}`,
          timestamp: new Date(),
          metadata: {
            meetingId: scheduledMeeting._id,
          },
        });

        await entityModel.save();

        // Notify each member
        for (const member of activeMembers) {
          const student = await Student.findById(member.user);
          if (student) {
            const notification = {
              type: "meeting_scheduled",
              message: `Your supervisor has scheduled a team meeting: ${title}`,
              details: {
                meetingDate: date,
                meetingTitle: title,
                isRecurring: isRecurring,
                teamId: entityModel._id,
                teamName: entityModel.name,
              },
              from: supervisor.user._id,
              isRead: false,
              createdAt: new Date(),
            };

            if (!student.notifications) {
              student.notifications = [];
            }

            student.notifications.push(notification);
            await student.save();
          }
        }
      }
    }

    return {
      success: true,
      message: "Meeting scheduled successfully",
      data: scheduledMeeting,
    };
  } catch (error) {
    logger.error("Failed to schedule meeting", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Schedule a consultation with a team
export const scheduleConsultation = async ({
  user,
  teamId,
  date,
  duration,
  agenda,
  location,
  isOnline,
}) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError("Team not found");
    }

    // Verify supervisor is assigned to this team
    const isSupervisor = team.supervisors.some(
      (s) =>
        s.supervisor.toString() === supervisor._id.toString() &&
        s.status === "active"
    );

    if (!isSupervisor) {
      throw new ForbiddenError("You are not supervising this team");
    }

    const meetingData = {
      title: "Team Consultation",
      description: agenda,
      withEntity: "team",
      entityId: teamId,
      entityType: "Team",
      date: new Date(date),
      duration,
      location: isOnline ? "online" : location,
      meetingLink: isOnline ? "To be provided" : undefined,
      agenda: [agenda],
      isRecurring: false,
      reminderSent: false,
    };

    // Schedule the meeting using existing method
    const scheduledMeeting = await supervisor.scheduleMeeting(meetingData);

    return scheduledMeeting;
  } catch (error) {
    logger.error("Failed to schedule consultation", {
      error,
      userId: user.id,
      teamId,
    });
    throw error;
  }
};

// Get supervisor's scheduled meetings
export const getScheduledMeetings = async ({ query, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const { entityType, entityId, upcoming, past } = query;

    // Filter meetings based on query parameters
    let meetings = supervisor.scheduledMeetings || [];

    if (entityType && entityId) {
      meetings = meetings.filter(
        (m) =>
          m.entityType === entityType &&
          m.entityId.toString() === entityId.toString()
      );
    }

    const now = new Date();

    if (upcoming === "true") {
      meetings = meetings.filter((m) => new Date(m.date) >= now);
    }

    if (past === "true") {
      meetings = meetings.filter((m) => new Date(m.date) < now);
    }

    // Sort meetings by date (upcoming first)
    meetings.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      success: true,
      data: meetings,
    };
  } catch (error) {
    logger.error("Failed to get scheduled meetings", {
      error,
      userId: user.id,
    });
    throw error;
  }
};

// Generate progress report for student
export const generateStudentProgressReport = async ({ params, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const student = await Student.findById(params.studentId).populate(
      "user",
      "fullName email department profilePicture studentId"
    );
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Check if supervisor is supervising this student
    const team = await Team.findOne({
      _id: student.team,
      "supervisors.supervisor": supervisor._id,
    });

    if (!team) {
      throw new ForbiddenError("You are not supervising this student's team");
    }

    // Get project
    const project = await Project.findOne({ team: team._id });

    // Get marks given by this supervisor
    const markEntry = supervisor.marksGiven.find(
      (m) => m.student.toString() === student._id.toString()
    );

    // Get progress history
    const trackedStudent = supervisor.progressTracking?.trackedStudents?.find(
      (ts) => ts.student.toString() === student._id.toString()
    );

    // Calculate overall progress metrics
    const progressHistory = trackedStudent ? trackedStudent.progressNotes : [];
    const latestProgress =
      progressHistory.length > 0
        ? progressHistory[progressHistory.length - 1]
        : null;

    const marks = markEntry ? markEntry.marks : [];
    const averageScore =
      marks.length > 0
        ? marks.reduce((sum, mark) => sum + mark.score, 0) / marks.length
        : 0;

    // Generate report
    const report = {
      student: {
        _id: student._id,
        fullName: student.user.fullName,
        email: student.user.email,
        studentId: student.user.studentId,
        profilePicture: student.user.profilePicture,
        department: student.user.department,
      },
      team: {
        _id: team._id,
        name: team.name,
        role:
          team.members.find((m) => m.user.toString() === student._id.toString())
            ?.role || "member",
      },
      project: project
        ? {
            _id: project._id,
            title: project.title,
            status: project.status,
          }
        : null,
      assessments: marks.map((mark) => ({
        type: mark.type,
        score: mark.score,
        date: mark.date,
        feedback: mark.feedback,
        strengths: mark.strengths || [],
        improvements: mark.improvements || [],
      })),
      progress: {
        history: progressHistory,
        current: latestProgress
          ? {
              status: latestProgress.status,
              progressPercentage: latestProgress.progressPercentage,
              lastUpdated: latestProgress.date,
            }
          : null,
      },
      summary: {
        averageScore,
        assessmentCount: marks.length,
        progressUpdateCount: progressHistory.length,
        lastUpdated: latestProgress ? latestProgress.date : null,
        overallStatus: latestProgress ? latestProgress.status : "unknown",
      },
      generatedAt: new Date(),
      generatedBy: {
        _id: supervisor._id,
        fullName: supervisor.user.fullName,
      },
    };

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    logger.error("Failed to generate student progress report", {
      error,
      userId: user.id,
      studentId: params.studentId,
    });
    throw error;
  }
};

// Evaluate project
export const evaluateProject = async ({
  user,
  projectId,
  score,
  feedback,
  milestoneId,
}) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Verify supervisor is assigned to this project
    const isSupervisor = project.supervisors.some(
      (s) =>
        s.supervisor.toString() === supervisor._id.toString() &&
        s.status === "accepted"
    );

    if (!isSupervisor) {
      throw new ForbiddenError(
        "You are not authorized to evaluate this project"
      );
    }

    if (milestoneId) {
      // Update specific milestone
      const milestone = project.milestones.find(
        (m) => m._id.toString() === milestoneId
      );
      if (!milestone) {
        throw new NotFoundError("Milestone not found");
      }
      milestone.evaluation = {
        score,
        feedback,
        evaluatedBy: supervisor._id,
        evaluatedAt: new Date(),
      };
    } else {
      // Update overall project evaluation
      project.evaluation = {
        score,
        feedback,
        evaluatedBy: supervisor._id,
        evaluatedAt: new Date(),
      };
    }

    await project.save();

    return {
      success: true,
      message: "Project evaluated successfully",
      data: project,
    };
  } catch (error) {
    logger.error("Failed to evaluate project", {
      error,
      userId: user.id,
      projectId,
    });
    throw error;
  }
};

// Provide feedback to student or team
export const provideFeedback = async ({ params, body, user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    const { entityType, entityId } = params;
    const { feedback, type, isUrgent, requiresAction } = body;

    let entity;
    let team;

    // Validate and get the entity
    if (entityType === "student") {
      entity = await Student.findById(entityId);
      if (!entity) {
        throw new NotFoundError("Student not found");
      }

      // Verify supervisor is assigned to student's team
      team = await Team.findOne({
        _id: entity.team,
        "supervisors.supervisor": supervisor._id,
      });

      if (!team) {
        throw new ForbiddenError("You are not supervising this student's team");
      }
    } else if (entityType === "team") {
      team = await Team.findById(entityId);
      if (!team) {
        throw new NotFoundError("Team not found");
      }

      // Verify supervisor is assigned to this team
      const isSupervisor = team.supervisors.some(
        (s) =>
          s.supervisor.toString() === supervisor._id.toString() &&
          s.status === "active"
      );

      if (!isSupervisor) {
        throw new ForbiddenError("You are not supervising this team");
      }
      entity = team;
    } else {
      throw new ValidationError("Invalid entity type");
    }

    // Create feedback data
    const feedbackData = {
      message: feedback,
      type: type || "general",
      from: supervisor.user._id,
      isUrgent: isUrgent || false,
      requiresAction: requiresAction || false,
      createdAt: new Date(),
    };

    // Add feedback to entity
    if (entityType === "student") {
      if (!entity.feedback) {
        entity.feedback = [];
      }
      entity.feedback.push(feedbackData);

      // Add notification
      if (!entity.notifications) {
        entity.notifications = [];
      }
      entity.notifications.push({
        type: "supervisor_feedback",
        message: feedback,
        from: supervisor.user._id,
        isUrgent: isUrgent || false,
        createdAt: new Date(),
      });

      await entity.save();
    } else {
      // Add to team's activity log
      team.activityLog.push({
        type: "supervisor_feedback",
        by: supervisor.user._id,
        message: feedback,
        timestamp: new Date(),
        metadata: {
          type: type || "general",
          isUrgent: isUrgent || false,
        },
      });

      await team.save();

      // Notify all active team members
      const activeMembers = team.members.filter((m) => m.status === "active");
      for (const member of activeMembers) {
        const student = await Student.findById(member.user);
        if (student) {
          if (!student.notifications) {
            student.notifications = [];
          }
          student.notifications.push({
            type: "team_feedback",
            message: feedback,
            from: supervisor.user._id,
            isUrgent: isUrgent || false,
            createdAt: new Date(),
          });
          await student.save();
        }
      }
    }

    // Add to supervisor's recent activity
    supervisor.recentActivity.push({
      type: "feedback_provided",
      description: `Provided feedback to ${
        entityType === "student" ? "student" : "team"
      }`,
      timestamp: new Date(),
    });

    await supervisor.save();

    return {
      success: true,
      message: "Feedback provided successfully",
      data: feedbackData,
    };
  } catch (error) {
    logger.error("Failed to provide feedback", {
      error,
      userId: user.id,
      entityType: params.entityType,
      entityId: params.entityId,
    });
    throw error;
  }
};

// Get quick summary of supervisor's responsibilities
export const getSupervisorSummary = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user.id });
    if (!supervisor) {
      throw new NotFoundError("Supervisor profile not found");
    }

    // Get supervised teams
    const teams = await Team.find({
      "supervisors.supervisor": supervisor._id,
      "supervisors.status": "active",
    });

    // Get all students from these teams
    const studentIds = new Set();
    teams.forEach((team) => {
      team.members.forEach((member) => {
        if (member.status === "active") {
          studentIds.add(member.user.toString());
        }
      });
    });

    // Get projects of supervised teams
    const projects = await Project.find({
      team: { $in: teams.map((t) => t._id) },
    });

    // Calculate submission stats
    const submissionStats = {
      total: 0,
      pending: 0,
      reviewed: 0,
    };

    projects.forEach((project) => {
      if (project.submissions) {
        project.submissions.forEach((sub) => {
          submissionStats.total++;
          if (sub.feedback) {
            submissionStats.reviewed++;
          } else {
            submissionStats.pending++;
          }
        });
      }
    });

    // Get recent activities
    const recentActivities = supervisor.recentActivity || [];
    recentActivities.sort((a, b) => b.timestamp - a.timestamp);

    return {
      success: true,
      data: {
        overview: {
          totalTeams: teams.length,
          totalStudents: studentIds.size,
          totalProjects: projects.length,
        },
        submissionStats,
        recentActivities: recentActivities.slice(0, 5),
        pendingActions: {
          pendingReviews: submissionStats.pending,
          upcomingMeetings:
            supervisor.scheduledMeetings?.filter(
              (m) => new Date(m.date) > new Date()
            ).length || 0,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to get supervisor summary", {
      error,
      userId: user.id,
    });
    throw error;
  }
};
