import { Session } from '../models/Session.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

/**
 * Create a new academic session
 * Only accessible by admin users
 */
export const createSession = async ({ body, user }) => {
  if (user.role !== 'admin') {
    throw new UnauthorizedError('Only administrators can create sessions');
  }

  const session = new Session({
    ...body,
    createdBy: user._id,
    lastModifiedBy: user._id
  });

  await session.save();
  return {
    message: 'Session created successfully',
    session
  };
};

/**
 * Get all sessions with pagination and filters
 * Admins see all sessions
 * Supervisors and students see only active/upcoming sessions
 */
export const getSessions = async ({ query, user }) => {
  const { page = 1, limit = 10, status, search } = query;
  const skip = (page - 1) * limit;

  // Build filter conditions
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Non-admin users can only see active/upcoming sessions
  if (user.role !== 'admin') {
    filter.status = { $in: ['active', 'upcoming'] };
  }

  const sessions = await Session.find(filter)
    .sort({ startDate: 1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'fullName email')
    .lean();

  const total = await Session.countDocuments(filter);

  return {
    sessions,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get session details by ID
 */
export const getSessionById = async ({ params }) => {
  const session = await Session.findById(params.id)
    .populate('createdBy', 'fullName email')
    .populate('lastModifiedBy', 'fullName email')
    .lean();

  if (!session) {
    throw new ValidationError('Session not found');
  }

  return { session };
};

/**
 * Update session details
 * Only admin can update sessions
 */
export const updateSession = async ({ params, body, user }) => {
  if (user.role !== 'admin') {
    throw new UnauthorizedError('Only administrators can update sessions');
  }

  const session = await Session.findById(params.id);
  if (!session) {
    throw new ValidationError('Session not found');
  }

  // Don't allow status change through this endpoint
  delete body.status;

  Object.assign(session, {
    ...body,
    lastModifiedBy: user._id
  });

  await session.save();
  return {
    message: 'Session updated successfully',
    session
  };
};

/**
 * Add or update deadline in a session
 * Only admin can modify deadlines
 */
export const manageDeadline = async ({ params, body, user }) => {
  if (user.role !== 'admin') {
    throw new UnauthorizedError('Only administrators can manage deadlines');
  }

  const session = await Session.findById(params.id);
  if (!session) {
    throw new ValidationError('Session not found');
  }

  if (session.status === 'completed') {
    throw new ValidationError('Cannot modify deadlines of completed sessions');
  }

  // If deadline ID is provided, update existing deadline
  if (body.deadlineId) {
    const deadlineIndex = session.deadlines.findIndex(
      d => d._id.toString() === body.deadlineId
    );
    if (deadlineIndex === -1) {
      throw new ValidationError('Deadline not found');
    }
    session.deadlines[deadlineIndex] = {
      ...session.deadlines[deadlineIndex],
      ...body,
      _id: session.deadlines[deadlineIndex]._id
    };
  } else {
    // Add new deadline
    session.deadlines.push(body);
  }

  session.lastModifiedBy = user._id;
  await session.save();

  return {
    message: body.deadlineId ? 'Deadline updated successfully' : 'Deadline added successfully',
    session
  };
};

/**
 * Delete a deadline from a session
 * Only admin can delete deadlines
 */
export const deleteDeadline = async ({ params, user }) => {
  if (user.role !== 'admin') {
    throw new UnauthorizedError('Only administrators can delete deadlines');
  }

  const session = await Session.findById(params.sessionId);
  if (!session) {
    throw new ValidationError('Session not found');
  }

  if (session.status === 'completed') {
    throw new ValidationError('Cannot modify deadlines of completed sessions');
  }

  const deadlineIndex = session.deadlines.findIndex(
    d => d._id.toString() === params.deadlineId
  );
  if (deadlineIndex === -1) {
    throw new ValidationError('Deadline not found');
  }

  session.deadlines.splice(deadlineIndex, 1);
  session.lastModifiedBy = user._id;
  await session.save();

  return {
    message: 'Deadline deleted successfully',
    session
  };
};

/**
 * Activate a session
 * Only admin can activate sessions
 */
export const activateSession = async ({ params, user }) => {
  if (user.role !== 'admin') {
    throw new UnauthorizedError('Only administrators can activate sessions');
  }

  const session = await Session.findById(params.id);
  if (!session) {
    throw new ValidationError('Session not found');
  }

  if (!session.canActivate()) {
    throw new ValidationError('Session cannot be activated. Ensure it has required deadlines.');
  }

  session.status = 'active';
  session.lastModifiedBy = user._id;
  await session.save();

  return {
    message: 'Session activated successfully',
    session
  };
};

/**
 * Get session analytics
 * Admin sees all data
 * Supervisors see their assigned teams/projects
 */
export const getSessionAnalytics = async ({ params, user }) => {
  const session = await Session.findById(params.id);
  if (!session) {
    throw new ValidationError('Session not found');
  }

  // TODO: Implement analytics gathering based on role
  // This will need to aggregate data from Projects, Teams, and Results collections

  return {
    session,
    analytics: {
      totalProjects: 0,
      submittedProjects: 0,
      pendingDeadlines: session.getUpcomingDeadlines().length,
      // Add more analytics as needed
    }
  };
};
