import { Project } from '../models/Project.js';
import { Team } from '../models/Team.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

export const generateProjectExport = async (projectId, userId) => {
  try {
    const project = await Project.findById(projectId)
      .populate({
        path: 'team',
        populate: {
          path: 'members.user',
          select: 'fullName email studentId'
        }
      })
      .populate({
        path: 'submissions',
        populate: {
          path: 'submittedBy',
          select: 'fullName email studentId'
        }
      })
      .populate('supervisors.user', 'fullName email department');

    if (!project) {
      throw new Error('Project not found');
    }

    // Format project data for export
    const exportData = {
      project: {
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        createdAt: project.createdAt,
        lastSubmittedAt: project.lastSubmittedAt
      },
      team: {
        name: project.team.name,
        members: project.team.members.map(member => ({
          fullName: member.user.fullName,
          email: member.user.email,
          studentId: member.user.studentId,
          role: member.role,
          joinedAt: member.joinedAt
        }))
      },
      submissions: project.submissions.map(sub => ({
        title: sub.title,
        description: sub.description,
        githubUrl: sub.githubUrl,
        deployedUrl: sub.deployedUrl,
        submittedBy: {
          fullName: sub.submittedBy.fullName,
          studentId: sub.submittedBy.studentId
        },
        submittedAt: sub.submittedAt,
        version: sub.version,
        status: sub.status
      })),
      supervisors: project.supervisors.map(sup => ({
        fullName: sup.user.fullName,
        email: sup.user.email,
        department: sup.user.department,
        status: sup.status
      })),
      milestones: project.milestones.map(ms => ({
        title: ms.title,
        description: ms.description,
        dueDate: ms.dueDate,
        status: ms.status,
        completedAt: ms.completedAt
      }))
    };

    return exportData;
  } catch (error) {
    logger.error('Failed to generate project export', { error, projectId, userId });
    throw error;
  }
};

export const generateTeamExport = async (teamId, userId) => {
  try {
    const team = await Team.findById(teamId)
      .populate('members.user', 'fullName email studentId')
      .populate('projects')
      .populate('supervisors', 'fullName email department')
      .populate({
        path: 'chatMessages',
        populate: {
          path: 'sender',
          select: 'fullName'
        }
      });

    if (!team) {
      throw new Error('Team not found');
    }

    // Format team data for export
    const exportData = {
      team: {
        name: team.name,
        createdAt: team.createdAt,
        status: team.status,
        members: team.members.map(member => ({
          fullName: member.user.fullName,
          email: member.user.email,
          studentId: member.user.studentId,
          role: member.role,
          joinedAt: member.joinedAt
        }))
      },
      projects: team.projects.map(project => ({
        name: project.name,
        type: project.type,
        status: project.status,
        createdAt: project.createdAt
      })),
      chatHistory: team.chatMessages.map(msg => ({
        sender: msg.sender.fullName,
        content: msg.content,
        timestamp: msg.timestamp,
        isAnnouncement: msg.isAnnouncement
      })),
      supervisors: team.supervisors.map(sup => ({
        fullName: sup.fullName,
        email: sup.email,
        department: sup.department
      }))
    };

    return exportData;
  } catch (error) {
    logger.error('Failed to generate team export', { error, teamId, userId });
    throw error;
  }
};