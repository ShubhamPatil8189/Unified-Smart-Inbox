const express = require("express");
const router = express.Router();
const notificationService = require("../services/notificationservice");
const { authenticateToken } = require("../middlewares/authmiddleware");

// Get all notifications for a user
router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(userId) !== String(req.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const notifications = await notificationService.getNotificationsForUser(userId);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark a single notification as read
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read for a user
router.patch("/user/:userId/read-all", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(userId) !== String(req.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await notificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a notification
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
