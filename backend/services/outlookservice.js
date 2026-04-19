const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Email, EmailPriority } = require("../models");
const userService = require("./userservice");
const priorityService = require("./priorityservice");
const sseService = require("./sseservice");
const notificationService = require("./notificationservice");

const { OUTLOOK_REDIRECT_URI, FRONTEND_URL, buildFrontendUrl, requestWantsJson } = require("../utils/envConfig");
const OUTLOOK_CLIENT_ID = String(process.env.OUTLOOK_CLIENT_ID || "").trim();
const OUTLOOK_CLIENT_SECRET = String(process.env.OUTLOOK_CLIENT_SECRET || "").trim();

const AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";
const TOKEN_URL = `${AUTH_BASE}/token`;
const AUTHORIZE_URL = `${AUTH_BASE}/authorize`;
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const OUTLOOK_SCOPES = ["offline_access", "openid", "profile", "email", "Mail.Read", "Mail.Send", "User.Read", "Tasks.ReadWrite", "Calendars.ReadWrite"];

function getOutlookRecentDays() {
  const configured = Number(process.env.OUTLOOK_FETCH_RECENT_DAYS || 2);
  if (!Number.isFinite(configured)) {
    return 2;
  }

  // Keep Outlook sync intentionally narrow as requested: only 1-2 days.
  return Math.min(Math.max(Math.floor(configured), 1), 2);
}

function buildOutlookRecentFilter(days) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return `isRead eq false and receivedDateTime ge ${since}`;
}

// Helper functions moved to envConfig

