import express from "express";
import {
  approveSupervisor,
  deleteUser,
  getPendingSupervisors,
  getUsers,
} from "../controllers/adminController.js";
import { admin, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.use(admin);

router.get("/users", getUsers);
router.get("/pending-supervisors", getPendingSupervisors);
router.put("/approve-supervisor/:id", approveSupervisor);
router.delete("/users/:id", deleteUser);

export default router;
