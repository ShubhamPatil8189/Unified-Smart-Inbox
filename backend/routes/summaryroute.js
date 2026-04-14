const express = require("express");
const router = express.Router();
const summaryService = require("../services/summaryservice");
const { authenticateToken } = require("../middlewares/authmiddleware");

router.post("/summarize/:emailId", authenticateToken, summaryService.summarizeEmailRoute);
router.post("/summarize/batch", authenticateToken, summaryService.batchSummarizeRoute);

module.exports = router;
