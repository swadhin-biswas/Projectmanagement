import express from "express";
import {
  getSupervisorStudents,
  getSupervisorTeams,
  markStudent,
  reviewReport,
  sendMessage,
  updateStudentProgress,
} from "../controllers/supervisorController.js";
import { protect, supervisor } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.use(supervisor);

router.get("/students", getSupervisorStudents);
router.get("/teams", getSupervisorTeams);
router.put("/student-progress", updateStudentProgress);
router.post("/mark-student", markStudent);
router.post("/send-message", sendMessage);
router.post("/review-report", reviewReport);

export default router;
