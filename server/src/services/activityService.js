import { Activity } from '../models/Activity.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

export const createActivityForProject = async (projectId, userId, data) => {
  try {
    const activity = await Activity.createWithNotification({
      project: projectId,
      user: userId,
      ...data
    });

    return activity;
  } catch (error) {
    logger.error('Failed to create activity', { error, projectId, userId, data });
    throw error;
  }
};

export const trackMilestoneActivity = async (projectId, userId, milestone, action) => {
  const user = await User.findById(userId).select('fullName');
  let type, description;

  switch (action) {
    case 'create':
      type = 'milestone_created';
      description = `${user.fullName} created milestone "${milestone.title}"`;
      break;
    case 'update':
      type = 'milestone_updated';
      description = `${user.fullName} updated milestone "${milestone.title}"`;
      break;
    case 'complete':
      type = 'milestone_completed';
      description = `${user.fullName} marked milestone "${milestone.title}" as complete`;
      break;
    case 'delete':
      type = 'milestone_deleted';
      description = `${user.fullName} deleted milestone "${milestone.title}"`;
      break;
    default:
      return;
  }

  return createActivityForProject(projectId, userId, {
    type,
    description,
    metadata: { milestone }
  });
};

export const trackSubmissionActivity = async (projectId, userId, submission) => {
  const user = await User.findById(userId).select('fullName');

  return createActivityForProject(projectId, userId, {
    type: 'submission_created',
    description: `${user.fullName} submitted version ${submission.version} of the project`,
    metadata: {
      submissionId: submission._id,
      version: submission.version
    }
  });
};

export const trackFeedbackActivity = async (projectId, userId, feedback) => {
  const user = await User.findById(userId).select('fullName');

  return createActivityForProject(projectId, userId, {
    type: 'feedback_received',
    description: `${user.fullName} provided feedback on the project`,
    metadata: { feedback }
  });
};

export const trackTeamMemberActivity = async (projectId, userId, action, memberId) => {
  const [user, member] = await Promise.all([
    User.findById(userId).select('fullName'),
    User.findById(memberId).select('fullName')
  ]);

  const type = action === 'join' ? 'member_joined' : 'member_left';
  const description = action === 'join'
    ? `${member.fullName} joined the team`
    : `${member.fullName} left the team`;

  return createActivityForProject(projectId, userId, {
    type,
    description,
    metadata: { memberId }
  });
};

export const trackFileUploadActivity = async (projectId, userId, fileData) => {
  const user = await User.findById(userId).select('fullName');

  return createActivityForProject(projectId, userId, {
    type: 'file_uploaded',
    description: `${user.fullName} uploaded file "${fileData.name}"`,
    metadata: { file: fileData }
  });
};

// Search activities
export const searchActivities = async (projectId, query) => {
  try {
    const activities = await Activity.find({
      project: projectId,
      $text: { $search: query }
    })
      .sort({ createdAt: -1 })
      .populate('user', 'fullName profilePicture');

    return activities;
  } catch (error) {
    logger.error('Failed to search activities', { error, projectId, query });
    throw error;
  }
};

// Get activity statistics
export const getActivityStats = async (projectId) => {
  try {
    const stats = await Activity.aggregate([
      { $match: { project: projectId } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }},
      { $sort: { count: -1 } }
    ]);

    return stats;
  } catch (error) {
    logger.error('Failed to get activity stats', { error, projectId });
    throw error;
  }
};