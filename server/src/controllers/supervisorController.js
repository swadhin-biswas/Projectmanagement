// server/src/controllers/supervisorController.js
import { Student } from '../models/Student.js';
import { Team } from '../models/Team.js';
import { Message } from '../models/Message.js';
import { Project } from "../models/Project.js";

// Get all students under supervision
export const getSupervisorStudents = async (req, res) => {
  try {
    const supervisor = await Supervisor.findOne({ user: req.user._id });

    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor profile not found" });
    }

    const students = await Student.find({ _id: { $in: supervisor.students } })
      .populate("user", "fullName email department")
      .populate("team", "name teamId");

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all teams under supervision
export const getSupervisorTeams = async (req, res) => {
  try {
    const supervisor = await Supervisor.findOne({ user: req.user._id });

    if (!supervisor) {
      return res.status(404).json({ message: "Supervisor profile not found" });
    }

    const teams = await Team.find({ _id: { $in: supervisor.teams } })
      .populate("leader", "studentId")
      .populate({
        path: "members",
        populate: {
          path: "user",
          select: "fullName email",
        },
      });

    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update student progress
export const updateStudentProgress = async (req, res) => {
  try {
    const { studentId, progress } = req.body;

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Verify supervisor is assigned to this student
    const supervisor = await Supervisor.findOne({ user: req.user._id });

    if (!supervisor.students.includes(student._id)) {
      return res
        .status(401)
        .json({ message: "Not authorized to update this student" });
    }

    student.progress = progress;
    await student.save();

    res.json({ message: "Student progress updated", student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark student
export const markStudent = async (req, res) => {
  try {
    const { studentId, title, value } = req.body;

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Verify supervisor is assigned to this student
    const supervisor = await Supervisor.findOne({ user: req.user._id });

    if (!supervisor.students.includes(student._id)) {
      return res
        .status(401)
        .json({ message: "Not authorized to mark this student" });
    }

    student.marks.push({
      title,
      value,
      assignedBy: req.user._id,
    });

    await student.save();

    res.json({ message: "Student marked successfully", student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send message to student/team
export const sendMessage = async (req, res) => {
  try {
    const { recipientType, recipientId, subject, content } = req.body;

    let recipients = [];

    if (recipientType === "student") {
      const student = await Student.findById(recipientId);

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      recipients.push(student.user);
    } else if (recipientType === "team") {
      const team = await Team.findById(recipientId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get all team members' user IDs
      const students = await Student.find({ _id: { $in: team.members } });
      recipients = students.map((student) => student.user);

      // Create message
      const message = await Message.create({
        sender: req.user._id,
        recipients,
        team: team._id,
        subject,
        content,
      });

      res.status(201).json(message);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Review project report
export const reviewReport = async (req, res) => {
  try {
    const { projectId, reportId, feedback, grade } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Verify supervisor is assigned to this project
    if (project.supervisor.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to review this project" });
    }

    // Find the report
    const reportIndex = project.reports.findIndex(
      (report) => report._id.toString() === reportId
    );

    if (reportIndex === -1) {
      return res.status(404).json({ message: "Report not found" });
    }

    project.reports[reportIndex].feedback = feedback;
    project.reports[reportIndex].grade = grade;

    await project.save();

    res.json({ message: "Report reviewed successfully", project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
