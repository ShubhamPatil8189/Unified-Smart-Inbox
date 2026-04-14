const { Email, EmailAction } = require("../models");


const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

const taskService = {
  async autoCreateFromEmail(req, res) {
    try {
      const gmailService = require("./gmailservice");
      const outlookService = require("./outlookservice");
      const { emailId } = req.params;
      const userId = req.userId;

      if (!OPENROUTER_API_KEY) {
        return res.status(503).json({ error: "AI service not configured. Set OPENROUTER_API_KEY." });
      }

      const email = await Email.findByPk(emailId);
      if (!email || String(email.user_id) !== String(userId)) {
        return res.status(404).json({ error: "Email not found" });
      }

      const snippet = email.snippet || "";
      const subject = email.subject || "";
      
      const systemPrompt = `You are an AI assistant that extracts actionable requests or events from an email.
Decide if the email describes a task (no specific start/end time) or an event (specific start/end times).

Output exactly a JSON object (and nothing else) in this schema:
{
  "type": "task" | "event" | "none",
  "title": "<string>",
  "description": "<string>",
  "location": "<string> (only if event)",
  "attendees": ["<name or email>", "..."],
  "dueDate": "<YYYY-MM-DDTHH:mm:ssZ>" (only if type=task and provided, else null),
  "startTime": "<YYYY-MM-DDTHH:mm:ssZ>" (only if type=event),
  "endTime": "<YYYY-MM-DDTHH:mm:ssZ>" (only if type=event)
}

If no clear task or event is found, set type to "none". Use the current date for context: ${new Date().toISOString()}`;

      const userPrompt = `Subject: ${subject}\nSnippet: ${snippet}`;

      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (!aiRes.ok) {
        throw new Error("AI service request failed");
      }

      const aiData = await aiRes.json();
      const content = aiData.choices[0].message.content;
      
      let parsed = { type: "none" };
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      }

      if (parsed.type === "none") {
        return res.json({ success: false, message: "No actionable task or event detected in email." });
      }

      const providerService = email.provider === "outlook" ? outlookService : gmailService;
      let resultData;

      if (parsed.type === "event") {
        if (!parsed.startTime) {
           return res.json({ success: false, message: "Event detected but no start time found." });
        }
        if (!parsed.endTime) {
           const d = new Date(parsed.startTime);
           d.setHours(d.getHours() + 1);
           parsed.endTime = d.toISOString();
        }
        resultData = await providerService.createEvent(userId, {
            title: parsed.title || "New Event",
            description: parsed.description || `Generated from email: ${subject}`,
            location: parsed.location,
            attendees: parsed.attendees,
            startTime: parsed.startTime,
            endTime: parsed.endTime
        });
      } else {
        resultData = await providerService.createTask(userId, {
            title: parsed.title || "New Task",
            description: parsed.description || `Generated from email: ${subject}`,
            dueDate: parsed.dueDate
        });
      }

      return res.json({
        success: true,
        type: parsed.type,
        details: parsed,
        providerResponse: resultData
      });

    } catch (error) {
      console.error("[taskService] autoCreateFromEmail failed:", error);
      return res.status(500).json({ error: error.message || "Failed to create task/event." });
    }
  },

  async getAllTasksAndEvents(req, res) {
    try {
      const userId = req.userId;
      const userService = require("./userservice"); // require locally to avoid fast circular dependencies if any
      const user = await userService.getUserById(userId);
      const gmailService = require("./gmailservice");
      const outlookService = require("./outlookservice");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let gmailData = { tasks: [], events: [] };
      let outlookData = { tasks: [], events: [] };

      // Fetch from Gmail if connected
      if (user.encrypted_access_token || user.encrypted_refresh_token) {
        gmailData = await gmailService.fetchTasksAndEvents(user.id);
      }

      // Fetch from Outlook if connected
      if (user.encrypted_outlook_access_token || user.encrypted_outlook_refresh_token) {
        const { accessToken } = userService.decryptOutlookTokens(user);
        // Warning: if the token is expired, `outlookService.fetchTasksAndEvents` might fail. 
        // A robust app should reuse the auto-refresh wrapper, but for simplicity we assume it works or returns [] right now.
        if (accessToken) {
            outlookData = await outlookService.fetchTasksAndEvents(user.id, accessToken);
        }
      }

      const tasks = [...(gmailData.tasks || []), ...(outlookData.tasks || [])].sort((a, b) => {
        if (!a.time) return 1; if (!b.time) return -1;
        return new Date(a.time) - new Date(b.time);
      });

      const events = [...(gmailData.events || []), ...(outlookData.events || [])].sort((a, b) => {
        if (!a.time) return 1; if (!b.time) return -1;
        return new Date(a.time) - new Date(b.time);
      });

      return res.json({ success: true, tasks, events });
    } catch (error) {
      console.error("[taskService] getAllTasksAndEvents failed:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch tasks/events." });
    }
  },

  async manualCreate(req, res) {
    try {
      const userId = req.userId;
      const { provider, type, title, description, startTime, endTime, dueDate } = req.body;
      const userService = require("./userservice");
      const user = await userService.getUserById(userId);
      const gmailService = require("./gmailservice");
      const outlookService = require("./outlookservice");

      if (provider === "gmail") {
        if (type === "event") {
          const result = await gmailService.createEvent(userId, { title, description, startTime, endTime });
          return res.json({ success: true, item: result });
        } else {
          const result = await gmailService.createTask(userId, { title, description, dueDate });
          return res.json({ success: true, item: result });
        }
      } else if (provider === "outlook") {
        const { accessToken } = userService.decryptOutlookTokens(user);
        if (type === "event") {
          const result = await outlookService.createEvent(userId, { title, description, startTime, endTime });
          return res.json({ success: true, item: result });
        } else {
          const result = await outlookService.createTask(userId, { title, description, dueDate });
          return res.json({ success: true, item: result });
        }
      }
      return res.status(400).json({ error: "Invalid provider" });
    } catch (error) {
      console.error("[taskService] manualCreate failed:", error);
      return res.status(500).json({ error: error.message });
    }
  },

  async updateTaskOrEvent(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { provider, type, details } = req.body;
      const userService = require("./userservice");
      const user = await userService.getUserById(userId);
      const gmailService = require("./gmailservice");
      const outlookService = require("./outlookservice");

      if (provider === "gmail") {
        if (type === "event") {
          const result = await gmailService.updateEvent(userId, id, details);
          return res.json({ success: true, item: result });
        } else {
          const result = await gmailService.updateTask(userId, id, details);
          return res.json({ success: true, item: result });
        }
      } else if (provider === "outlook") {
        const { accessToken } = userService.decryptOutlookTokens(user);
        if (type === "event") {
          const result = await outlookService.updateEvent(userId, accessToken, id, details);
          return res.json({ success: true, item: result });
        } else {
          const result = await outlookService.updateTask(userId, accessToken, id, details);
          return res.json({ success: true, item: result });
        }
      }
      return res.status(400).json({ error: "Invalid provider" });
    } catch (error) {
      console.error("[taskService] updateTaskOrEvent failed:", error);
      return res.status(500).json({ error: error.message });
    }
  },

  async deleteTaskOrEvent(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { provider, type } = req.query; // pass as query params for DELETE
      const userService = require("./userservice");
      const user = await userService.getUserById(userId);
      const gmailService = require("./gmailservice");
      const outlookService = require("./outlookservice");

      if (provider === "gmail") {
        if (type === "event") {
          await gmailService.deleteEvent(userId, id);
        } else {
          await gmailService.deleteTask(userId, id);
        }
      } else if (provider === "outlook") {
        const { accessToken } = userService.decryptOutlookTokens(user);
        if (type === "event") {
          await outlookService.deleteEvent(userId, accessToken, id);
        } else {
          await outlookService.deleteTask(userId, accessToken, id);
        }
      } else {
        return res.status(400).json({ error: "Invalid provider" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("[taskService] deleteTaskOrEvent failed:", error);
      return res.status(500).json({ error: error.message });
    }
  },

  async handleAIExtraction(email, actionData) {
    try {
      if (!actionData || !actionData.type || !actionData.title) return null;
      const gmailService = require("./gmailservice");
      const outlookService = require("./outlookservice");

      const type = actionData.type.toUpperCase() === "EVENT" ? "EVENT" : "TASK";
      
      // 1. Create local record
      const localAction = await EmailAction.create({
        user_id: email.user_id,
        email_id: email.id,
        type,
        title: actionData.title,
        description: actionData.description,
        location: actionData.location,
        attendees: Array.isArray(actionData.attendees) ? actionData.attendees.join(", ") : null,
        due_date: actionData.due_date,
        start_time: actionData.start_time,
        end_time: actionData.end_time,
        status: "DETECTED",
        provider: email.provider
      });

      // 2. Auto-create in provider (optional: only for high-confidence or high-priority)
      try {
        const providerService = email.provider === "outlook" ? outlookService : gmailService;
        let externalResult;

        if (type === "EVENT") {
          externalResult = await providerService.createEvent(email.user_id, {
            title: actionData.title,
            description: actionData.description || `Auto-detected from email: ${email.subject}`,
            location: actionData.location,
            attendees: actionData.attendees,
            startTime: actionData.start_time || new Date().toISOString(),
            endTime: actionData.end_time || new Date(Date.now() + 3600000).toISOString()
          });
        } else {
          externalResult = await providerService.createTask(email.user_id, {
            title: actionData.title,
            description: actionData.description || `Auto-detected from email: ${email.subject}`,
            dueDate: actionData.due_date
          });
        }

        if (externalResult && (externalResult.id || externalResult.id)) {
           await localAction.update({
             status: "CREATED",
             external_id: externalResult.id
           });
        }
      } catch (externalError) {
        console.error("[taskService.handleAIExtraction] External sync failed:", externalError.message);
        await localAction.update({ status: "FAILED" });
      }

      return localAction;
    } catch (error) {
      console.error("[taskService.handleAIExtraction] Failed:", error.message);
      return null;
    }
  }
};

module.exports = taskService;
