// server/src/controllers/studentController.js
import { Student } from '../models/Student.js';
import { Team } from '../models/Team.js';
import { Supervisor } from '../models/Supervisor.js';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { generateRandomString } from '../utils/helpers.js';

// Create a team
export const createTeam = async (req, res) => {
  try {
    const { name } = req.body;

    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Check if already in a team
    if (student.team) {
      return res.status(400).json({ message: 'Already a member of a team' });
    }

    // Generate a unique team ID
    const teamId = generateRandomString(8);

    // Create team
    const team = await Team.create({
      name,
      teamId,
      leader: student._id,
      members: [student._id]
    });

    // Update student record
    student.team = team._id;
    student.isTeamLeader = true;
    await student.save();

    res.status(201).json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Join a team
export const joinTeam = async (req, res) => {
  try {
    const { teamId } = req.body;

    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Check if already in a team
    if (student.team) {
      return res.status(400).json({ message: 'Already a member of a team' });
    }

    // Find team by ID
    const team = await Team.findOne({ teamId });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Add student to team
    team.members.push(student._id);
    await team.save();

    // Update student record
    student.team = team._id;
    await student.save();

    res.json({ message: 'Joined team successfully', team });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Invite student to team
export const inviteToTeam = async (req, res) => {
  try {
    const { studentId } = req.body;

    const invitee = await Student.findOne({ studentId });

    if (!invitee) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if invitee is already in a team
    if (invitee.team) {
      return res.status(400).json({ message: 'Student is already in a team' });
    }

    const inviter = await Student.findOne({ user: req.user._id });

    if (!inviter) {
      return res.status(404).json({ message: 'Your student profile not found' });
    }

    // Check if inviter is in a team
    if (!inviter.team) {
      return res.status(400).json({ message: 'You are not in a team' });
    }

    // Send invitation message
    await Message.create({
      sender: req.user._id,
      recipients: [invitee.user],
      subject: 'Team Invitation',
      content: `You have been invited to join team. Use team ID: ${inviter.team.teamId} to join.`
    });

    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create project (team leader only)
export const createProject = async (req, res) => {
  try {
    const { title, description, category, supervisorId } = req.body;

    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Check if team leader
    if (!student.isTeamLeader) {
      return res.status(401).json({ message: 'Only team leaders can create projects' });
    }

    // Get team
    const team = await Team.findById(student.team);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Find supervisor
    const supervisor = await Supervisor.findOne({ supervisorId });

    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }

    // Create project
    const project = await Project.create({
      title,
      description,
      category,
      team: team._id,
      supervisor: supervisor._id,
      status: 'proposed'
    });

    // Update supervisor's teams if not already included
    if (!supervisor.teams.includes(team._id)) {
      supervisor.teams.push(team._id);
      await supervisor.save();
    }

    // Update team with supervisor
    team.supervisor = supervisor._id;
    await team.save();

    // Update all team members to have this supervisor
    const teamMembers = await Student.find({ team: team._id });
    for (const member of teamMembers) {
      member.supervisor = supervisor._id;
      await member.save();
    }

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Submit project report
export const submitReport = async (req, res) => {
  try {
    const { projectId, title, fileUrl } = req.body;

    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify student is part of the team
    const team = await Team.findById(project.team);

    if (!team.members.includes(student._id)) {
      return res.status(401).json({ message: 'Not authorized to submit report for this project' });
    }

    // Add report
    project.reports.push({
      title,
      fileUrl,
      submittedBy: student._id
    });

    await project.save();

    res.json({ message: 'Report submitted successfully', project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get messages for student
export const getStudentMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      recipients: req.user._id
    })
      .populate('sender', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is a recipient
    if (!message.recipients.includes(req.user._id)) {
      return res.status(401).json({ message: 'Not authorized to access this message' });
    }

    message.isRead = true;
    await message.save();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};