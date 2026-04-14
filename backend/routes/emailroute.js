const express = require("express");
const router = express.Router();
const emailService = require("../services/emailservice");
const { authenticateToken } = require("../middlewares/authmiddleware");

// Get all emails for a user (paginated)
router.get("/user/:userId", authenticateToken, emailService.getUserEmails);

// Get single email by ID
router.get("/:emailId", authenticateToken, emailService.getEmailById);

// Get full original email body
router.get("/:emailId/full", authenticateToken, emailService.getFullEmailBody);

// Get unread emails
router.get("/user/:userId/unread", authenticateToken, emailService.getUnreadEmails);

// Search emails
router.get("/user/:userId/search", authenticateToken, emailService.searchEmails);

// Get recent emails with filters
router.get("/user/:userId/recent", authenticateToken, emailService.getRecentEmails);

// Mark email as read/unread
router.patch("/:emailId/read", authenticateToken, emailService.markEmailAsRead);

// Delete email
router.delete("/:emailId", authenticateToken, emailService.deleteEmail);

// Send reply
router.post("/send", authenticateToken, emailService.sendEmail);

// AI draft reply
router.post("/draft-reply", authenticateToken, emailService.generateDraftReply);

module.exports = router;