function getLinkedUserIdFromCookie(req) {
  const token = req.cookies?.token || null;

  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

function buildOauthLinkState(req, provider) {
  const linkedUserId = getLinkedUserIdFromCookie(req);
  if (!linkedUserId || !process.env.JWT_SECRET) {
    return null;
  }

  return jwt.sign(
    { linkUserId: linkedUserId, provider },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function getLinkedUserIdFromState(state, provider) {
  if (!state || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(String(state), process.env.JWT_SECRET);
    if (decoded?.provider !== provider) {
      return null;
    }
    return decoded?.linkUserId || null;
  } catch {
    return null;
  }
}

function resolveLinkedUserId(req, provider) {
  return getLinkedUserIdFromCookie(req) || getLinkedUserIdFromState(req.query?.state, provider);
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function ensureOutlookConfig() {
  if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET || !OUTLOOK_REDIRECT_URI) {
    const missing = [
      !OUTLOOK_CLIENT_ID ? "OUTLOOK_CLIENT_ID" : null,
      !OUTLOOK_CLIENT_SECRET ? "OUTLOOK_CLIENT_SECRET" : null,
      !OUTLOOK_REDIRECT_URI ? "OUTLOOK_REDIRECT_URI" : null
    ].filter(Boolean);
    const error = new Error(`Missing Outlook OAuth configuration: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  try {
    // Force canonical validation up front to catch malformed redirect values.
    new URL(OUTLOOK_REDIRECT_URI);
  } catch {
    const error = new Error("OUTLOOK_REDIRECT_URI must be a valid absolute URL.");
    error.statusCode = 500;
    throw error;
  }
}
function parseSender(from) {
  const sender = from?.emailAddress || {};
  return {
    senderEmail: sender.address || "",
    senderName: sender.name || ""
  };
}

async function getJson(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.error_description || `Request failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

async function postForm(url, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error_description || data?.error?.message || `Token request failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

const outlookService = {
  async login(req, res) {
    try {
      ensureOutlookConfig();
      const oauthState = buildOauthLinkState(req, "outlook");

      const authUrl = new URL(AUTHORIZE_URL);
      authUrl.searchParams.set("client_id", OUTLOOK_CLIENT_ID);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", OUTLOOK_REDIRECT_URI);
      authUrl.searchParams.set("response_mode", "query");
      authUrl.searchParams.set("scope", OUTLOOK_SCOPES.join(" "));
      authUrl.searchParams.set("prompt", "select_account");
      if (oauthState) {
        authUrl.searchParams.set("state", oauthState);
      }

      return res.json({
        message: "Click the link to login with Outlook",
        loginUrl: authUrl.toString()
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to generate Outlook login URL" });
    }
  },

  async oauthCallback(req, res) {
    try {
      ensureOutlookConfig();
      const { code, error } = req.query;

      if (error) {
        if (!requestWantsJson(req)) {
          return res.redirect(buildFrontendUrl("/auth/outlook/callback", { error }));
        }
        return res.status(400).json({ error: `Authorization denied: ${error}` });
      }

      if (!code) {
        if (!requestWantsJson(req)) {
          return res.redirect(buildFrontendUrl("/auth/outlook/callback", { error: "Authorization code not found" }));
        }
        return res.status(400).json({ error: "Authorization code not found" });
      }

      const tokens = await postForm(TOKEN_URL, {
        client_id: OUTLOOK_CLIENT_ID,
        client_secret: OUTLOOK_CLIENT_SECRET,
        code,
        redirect_uri: OUTLOOK_REDIRECT_URI,
        grant_type: "authorization_code",
        scope: OUTLOOK_SCOPES.join(" ")
      });

      const me = await getJson(`${GRAPH_BASE}/me?$select=id,displayName,mail,userPrincipalName`, tokens.access_token);
      const email = me.mail || me.userPrincipalName;

      if (!email) {
        throw new Error("Outlook profile is missing an email address");
      }

      const linkedUserId = resolveLinkedUserId(req, "outlook");

      const user = await userService.createOrUpdateOutlookUser({
        id: me.id,
        email,
        name: me.displayName || email
      }, {
        linkedUserId
      });

      await userService.saveOutlookTokens(user.id, tokens);

      const fetchResult = await outlookService.fetchEmailsFromOutlook(user.id, tokens.access_token);

      const jwtToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      setTokenCookie(res, jwtToken);

      if (!requestWantsJson(req)) {
        return res.redirect(buildFrontendUrl("/dashboard", {
          userId: user.id,
          provider: "outlook",
          oauth: "success"
        }));
      }

      return res.json({
        message: "Outlook login successful",
        token: jwtToken,
        userId: user.id,
        emailsFetched: fetchResult.newEmails.length,
        unreadSync: fetchResult.unreadSync,
        prioritySync: fetchResult.prioritySync
      });
    } catch (error) {
      if (!requestWantsJson(req)) {
        return res.redirect(buildFrontendUrl("/auth/outlook/callback", {
          error: error.message || "Outlook OAuth login failed"
        }));
      }

      return res.status(error.statusCode || 500).json({
        error: error.message || "Outlook OAuth login failed"
      });
    }
  },

  async refreshAppToken(req, res) {
    try {
      ensureOutlookConfig();
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required." });
      }

      const user = await userService.getUserById(userId);

      if (!user.encrypted_outlook_refresh_token) {
        return res.status(401).json({
          error: "No Outlook refresh token on file. Please log in again via /outlook/login."
        });
      }

      const { refreshToken } = userService.decryptOutlookTokens(user);

      const tokens = await postForm(TOKEN_URL, {
        client_id: OUTLOOK_CLIENT_ID,
        client_secret: OUTLOOK_CLIENT_SECRET,
        refresh_token: refreshToken,
        redirect_uri: OUTLOOK_REDIRECT_URI,
        grant_type: "refresh_token",
        scope: OUTLOOK_SCOPES.join(" ")
      });

      await userService.saveOutlookTokens(user.id, {
        ...tokens,
        refresh_token: tokens.refresh_token || refreshToken
      });

      const newJwt = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      setTokenCookie(res, newJwt);

      return res.json({
        message: "Token refreshed successfully.",
        token: newJwt,
        userId: user.id
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "Outlook token refresh failed."
      });
    }
  },

  async getNewMails(req, res) {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);

      if (!user.encrypted_outlook_access_token) {
        return res.status(401).json({
          error: "User not authenticated with Outlook"
        });
      }

      let { accessToken, refreshToken } = userService.decryptOutlookTokens(user);

      const expiry = user.outlook_token_expiry ? new Date(user.outlook_token_expiry) : null;
      let refreshed = false;

      // Ensure token is fresh before first request
      if (refreshToken && (!expiry || expiry.getTime() - Date.now() < 300000)) {
        try {
          const tokens = await postForm(TOKEN_URL, {
            client_id: OUTLOOK_CLIENT_ID,
            client_secret: OUTLOOK_CLIENT_SECRET,
            refresh_token: refreshToken,
            redirect_uri: OUTLOOK_REDIRECT_URI,
            grant_type: "refresh_token",
            scope: OUTLOOK_SCOPES.join(" ")
          });
          await userService.saveOutlookTokens(user.id, tokens);
          accessToken = tokens.access_token;
          refreshed = true;
        } catch (e) {
          console.warn("[Outlook] Proactive token refresh failed:", e.message);
        }
      }

      let fetchResult;
      try {
        fetchResult = await outlookService.fetchEmailsFromOutlook(user.id, accessToken);
      } catch (innerError) {
        if (innerError.statusCode === 401 && !refreshed && refreshToken) {
          // Attempt refresh if 401 explicitly detected
          const tokens = await postForm(TOKEN_URL, {
            client_id: OUTLOOK_CLIENT_ID,
            client_secret: OUTLOOK_CLIENT_SECRET,
            refresh_token: refreshToken,
            redirect_uri: OUTLOOK_REDIRECT_URI,
            grant_type: "refresh_token",
            scope: OUTLOOK_SCOPES.join(" ")
          });
          await userService.saveOutlookTokens(user.id, tokens);
          accessToken = tokens.access_token;
          fetchResult = await outlookService.fetchEmailsFromOutlook(user.id, accessToken);
        } else {
          throw innerError;
        }
      }

      return res.json({
        message: "Outlook emails fetched successfully",
        count: fetchResult.newEmails.length,
        emails: fetchResult.newEmails,
        unreadSync: fetchResult.unreadSync,
        prioritySync: fetchResult.prioritySync
      });
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 400 || (error.message && error.message.includes("invalid_grant"))) {
        // If entirely invalid, we clear tokens to force user to reconnect
        await userService.getUserById(req.params.userId).then(u => u.update({
             encrypted_outlook_access_token: null,
             encrypted_outlook_refresh_token: null,
             outlook_token_expiry: null
        }));
        return res.status(401).json({ error: "Outlook session expired or invalid. Please reconnect Outlook." });
      }
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  },

  async fetchEmailsFromOutlook(userId, accessToken) {
    const recentDays = getOutlookRecentDays();
    const filter = encodeURIComponent(buildOutlookRecentFilter(recentDays));
    const query = [
      "$top=10",
      "$orderby=receivedDateTime desc",
      `$filter=${filter}`,
      "$select=id,conversationId,subject,bodyPreview,from,receivedDateTime,isRead,webLink"
    ].join("&");

    const data = await getJson(`${GRAPH_BASE}/me/mailFolders/inbox/messages?${query}`, accessToken);
    const messages = data.value || [];
    const savedEmails = [];
    const emailsToAnalyze = [];

    for (const message of messages) {
      const exists = await Email.findOne({
        where: {
          user_id: userId,
          mail_msg_id: message.id,
          provider: "outlook"
        }
      });
      const { senderEmail, senderName } = parseSender(message.from);

      const payload = {
        mail_thread_id: message.conversationId || null,
        subject: message.subject || "",
        snippet: message.bodyPreview || "",
        sender_email: senderEmail,
        sender_name: senderName,
        received_at: message.receivedDateTime ? new Date(message.receivedDateTime) : null,
        is_read: Boolean(message.isRead),
        mail_link: message.webLink || ""
      };

      if (exists) {
        await exists.update({
          provider: "outlook",
          ...payload
        });

        const existingPriority = await EmailPriority.findOne({
          where: { email_id: exists.id },
          attributes: ["id"]
        });

        if (!existingPriority) {
          emailsToAnalyze.push(exists);
        }
        continue;
      }

      const email = await Email.create({
        user_id: userId,
        provider: "outlook",
        mail_msg_id: message.id,
        ...payload
      });

      savedEmails.push(email);
      emailsToAnalyze.push(email);
    }

    const unreadSync = await outlookService.syncUnreadStatuses(userId, accessToken);

    const prioritySync = {
      attempted: emailsToAnalyze.length,
      analyzed: 0,
      failed: 0
    };

    for (const emailRecord of emailsToAnalyze) {
      try {
        const outcome = await priorityService.analyzeEmail(emailRecord.id, { userInput: "" });
        if (outcome.success) {
          prioritySync.analyzed++;

          // Create notification for MUST-READ emails
          if (outcome.priorityLabel === "URGENT" || outcome.priorityLabel === "IMPORTANT") {
            await notificationService.createNotification({
              userId,
              type: "priority",
              title: `High Priority: ${emailRecord.subject.substring(0, 50)}${emailRecord.subject.length > 50 ? "..." : ""}`,
              message: `You have a new ${outcome.priorityLabel.toLowerCase()} email from ${emailRecord.sender_email}.`,
              emailId: emailRecord.mail_msg_id
            });
          }
        } else {
          prioritySync.failed++;
        }
      } catch {
        prioritySync.failed++;
      }
    }

    if (savedEmails.length > 0) {
      // Re-fetch to include EmailPriority joined
      const finalEmails = await Email.findAll({
        where: { id: { [Op.in]: savedEmails.map(e => e.id) } },
        include: [{ model: EmailPriority, required: false }]
      });

      const payloadEmails = finalEmails.map((email) => {
        const json = email.toJSON();
        if (email.EmailPriority) {
          json.priority = {
            label: email.EmailPriority.priority_label,
            score: email.EmailPriority.priority_score,
            reason: email.EmailPriority.reason
          };
        }
        return json;
      });

      sseService.broadcastToUser(String(userId), "new_emails", {
        userId,
        count: payloadEmails.length,
        emails: payloadEmails,
        unreadSync,
        prioritySync,
        emittedAt: new Date().toISOString()
      });
    }

    // Return enriched emails
    const enrichedSavedEmails = await Email.findAll({
      where: { id: { [Op.in]: savedEmails.map(e => e.id) } },
      include: [{ model: EmailPriority, required: false }]
    });

    return {
      newEmails: enrichedSavedEmails,
      unreadSync,
      prioritySync,
      windowDays: recentDays
    };
  },

  async syncUnreadStatuses(userId, accessToken) {
    const unreadEmails = await Email.findAll({
      where: {
        user_id: userId,
        provider: "outlook",
        is_read: false
      },
      attributes: ["id", "mail_msg_id"]
    });

    let markedRead = 0;
    let stillUnread = 0;
    let failed = 0;

    for (const email of unreadEmails) {
      if (!email.mail_msg_id) {
        failed++;
        continue;
      }

      try {
        const msg = await getJson(`${GRAPH_BASE}/me/messages/${email.mail_msg_id}?$select=isRead`, accessToken);
        const isReadNow = Boolean(msg.isRead);

        if (isReadNow) {
          await email.update({ is_read: true });
          markedRead++;
        } else {
          stillUnread++;
        }
      } catch {
        failed++;
      }
    }

    return {
      checked: unreadEmails.length,
      markedRead,
      stillUnread,
      failed
    };
  },

  async getMails(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const emails = await Email.findAndCountAll({
        where: {
          user_id: userId,
          provider: "outlook"
        },
        offset,
        limit: limitNum,
        order: [["received_at", "DESC"]]
      });

      return res.json({
        total: emails.count,
        emails: emails.rows
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to fetch emails"
      });
    }
  },

  async getEmail(req, res) {
    try {
      const { emailId } = req.params;
      const email = await Email.findOne({
        where: {
          id: emailId,
          provider: "outlook"
        }
      });

      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }

      return res.json(email);
    } catch {
      return res.status(500).json({ error: "Failed to fetch email" });
    }
  },

  async getUnread(req, res) {
    try {
      const { userId } = req.params;
      const emails = await Email.findAll({
        where: {
          user_id: userId,
          provider: "outlook",
          is_read: false
        }
      });

      return res.json(emails);
    } catch {
      return res.status(500).json({ error: "Failed to fetch unread emails" });
    }
  },

  async search(req, res) {
    try {
      const { userId } = req.params;
      const query = String(req.query.query || req.query.q || "").trim();

      if (!query) {
        return res.status(400).json({ error: "Search query required" });
      }

      const emails = await Email.findAll({
        where: {
          user_id: userId,
          [Op.or]: [
            { subject: { [Op.like]: `%${query}%` } },
            { snippet: { [Op.like]: `%${query}%` } },
            { sender_email: { [Op.like]: `%${query}%` } }
          ]
        }
      });

      return res.json(emails);
    } catch {
      return res.status(500).json({ error: "Search failed" });
    }
  },

  async getEmailBody(userId, emailRecord) {
    try {
        const user = await userService.getUserById(userId);
        const { accessToken } = userService.decryptOutlookTokens(user);
        const data = await getJson(`${GRAPH_BASE}/me/messages/${emailRecord.mail_msg_id}?$select=body`, accessToken);
        
        let content = data?.body?.content || "";
        let isHtml = data?.body?.contentType?.toLowerCase() === "html";
        
        if (!content) {
            content = emailRecord.snippet || "No additional content found.";
            isHtml = false;
        }
        
        return { content, isHtml };
    } catch (err) {
        console.error("Failed to fetch full Outlook body:", err.message);
        return { content: emailRecord.snippet || "Failed to load original message.", isHtml: false };
    }
  },

  async sendReply(userId, email, textBody) {
    const user = await userService.getUserById(userId);
    if (!user || !user.encrypted_outlook_access_token) {
      throw new Error("Outlook access token not found. Please log in.");
    }
    const { accessToken } = userService.decryptOutlookTokens(user);

    let endpoint = `${GRAPH_BASE}/me/sendMail`;
    let payload = {};

    if (email.mail_msg_id) {
        endpoint = `${GRAPH_BASE}/me/messages/${email.mail_msg_id}/reply`;
        payload = {
            comment: textBody
        };
    } else {
        payload = {
          message: {
            subject: email.subject.toLowerCase().startsWith("re:") ? email.subject : `Re: ${email.subject}`,
            body: {
              contentType: "Text",
              content: textBody
            },
            toRecipients: [
              {
                emailAddress: {
                  address: email.sender_email
                }
              }
            ]
          },
          saveToSentItems: "true"
        };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Failed to send Outlook email.");
    }
    return true;
  },

  async createTask(userId, taskDetails) {
    const user = await userService.getUserById(userId);
    if (!user || !user.encrypted_outlook_access_token) {
      throw new Error("Outlook access token not found. Please log in.");
    }
    const { accessToken } = userService.decryptOutlookTokens(user);

    const listsData = await getJson(`${GRAPH_BASE}/me/todo/lists`, accessToken);
    const defaultList = listsData?.value?.[0];

    if (!defaultList) {
        throw new Error("No Microsoft To Do lists found.");
    }

    const payload = {
        title: taskDetails.title,
        body: {
            content: taskDetails.description,
            contentType: "text"
        }
    };

    if (taskDetails.dueDate) {
        payload.dueDateTime = {
            dateTime: new Date(taskDetails.dueDate).toISOString(),
            timeZone: "UTC"
        };
    }

    const response = await fetch(`${GRAPH_BASE}/me/todo/lists/${defaultList.id}/tasks`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Failed to create Outlook task.");
    }

    return await response.json();
  },

  async createEvent(userId, eventDetails) {
    const user = await userService.getUserById(userId);
    if (!user || !user.encrypted_outlook_access_token) {
      throw new Error("Outlook access token not found. Please log in.");
    }
    const { accessToken } = userService.decryptOutlookTokens(user);

    const payload = {
        subject: eventDetails.title,
        location: {
            displayName: eventDetails.location || ""
        },
        body: {
            contentType: "Text",
            content: eventDetails.description
        },
        start: {
            dateTime: new Date(eventDetails.startTime).toISOString(),
            timeZone: "UTC"
        },
        end: {
            dateTime: new Date(eventDetails.endTime).toISOString(),
            timeZone: "UTC"
        }
    };

    // Add attendees
    if (eventDetails.attendees && Array.isArray(eventDetails.attendees)) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const attendeesPayload = eventDetails.attendees.map(a => {
            const isEmail = emailRegex.test(a);
            return {
                emailAddress: {
                    address: isEmail ? a : "",
                    name: isEmail ? "" : a
                },
                type: "required"
            };
        });

        if (attendeesPayload.length > 0) {
            payload.attendees = attendeesPayload;
        }

        // Append names to description for visibility if they might be missing email addresses
        const namesOnly = eventDetails.attendees.filter(a => !emailRegex.test(a));
        if (namesOnly.length > 0) {
            payload.body.content += `\n\nAttendees: ${namesOnly.join(", ")}`;
        }
    }

    const response = await fetch(`${GRAPH_BASE}/me/events`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Failed to create Outlook event.");
    }

    return await response.json();
  },

  async fetchTasksAndEvents(userId, accessToken) {
    const events = [];
    try {
        const now = new Date();
        const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(); // 1 month ago
        const evRes = await getJson(`${GRAPH_BASE}/me/events?$filter=start/dateTime ge '${timeMin}'&$top=50&$orderby=start/dateTime`, accessToken);
        
        if (evRes && evRes.value) {
            evRes.value.forEach(ev => {
                events.push({
                    id: ev.id,
                    providerId: ev.id,
                    type: "event",
                    source: "outlook",
                    title: ev.subject || "Untitled Event",
                    description: ev.bodyPreview || "",
                    time: ev.start ? ev.start.dateTime : null,
                    endTime: ev.end ? ev.end.dateTime : null,
                    htmlLink: ev.webLink
                });
            });
        }
    } catch (e) {
        console.error("[outlookService] Error fetching events:", e.message);
    }

    const taskItems = [];
    try {
        // Fetch the default task list
        const listsRes = await getJson(`${GRAPH_BASE}/me/todo/lists`, accessToken);
        const list = listsRes?.value?.find(l => l.wellknownListName === "defaultList") || listsRes?.value?.[0];

        if (list) {
            const taskRes = await getJson(`${GRAPH_BASE}/me/todo/lists/${list.id}/tasks?$top=50`, accessToken);
            if (taskRes && taskRes.value) {
                taskRes.value.forEach(tk => {
                    taskItems.push({
                        id: tk.id,
                        providerId: tk.id,
                        type: "task",
                        source: "outlook",
                        title: tk.title || "Untitled Task",
                        description: tk.body?.content || "",
                        time: tk.dueDateTime ? tk.dueDateTime.dateTime : null,
                        status: tk.status,
                        completed: tk.status === "completed"
                    });
                });
            }
        }
    } catch (e) {
        console.error("[outlookService] Error fetching tasks:", e.message);
    }

    return { tasks: taskItems, events };
  },

  async updateTask(userId, accessToken, taskId, details) {
    // Find default list id first
    const listsRes = await getJson(`${GRAPH_BASE}/me/todo/lists`, accessToken);
    const list = listsRes?.value?.find(l => l.wellknownListName === "defaultList") || listsRes?.value?.[0];
    if (!list) throw new Error("Could not find default task list in Outlook.");

    const payload = {};
    if (details.title !== undefined) payload.title = details.title;
    if (details.description !== undefined) payload.body = { content: details.description, contentType: "text" };
    if (details.dueDate !== undefined) {
      payload.dueDateTime = details.dueDate ? { dateTime: new Date(details.dueDate).toISOString(), timeZone: "UTC" } : null;
    }
    if (details.completed !== undefined) {
      payload.status = details.completed ? "completed" : "notStarted";
    }

    const response = await fetch(`${GRAPH_BASE}/me/todo/lists/${list.id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Failed to update Outlook task.");
    }

    return await response.json();
  },

  async deleteTask(userId, accessToken, taskId) {
    const listsRes = await getJson(`${GRAPH_BASE}/me/todo/lists`, accessToken);
    const list = listsRes?.value?.find(l => l.wellknownListName === "defaultList") || listsRes?.value?.[0];
    if (!list) throw new Error("Could not find default task list in Outlook.");

    const response = await fetch(`${GRAPH_BASE}/me/todo/lists/${list.id}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Failed to delete Outlook task.");
    }

    return true;
  },

  async updateEvent(userId, accessToken, eventId, details) {
    const payload = {};
    if (details.title !== undefined) payload.subject = details.title;
    if (details.description !== undefined) payload.body = { content: details.description, contentType: "text" };
    if (details.startTime) payload.start = { dateTime: new Date(details.startTime).toISOString(), timeZone: "UTC" };
    if (details.endTime) payload.end = { dateTime: new Date(details.endTime).toISOString(), timeZone: "UTC" };

    const response = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Failed to update Outlook event.");
    }

    return await response.json();
  },

  async deleteEvent(userId, accessToken, eventId) {
    const response = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Failed to delete Outlook event.");
    }

    return true;
  }
};

outlookService.fetchByUser = outlookService.getNewMails;
outlookService.getEmails = outlookService.getMails;

module.exports = outlookService;
