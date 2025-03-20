// server/src/controllers/adminController.js
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { Supervisor } from '../models/Supervisor.js';

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get pending supervisor approvals
export const getPendingSupervisors = async (req, res) => {
  try {
    const pendingSupervisors = await User.find({
      role: "supervisor",
      isApproved: false,
    }).select("-password");

    res.json(pendingSupervisors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve supervisor
export const approveSupervisor = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "supervisor") {
      return res.status(400).json({ message: "User is not a supervisor" });
    }

    user.isApproved = true;
    await user.save();

    res.json({ message: "Supervisor approved successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete role-specific data
    if (user.role === "student") {
      await Student.findOneAndDelete({ user: user._id });
    } else if (user.role === "supervisor") {
      await Supervisor.findOneAndDelete({ user: user._id });
    }

    await user.remove();
    res.json({ message: "User removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
