const express = require("express");
const router = express.Router();
const priorityRuleService = require("../services/priorityruleservice");
const { authenticateToken } = require("../middlewares/authmiddleware");

// Apply authentication to all rule routes
router.use(authenticateToken);

// GET all rules for current user
router.get("/", async (req, res) => {
  try {
    const rules = await priorityRuleService.getRulesForUser(req.userId);
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new rule
router.post("/", async (req, res) => {
  try {
    const { type, pattern, target_priority } = req.body;
    
    if (!type || !pattern || !target_priority) {
      return res.status(400).json({ error: "Missing required fields: type, pattern, target_priority" });
    }

    const rule = await priorityRuleService.createRule(req.userId, {
      type,
      pattern,
      target_priority
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a rule
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await priorityRuleService.deleteRule(id);
    res.json({ message: "Rule deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
