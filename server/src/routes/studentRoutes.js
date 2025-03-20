import express from "express";
import {
  createProject,
  createTeam,
  getStudentMessages,
  inviteToTeam,
  joinTeam,
  markMessageAsRead,
  submitReport,
} from "../controllers/studentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/create-team", createTeam);
router.post("/join-team", joinTeam);
router.post("/invite-to-team", inviteToTeam);
router.post("/create-project", createProject);
router.post("/submit-report", submitReport);
router.get("/messages", getStudentMessages);
router.put("/messages/:messageId/read", markMessageAsRead);

export default router;
