import {User} from '../models/User.js';
import {Student} from '../models/Student.js';
import {Session} from '../models/Session.js';
import { Team } from '../models/Team.js';

export const getStudentDashboard = async ({ user }) => {
  try {
    // Get student details with populated fields
    const student = await User.findById(user._id)
      .select('_id fullName email department profilePicture')
      .lean();

    const studentDetails = await Student.findOne({ user: user._id })
      .select('studentId session team isTeamLeader')
      .populate('session', '_id name startDate endDate deadlines')
      .lean();

    // Get current active session if not in student details
    const currentSession = studentDetails?.session || await Session.findOne({ isActive: true })
      .select('_id name startDate endDate deadlines')
      .lean();

    // Get student's team
    const team = await Team.findOne({
      'members.user': user._id,
      session: currentSession?._id
    })
      .populate('members.user', '_id fullName email profilePicture studentId')
      .populate('supervisors', '_id fullName email specialization')
      .populate('project', '_id name type status submissionLink submittedAt')
      .lean();

    // Get pending team invites
    const pendingInvites = await Team.aggregate([
      {
        $match: {
          'invites.to': user._id,
          'invites.status': 'pending'
        }
      },
      {
        $project: {
          _id: 1,
          invites: {
            $filter: {
              input: '$invites',
              as: 'invite',
              cond: {
                $and: [
                  { $eq: ['$$invite.to', user._id] },
                  { $eq: ['$$invite.status', 'pending'] }
                ]
              }
            }
          },
          name: 1
        }
      },
      { $unwind: '$invites' },
      {
        $project: {
          _id: '$invites._id',
          from: {
            _id: '$_id',
            name: '$name'
          },
          teamId: '$_id',
          status: '$invites.status',
          expiresAt: '$invites.expiresAt'
        }
      }
    ]);

    return {
      student: {
        ...student,
        ...studentDetails,
        currentSession
      },
      team,
      pendingInvites
    };
  } catch (error) {
    console.error('Student Dashboard Error:', error);
    throw new Error('Failed to fetch student dashboard data');
  }
};

export const getSupervisorDashboard = async ({ user }) => {
  try {
    const supervisor = await Supervisor.findOne({ user: user._id })
      .populate('user', '_id fullName email')
      .lean();

    // Get current active session
    const currentSession = await Session.findOne({ isActive: true })
      .select('_id name startDate endDate deadlines')
      .lean();

    // Get supervised teams
    const supervisedTeams = await Team.find({
      supervisors: user._id,
      session: currentSession?._id
    })
      .populate('members.user', '_id fullName email profilePicture studentId')
      .populate('project', '_id name type status submissionLink submittedAt')
      .lean();

    // Get analytics
    const analytics = {
      totalTeams: supervisedTeams.length,
      totalStudents: supervisedTeams.reduce((acc, team) => acc + team.members.length, 0),
      projectSubmissions: supervisedTeams.filter(team => team.project?.submittedAt).length,
      pendingReviews: supervisedTeams.filter(team => team.project?.status === 'submitted').length
    };

    return {
      supervisor,
      currentSession,
      supervisedTeams,
      analytics
    };
  } catch (error) {
    console.error('Supervisor Dashboard Error:', error);
    throw new Error('Failed to fetch supervisor dashboard data');
  }
};

export const getAdminDashboard = async () => {
  try {
    // Get current and upcoming sessions
    const sessions = await Session.find({})
      .sort({ startDate: -1 })
      .limit(5)
      .lean();

    // Get all supervisors
    const supervisors = await Supervisor.find({})
      .populate('user', '_id fullName email')
      .lean();

    // Get teams in current session
    const currentSession = sessions.find(s => s.isActive);
    const teams = currentSession ? await Team.find({ session: currentSession._id })
      .populate('members.user', '_id fullName email')
      .populate('supervisors', '_id fullName email')
      .populate('project', '_id name type status')
      .lean() : [];

    // Calculate analytics
    const analytics = {
      totalSessions: await Session.countDocuments(),
      totalSupervisors: await Supervisor.countDocuments(),
      totalTeams: await Team.countDocuments({ session: currentSession?._id }),
      totalStudents: await Student.countDocuments(),
      projectSubmissions: teams.filter(team => team.project?.submittedAt).length,
      pendingApprovals: await Supervisor.countDocuments({ isApproved: false }),
      sessionProgress: currentSession?.progress || 0
    };

    return {
      sessions,
      currentSession,
      supervisors,
      teams,
      analytics
    };
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    throw new Error('Failed to fetch admin dashboard data');
  }
};
