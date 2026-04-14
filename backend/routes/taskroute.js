const express = require("express");
const router = express.Router();
const taskService = require("../services/taskservice");
const { authenticateToken } = require("../middlewares/authmiddleware");

// Auto-create task from email
router.post("/:emailId/auto-create", authenticateToken, taskService.autoCreateFromEmail);

// Fetch all tasks and events
router.get("/all", authenticateToken, taskService.getAllTasksAndEvents);

// Manual CRUD
router.post("/manual", authenticateToken, taskService.manualCreate);
router.patch("/:id", authenticateToken, taskService.updateTaskOrEvent);
router.delete("/:id", authenticateToken, taskService.deleteTaskOrEvent);

module.exports = router;
