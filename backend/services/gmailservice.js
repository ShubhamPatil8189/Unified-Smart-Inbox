const { google } = require("googleapis");
const { Email, Label, EmailPriority } = require("../models");
const userService = require("./userservice");
const priorityService = require("./priorityservice");
const sseService = require("./sseservice");
const notificationService = require("./notificationservice");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function buildFrontendUrl(path, params = {}) {
  const url = new URL(path, FRONTEND_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function requestWantsJson(req) {
  const acceptHeader = String(req.headers?.accept || "").toLowerCase();
  return acceptHeader.includes("application/json") && !acceptHeader.includes("text/html");
}

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
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks"
];

function getGmailRecentDays() {
  const configured = Number(process.env.GMAIL_FETCH_RECENT_DAYS || 2);
  if (!Number.isFinite(configured)) {
    return 2;
  }

  // Keep the fetch window narrow: only 1-2 days.
  return Math.min(Math.max(Math.floor(configured), 1), 2);
}

const gmailService = {
  /**
   * Issues a fresh JWT without requiring a new Google OAuth login.
   * Verifies the user still has a valid Google refresh token stored in DB.
   * Called when the client receives TOKEN_EXPIRED (401) from a protected route.
   */
  async refreshAppToken(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required." });
      }

      const user = await userService.getUserById(userId);

      if (!user.encrypted_refresh_token) {
        return res.status(401).json({
          error: "No Google refresh token on file. Please log in again via /gmail/login."
        });
      }

      // Verify the Google refresh token is still valid
      const { accessToken: at, refreshToken: rt } = userService.decryptTokens(user);
      const oauth2Client = gmailService.createOAuthClient(
        at,
        rt,
        user.token_expiry
      );

      let newGoogleTokens;
      try {
        const response = await oauth2Client.refreshAccessToken();
        newGoogleTokens = response.credentials;
      } catch (googleErr) {
        return res.status(401).json({
          error: "Google session has expired. Please log in again via /gmail/login.",
          detail: googleErr.message
        });
      }

      // Persist refreshed Google tokens
      await userService.saveTokens(user.id, newGoogleTokens);

      // Issue a fresh app JWT
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
    } catch (err) {
      return res.status(500).json({ error: err.message || "Token refresh failed." });
    }
  },

  resolveTopicName(inputTopicName) {
    const raw = String(inputTopicName || "").trim().replace(/^['\"]|['\"]$/g, "");
    if (!raw) return null;

    if (/^projects\/[\w-]+\/topics\/[\w.-]+$/.test(raw)) {
      return raw;
    }

    const fullPathMatch = raw.match(/projects\/([\w-]+)\/topics\/([\w.-]+)/);
    if (fullPathMatch) {
      return `projects/${fullPathMatch[1]}/topics/${fullPathMatch[2]}`;
    }

    const projectId = (process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "").trim();
    if (!projectId) return null;

    return `projects/${projectId}/topics/${raw}`;
  },

  createOAuthClient(accessToken, refreshToken, tokenExpiry) {
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: tokenExpiry
    });

    return oauth2Client;
  },

  async getGmailClientForUser(userId) {
    const user = await userService.getUserById(userId);

    if (!user.encrypted_access_token) {
      const error = new Error("User not authenticated");
      error.statusCode = 401;
      throw error;
    }

    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(
      accessToken,
      refreshToken,
      user.token_expiry
    );

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client
    });

    return { user, gmail };
  },

  async streamUserEmails(req, res) {
    const { userId } = req.params;

    if (String(userId) !== String(req.userId)) {
      return res.status(403).json({ error: "Forbidden: you can only stream your own emails." });
    }

    sseService.initStreamHeaders(res);

    const streamUserId = String(userId);
    const clientId = sseService.addClient(streamUserId, res);

    sseService.sendEvent(res, "connected", {
      message: "SSE connected",
      clientId,
      userId: streamUserId,
      connectedAt: new Date().toISOString()
    });

    const heartbeat = setInterval(() => {
      sseService.sendComment(res, "heartbeat");
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseService.removeClient(streamUserId, clientId);
    });
  },

  async login(req, res) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
      );

      const oauthState = buildOauthLinkState(req, "google");

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        ...(oauthState ? { state: oauthState } : {})
      });

      return res.json({
        message: "Click the link to login with Google",
        loginUrl: authUrl
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to generate login URL" });
    }
  },

  async oauthCallback(req, res) {
    try {
      const { code, error } = req.query;

      if (error) {
        if (!requestWantsJson(req)) {
          return res.redirect(buildFrontendUrl("/auth/google/callback", { error }));
        }
        return res.status(400).json({
          error: `Authorization denied: ${error}`
        });
      }

      if (!code) {
        if (!requestWantsJson(req)) {
          return res.redirect(buildFrontendUrl("/auth/google/callback", { error: "Authorization code not found" }));
        }
        return res.status(400).json({
          error: "Authorization code not found"
        });
      }

      const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const googleUserResponse = await oauth2.userinfo.get();
      const googleUser = googleUserResponse.data;

      const linkedUserId = resolveLinkedUserId(req, "google");

      const user = await userService.createOrUpdateGoogleUser({
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name
      }, {
        linkedUserId
      });

      await userService.saveTokens(user.id, tokens);

      // Fire and forget the initial fetch to prevent the redirect from hanging
      gmailService.fetchEmailsFromGmail(
        user.id,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date
      ).catch(err => console.error("[OAuth Background Fetch Error]", err));

      // Best effort: start watch automatically after OAuth completes.
      let watchStatus = { started: false, error: null };
      try {
        const configuredTopic = process.env.GMAIL_PUBSUB_TOPIC;
        const resolvedTopic = gmailService.resolveTopicName(configuredTopic);

        if (resolvedTopic) {
          const { gmail } = await gmailService.getGmailClientForUser(user.id);
          await gmail.users.watch({
            userId: "me",
            requestBody: {
              topicName: resolvedTopic,
              labelIds: ["INBOX"],
              labelFilterAction: "include"
            }
          });
          watchStatus.started = true;
        } else {
          watchStatus.error = "GMAIL_PUBSUB_TOPIC is missing or invalid";
        }
      } catch (watchError) {
        watchStatus.error = watchError.message || "Failed to start Gmail watch";
      }

      const jwtToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      setTokenCookie(res, jwtToken);

      if (!requestWantsJson(req)) {
        return res.redirect(buildFrontendUrl("/auth/google/callback", {
          userId: user.id,
          oauth: "success"
        }));
      }

      return res.json({
        message: "Login successful",
        token: jwtToken,
        userId: user.id,
        emailsFetched: "Syncing in background",
        unreadSync: "Syncing in background",
        prioritySync: "Syncing in background",
        watch: watchStatus
      });
    } catch (error) {
      if (!requestWantsJson(req)) {
        return res.redirect(buildFrontendUrl("/auth/google/callback", {
          error: error.message || "OAuth login failed"
        }));
      }
      return res.status(500).json({
        error: error.message || "OAuth login failed"
      });
    }
  },

  async getNewMails(req, res) {
    let user;
    try {
      const { userId } = req.params;
      user = await userService.getUserById(userId);

      if (!user.encrypted_access_token) {
        return res.status(401).json({
          error: "User not authenticated"
        });
      }

      const { accessToken, refreshToken } = userService.decryptTokens(user);
      const fetchResult = await gmailService.fetchEmailsFromGmail(
        user.id,
        accessToken,
        refreshToken,
        user.token_expiry
      );

      return res.json({
        message: "Emails fetched successfully",
        count: fetchResult.newEmails.length,
        emails: fetchResult.newEmails,
        unreadSync: fetchResult.unreadSync,
        prioritySync: fetchResult.prioritySync
      });
    } catch (error) {
      if (error.message && error.message.includes("insufficient authentication scopes")) {
        // Drop the invalid credentials from the database to break the soft-lock
        await user.update({ 
          encrypted_access_token: null, 
          encrypted_refresh_token: null, 
          token_expiry: null 
        });

        return res.status(403).json({
          error: "Permission denied: You must grant Gmail read access during the Google login. Please reconnect your account."
        });
      }
      console.error("[getNewMails] Server Error:", error.message, error.stack);
      return res.status(500).json({
        error: error.message
      });
    }
  },

  async startWatch(req, res) {
    try {
      const { userId } = req.params;
      const { topicName, labelIds } = req.body || {};
      const configuredTopic = topicName || process.env.GMAIL_PUBSUB_TOPIC;
      const resolvedTopic = gmailService.resolveTopicName(configuredTopic);

      if (!resolvedTopic) {
        return res.status(400).json({
          error: "Invalid topic name format. Use 'projects/<project-id>/topics/<topic-id>' or set GCP_PROJECT_ID with topic id.",
          received: {
            topicNameFromBody: topicName || null,
            topicFromEnv: process.env.GMAIL_PUBSUB_TOPIC || null,
            projectIdFromEnv: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || null
          }
        });
      }

      const { gmail } = await gmailService.getGmailClientForUser(userId);

      const watchResponse = await gmail.users.watch({
        userId: "me",
        requestBody: {
          topicName: resolvedTopic,
          labelIds: Array.isArray(labelIds) && labelIds.length ? labelIds : ["INBOX"],
          labelFilterAction: "include"
        }
      });

      return res.json({
        message: "Gmail watch started",
        data: watchResponse.data
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "Failed to start Gmail watch"
      });
    }
  },

  async stopWatch(req, res) {
    try {
      const { userId } = req.params;
      const { gmail } = await gmailService.getGmailClientForUser(userId);

      await gmail.users.stop({ userId: "me" });

      return res.json({
        message: "Gmail watch stopped"
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "Failed to stop Gmail watch"
      });
    }
  },

  async pubsubWebhook(req, res) {
    try {
      const envelope = req.body;

      if (!envelope || !envelope.message || !envelope.message.data) {
        return res.status(200).json({
          message: "No Pub/Sub message data"
        });
      }

      const decoded = Buffer.from(envelope.message.data, "base64").toString("utf8");
      const notification = JSON.parse(decoded);
      const emailAddress = notification.emailAddress;

      if (!emailAddress) {
        return res.status(200).json({
          message: "Notification missing emailAddress"
        });
      }

      const user = await userService.getUserByEmailAddress(emailAddress);

      if (!user.encrypted_access_token) {
        return res.status(200).json({
          message: "User has no valid token",
          emailAddress
        });
      }

      const { accessToken, refreshToken } = userService.decryptTokens(user);
      const fetchResult = await gmailService.fetchEmailsFromGmail(
        user.id,
        accessToken,
        refreshToken,
        user.token_expiry
      );

      return res.status(200).json({
        message: "Notification processed",
        emailAddress,
        newEmails: fetchResult.newEmails.length,
        unreadSync: fetchResult.unreadSync,
        prioritySync: fetchResult.prioritySync,
        historyId: notification.historyId || null
      });
    } catch (error) {
      return res.status(200).json({
        message: "Notification received with processing error",
        error: error.message
      });
    }
  },

  async fetchEmailsFromGmail(userId, accessToken, refreshToken, tokenExpiry) {
    const oauth2Client = gmailService.createOAuthClient(
      accessToken,
      refreshToken,
      tokenExpiry
    );

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client
    });

    const recentDays = getGmailRecentDays();
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: `in:inbox is:unread newer_than:${recentDays}d`
    });

    const messages = listResponse.data.messages || [];
    const savedEmails = [];
    const emailsToAnalyze = [];

    async function syncLabelsForEmail(emailRecord, labelIds) {
      const uniqueLabels = [...new Set((labelIds || []).filter(Boolean))];
      const labelRecords = [];

      for (const labelName of uniqueLabels) {
        const [label] = await Label.findOrCreate({ where: { name: labelName } });
        labelRecords.push(label);
      }

      await emailRecord.setLabels(labelRecords);
    }

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "metadata"
      });

      const payload = msg.data.payload || {};
      const headers = payload.headers || [];

      const subject = headers.find((h) => h.name === "Subject")?.value || "";
      const from = headers.find((h) => h.name === "From")?.value || "";
      const date = headers.find((h) => h.name === "Date")?.value || "";
      const snippet = msg.data.snippet || "";
      const labels = msg.data.labelIds || [];

      const fromMatch = from.match(/^(.*?)\s*<(.+?)>$|^(.+?)$/);
      const senderName = fromMatch ? (fromMatch[1] || fromMatch[3] || "") : "";
      const senderEmail = fromMatch ? (fromMatch[2] || fromMatch[3] || "") : "";

      const exists = await Email.findOne({
        where: {
          user_id: userId,
          provider: "gmail",
          mail_msg_id: message.id
        }
      });

      if (exists) {
        await exists.update({
          provider: "gmail",
          mail_thread_id: msg.data.threadId,
          subject,
          snippet,
          sender_email: senderEmail,
          sender_name: senderName,
          received_at: date ? new Date(date) : null,
          is_read: !labels.includes("UNREAD"),
          mail_link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`
        });

        await syncLabelsForEmail(exists, labels);

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
        provider: "gmail",
        mail_msg_id: message.id,
        mail_thread_id: msg.data.threadId,
        subject,
        snippet,
        sender_email: senderEmail,
        sender_name: senderName,
        received_at: date ? new Date(date) : null,
        is_read: !labels.includes("UNREAD"),
        mail_link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`
      });

      await syncLabelsForEmail(email, labels);

      savedEmails.push(email);
      emailsToAnalyze.push(email);
    }

    const unreadSync = await gmailService.syncUnreadStatuses(userId, gmail);

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
      } catch (error) {
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

    // Return the enriched emails as well
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

  async syncUnreadStatuses(userId, gmailClient) {
    const unreadEmails = await Email.findAll({
      where: {
        user_id: userId,
        provider: "gmail",
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
        const gmailMessage = await gmailClient.users.messages.get({
          userId: "me",
          id: email.mail_msg_id,
          format: "metadata"
        });

        const labels = gmailMessage.data.labelIds || [];
        const isReadNow = !labels.includes("UNREAD");

        if (isReadNow) {
          await email.update({ is_read: true });
          markedRead++;
        } else {
          stillUnread++;
        }
      } catch (error) {
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
      const { page = 1, limit = 20 } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const emails = await Email.findAndCountAll({
        where: { user_id: userId,
          provider: "gmail"

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
      const email = await Email.findByPk(emailId);

      if (!email) {
        return res.status(404).json({
          error: "Email not found"
        });
      }

      return res.json(email);
    } catch (error) {
      return res.status(500).json({
        error: "Failed to fetch email"
      });
    }
  },

  async getUnread(req, res) {
    try {
      const { userId } = req.params;

      const emails = await Email.findAll({
        where: {
          user_id: userId,
          is_read: false
        }
      });

      return res.json(emails);
    } catch (error) {
      return res.status(500).json({
        error: "Failed to fetch unread emails"
      });
    }
  },

  async search(req, res) {
    try {
      const { userId } = req.params;
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          error: "Search query required"
        });
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
    } catch (error) {
      return res.status(500).json({
        error: "Search failed"
      });
    }
  },

  async getEmailBody(userId, emailRecord) {
    const user = await userService.getUserById(userId);
    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    try {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: emailRecord.mail_msg_id,
        format: "full"
      });
      
      const payload = msg.data.payload;
      
      function getBody(part) {
          if (!part) return { content: "", isHtml: false };
          if (part.mimeType === "text/html" && part.body && part.body.data) {
              return { 
                  content: Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'), 
                  isHtml: true 
              };
          }
          if (part.mimeType === "text/plain" && part.body && part.body.data) {
              return { 
                  content: Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'), 
                  isHtml: false 
              };
          }
          let fallbackResult = { content: "", isHtml: false };
          if (part.parts) {
              for (const subPart of part.parts) {
                  const subResult = getBody(subPart);
                  if (subResult.content) {
                      if (subResult.isHtml) return subResult; // Prefer HTML
                      fallbackResult = subResult;
                  }
              }
          }
          return fallbackResult;
      }
      
      const bodyInfo = getBody(payload);
      if (bodyInfo.content) {
          return bodyInfo;
      }
      return { content: emailRecord.snippet || "No additional content found.", isHtml: false };
    } catch (err) {
      console.error("Failed to fetch full Gmail body:", err.message);
      return { content: emailRecord.snippet || "Failed to load original message.", isHtml: false };
    }
  },

  async sendReply(userId, email, textBody) {
    const user = await userService.getUserById(userId);
    if (!user || (!user.encrypted_access_token && !user.encrypted_refresh_token)) {
      throw new Error("Google access token not found. Please log in.");
    }

    const { accessToken: at, refreshToken: rt } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(at, rt, user.token_expiry);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const to = email.sender_email;
    const subjectContent = email.subject.toLowerCase().startsWith("re:") 
        ? email.subject 
        : `Re: ${email.subject}`;

    let rfc2822 = [
      `To: ${to}`,
      `Subject: ${subjectContent}`
    ];

    if (email.mail_thread_id) {
       rfc2822.push(`In-Reply-To: ${email.mail_msg_id}`);
       rfc2822.push(`References: ${email.mail_msg_id}`);
    }

    rfc2822.push("Content-Type: text/plain; charset=utf-8", "MIME-Version: 1.0", "", textBody);

    const messageBuffer = Buffer.from(rfc2822.join("\r\n"), "utf-8");
    const base64EncodedEmail = messageBuffer.toString("base64url");

    let threadIdParam = email.mail_thread_id && email.mail_thread_id.length > 5 ? email.mail_thread_id : undefined;

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64EncodedEmail,
        threadId: threadIdParam
      }
    });

    return response.data;
  },

  async createTask(userId, taskDetails) {
    const user = await userService.getUserById(userId);
    if (!user || (!user.encrypted_access_token && !user.encrypted_refresh_token)) {
      throw new Error("Google access token not found. Please log in.");
    }

    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    const tasks = google.tasks({ version: "v1", auth: oauth2Client });

    const taskBody = {
      title: taskDetails.title,
      notes: taskDetails.description
    };

    if (taskDetails.dueDate) {
      taskBody.due = new Date(taskDetails.dueDate).toISOString();
    }

    const response = await tasks.tasks.insert({
      tasklist: "@default",
      requestBody: taskBody
    });

    return response.data;
  },

  async createEvent(userId, eventDetails) {
    const user = await userService.getUserById(userId);
    if (!user || (!user.encrypted_access_token && !user.encrypted_refresh_token)) {
      throw new Error("Google access token not found. Please log in.");
    }

    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const eventBody = {
      summary: eventDetails.title,
      location: eventDetails.location,
      description: eventDetails.description,
      start: {
        dateTime: new Date(eventDetails.startTime).toISOString()
      },
      end: {
        dateTime: new Date(eventDetails.endTime).toISOString()
      }
    };

    // Add attendees if they look like emails
    if (eventDetails.attendees && Array.isArray(eventDetails.attendees)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validAttendees = eventDetails.attendees
        .filter(a => emailRegex.test(a))
        .map(email => ({ email }));
      
      if (validAttendees.length > 0) {
        eventBody.attendees = validAttendees;
      }
      
      // Append names that aren't emails to the description
      const namesOnly = eventDetails.attendees.filter(a => !emailRegex.test(a));
      if (namesOnly.length > 0) {
        eventBody.description += `\n\nAttendees: ${namesOnly.join(", ")}`;
      }
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventBody
    });

    return response.data;
  },

  async fetchTasksAndEvents(userId) {
    const user = await userService.getUserById(userId);
    if (!user || (!user.encrypted_access_token && !user.encrypted_refresh_token)) {
      return { tasks: [], events: [] };
    }

    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    
    // Fetch upcoming events from primary calendar
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const events = [];
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(); // 1 month ago
      const calRes = await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin,
        maxResults: 50,
        singleEvents: true,
        orderBy: "startTime"
      });
      
      if (calRes.data && calRes.data.items) {
        calRes.data.items.forEach(ev => {
          events.push({
            id: ev.id,
            providerId: ev.id,
            type: "event",
            source: "gmail",
            title: ev.summary || "Untitled Event",
            description: ev.description || "",
            time: ev.start.dateTime || ev.start.date,
            endTime: ev.end.dateTime || ev.end.date,
            htmlLink: ev.htmlLink
          });
        });
      }
    } catch (e) {
       console.error("[gmailService] Error fetching calendar events:", e.message);
    }

    // Fetch tasks from default task list
    const tasks = google.tasks({ version: "v1", auth: oauth2Client });
    const taskItems = [];
    try {
      const taskRes = await tasks.tasks.list({
        tasklist: "@default",
        maxResults: 50,
        showCompleted: true,
        showHidden: false
      });
      
      if (taskRes.data && taskRes.data.items) {
        taskRes.data.items.forEach(tk => {
          taskItems.push({
            id: tk.id,
            providerId: tk.id,
            type: "task",
            source: "gmail",
            title: tk.title || "Untitled Task",
            description: tk.notes || "",
            time: tk.due || null,
            status: tk.status,
            completed: tk.status === "completed"
          });
        });
      }
    } catch (e) {
      console.error("[gmailService] Error fetching tasks:", e.message);
    }
    
    return { tasks: taskItems, events };
  },

  async updateTask(userId, taskId, details) {
    const user = await userService.getUserById(userId);
    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    const tasks = google.tasks({ version: "v1", auth: oauth2Client });
    
    // First fetch existing task to patch
    const existing = await tasks.tasks.get({ tasklist: "@default", task: taskId });
    const taskBody = { ...existing.data };

    if (details.title !== undefined) taskBody.title = details.title;
    if (details.description !== undefined) taskBody.notes = details.description;
    if (details.dueDate !== undefined) taskBody.due = details.dueDate ? new Date(details.dueDate).toISOString() : null;
    if (details.completed !== undefined) {
       taskBody.status = details.completed ? 'completed' : 'needsAction';
    }

    const res = await tasks.tasks.update({
      tasklist: "@default",
      task: taskId,
      requestBody: taskBody
    });
    return res.data;
  },

  async deleteTask(userId, taskId) {
    const user = await userService.getUserById(userId);
    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    const tasks = google.tasks({ version: "v1", auth: oauth2Client });
    await tasks.tasks.delete({ tasklist: "@default", task: taskId });
    return true;
  },

  async updateEvent(userId, eventId, details) {
    const user = await userService.getUserById(userId);
    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    
    const existing = await calendar.events.get({ calendarId: "primary", eventId });
    const eventBody = { ...existing.data };

    if (details.title !== undefined) eventBody.summary = details.title;
    if (details.description !== undefined) eventBody.description = details.description;
    if (details.startTime) eventBody.start = { dateTime: new Date(details.startTime).toISOString() };
    if (details.endTime) eventBody.end = { dateTime: new Date(details.endTime).toISOString() };

    const res = await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: eventBody
    });
    return res.data;
  },

  async deleteEvent(userId, eventId) {
    const user = await userService.getUserById(userId);
    const { accessToken, refreshToken } = userService.decryptTokens(user);
    const oauth2Client = gmailService.createOAuthClient(accessToken, refreshToken, user.token_expiry);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    await calendar.events.delete({ calendarId: "primary", eventId });
    return true;
  }
};

gmailService.fetchByUser = gmailService.getNewMails;
gmailService.getEmails = gmailService.getMails;

module.exports = gmailService;
