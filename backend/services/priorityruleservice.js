const { PriorityRule } = require("../models");

const priorityRuleService = {
  /**
   * Matches an email against the user's custom priority rules.
   * @param {Object} email The email record from DB
   * @returns {Object|null} Synthetic analysis result or null
   */
  async matchEmailToRule(email) {
    try {
      const rules = await PriorityRule.findAll({
        where: { user_id: email.user_id, is_active: true }
      });

      if (!rules || rules.length === 0) return null;

      // Normalize fields for matching
      const sender = (email.sender_email || "").toLowerCase();
      const subject = (email.subject || "").toLowerCase();

      // Find all matching rules
      const matches = rules.filter(rule => {
        const pattern = (rule.pattern || "").toLowerCase();
        
        if (rule.type === "SENDER") {
          return sender === pattern;
        }
        if (rule.type === "DOMAIN") {
          return sender.endsWith(pattern.startsWith("@") ? pattern : `@${pattern}`);
        }
        if (rule.type === "SUBJECT") {
          return subject.includes(pattern);
        }
        return false;
      });

      if (matches.length === 0) return null;

      // Select the rule with the highest priority
      // URGENT > IMPORTANT > NORMAL > LOW
      const priorityMap = { URGENT: 4, IMPORTANT: 3, NORMAL: 2, LOW: 1 };
      matches.sort((a, b) => priorityMap[b.target_priority] - priorityMap[a.target_priority]);

      const bestMatch = matches[0];

      return {
        priority_label: bestMatch.target_priority,
        priority_score: this.getScoreForLabel(bestMatch.target_priority),
        confidence: 1.0,
        reason: `Matched custom rule: ${bestMatch.type} "${bestMatch.pattern}"`,
        mode: "USER_RULE"
      };
    } catch (error) {
      console.error("[priorityRuleService.matchEmailToRule] Error:", error.message);
      return null;
    }
  },

  getScoreForLabel(label) {
    switch (label) {
      case "URGENT": return 0.95;
      case "IMPORTANT": return 0.75;
      case "NORMAL": return 0.5;
      case "LOW": return 0.2;
      default: return 0.5;
    }
  },

  async getRulesForUser(userId) {
    return await PriorityRule.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]]
    });
  },

  async createRule(userId, data) {
    return await PriorityRule.create({
      user_id: userId,
      type: data.type,
      pattern: data.pattern,
      target_priority: data.target_priority,
      is_active: true
    });
  },

  async deleteRule(id) {
    return await PriorityRule.destroy({ where: { id } });
  }
};

module.exports = priorityRuleService;
