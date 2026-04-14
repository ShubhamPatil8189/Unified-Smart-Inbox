/**
 * Unified Email Service
 * Handles common email operations for all providers (Gmail, Outlook, etc.)
 * OAuth flows remain in provider-specific services (gmailservice, outlookservice)
 */

const { Email, EmailPriority, EmailAction } = require("../models");
const { Op, Sequelize } = require("sequelize");
const priorityService = require("./priorityservice");

function normalizeRecentDays(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 14;
    return Math.min(Math.floor(parsed), 90);
}

function normalizeLimit(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 20;
    return Math.min(Math.floor(parsed), 100);
}

function normalizeProvider(value) {
    const provider = String(value || "").trim().toLowerCase();
    if (provider === "gmail" || provider === "outlook") {
        return provider;
    }
    return null;
}

const emailService = {
    /**
     * Get all emails for a user with optional filtering
     */
    async getUserEmails(req, res) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 20, provider } = req.query;
            const pageNum = Math.max(1, Number(page));
            const limitNum = normalizeLimit(limit);
            const offset = (pageNum - 1) * limitNum;

            if (String(userId) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden: you can only access your own emails." });
            }

            const whereClause = { user_id: userId };
            if (normalizeProvider(provider)) {
                whereClause.provider = normalizeProvider(provider);
            }

            const { count, rows } = await Email.findAndCountAll({
                where: whereClause,
                include: [
                    { model: EmailPriority, required: false },
                    { model: EmailAction, required: false }
                ],
                order: [["received_at", "DESC"]],
                offset,
                limit: limitNum
            });

            return res.json({
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil(count / limitNum),
                emails: rows.map((e) => emailService.formatEmailResponse(e))
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get single email by ID
     */
    async getEmailById(req, res) {
        try {
            const { emailId } = req.params;
            const email = await Email.findByPk(emailId, {
                include: [
                    { model: EmailPriority, required: false },
                    { model: EmailAction, required: false }
                ]
            });

            if (!email) {
                return res.status(404).json({ error: "Email not found" });
            }

            if (String(email.user_id) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            return res.json(emailService.formatEmailResponse(email));
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get full email body from provider
     */
    async getFullEmailBody(req, res) {
        try {
            const { emailId } = req.params;
            const email = await Email.findByPk(emailId);
            if (!email) {
                return res.status(404).json({ error: "Email not found" });
            }
            if (String(email.user_id) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            let bodyContent = "";
            let isHtml = false;
            if (email.provider === "outlook") {
                const outlookService = require("./outlookservice");
                const bodyInfo = await outlookService.getEmailBody(req.userId, email);
                bodyContent = bodyInfo.content;
                isHtml = bodyInfo.isHtml;
            } else {
                const gmailService = require("./gmailservice");
                const bodyInfo = await gmailService.getEmailBody(req.userId, email);
                bodyContent = bodyInfo.content;
                isHtml = bodyInfo.isHtml;
            }

            return res.json({ body: bodyContent, isHtml });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get unread emails for a user
     */
    async getUnreadEmails(req, res) {
        try {
            const { userId } = req.params;
            const { provider } = req.query;

            if (String(userId) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const whereClause = { user_id: userId, is_read: false };
            if (normalizeProvider(provider)) {
                whereClause.provider = normalizeProvider(provider);
            }

            const emails = await Email.findAll({
                where: whereClause,
                include: [{ model: EmailPriority, required: false }],
                order: [["received_at", "DESC"]],
                limit: 50
            });

            return res.json({
                total: emails.length,
                emails: emails.map((e) => emailService.formatEmailResponse(e))
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Search emails
     */
    async searchEmails(req, res) {
        try {
            const { userId } = req.params;
            const query = String(req.query?.q || "").trim();
            const { days = 14, limit = 20, provider } = req.query;

            if (!query) {
                return res.status(400).json({ error: "Search query required" });
            }

            if (String(userId) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const recentDays = normalizeRecentDays(days);
            const limitNum = normalizeLimit(limit);
            const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);

            const whereClause = {
                user_id: userId,
                received_at: { [Op.gte]: since },
                [Op.or]: [
                    { subject: { [Op.like]: `%${query}%` } },
                    { snippet: { [Op.like]: `%${query}%` } },
                    { sender_email: { [Op.like]: `%${query}%` } }
                ]
            };

            if (normalizeProvider(provider)) {
                whereClause.provider = normalizeProvider(provider);
            }

            const emails = await Email.findAll({
                where: whereClause,
                include: [
                    { model: EmailPriority, required: false },
                    { model: EmailAction, required: false }
                ],
                order: [["received_at", "DESC"]],
                limit: limitNum
            });

            return res.json({
                query,
                total: emails.length,
                emails: emails.map((e) => emailService.formatEmailResponse(e))
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get recent emails with optional priority filtering
     */
    async getRecentEmails(req, res) {
        try {
            const { userId } = req.params;
            const { days = 14, limit = 20, provider, unreadOnly = false } = req.query;

            if (String(userId) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const recentDays = normalizeRecentDays(days);
            const limitNum = normalizeLimit(limit);
            const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);

            const whereClause = {
                user_id: userId,
                received_at: { [Op.gte]: since }
            };

            if (String(unreadOnly).toLowerCase() === "true") {
                whereClause.is_read = false;
            }

            if (normalizeProvider(provider)) {
                whereClause.provider = normalizeProvider(provider);
            }

            const emails = await Email.findAll({
                where: whereClause,
                include: [
                    { model: EmailPriority, required: false },
                    { model: EmailAction, required: false }
                ],
                order: [["received_at", "DESC"]],
                limit: limitNum
            });

            return res.json({
                total: emails.length,
                emails: emails.map((e) => emailService.formatEmailResponse(e))
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Format email response with priority data
     */
    formatEmailResponse(email) {
        return {
            id: email.id,
            provider: email.provider || "unknown",
            subject: email.subject,
            snippet: email.snippet,
            sender_email: email.sender_email,
            sender_name: email.sender_name,
            received_at: email.received_at,
            is_read: email.is_read,
            mail_link: email.mail_link,
            priority: email.EmailPriority ? {
                label: email.EmailPriority.priority_label,
                score: email.EmailPriority.priority_score,
                confidence: email.EmailPriority.confidence,
                reason: email.EmailPriority.reason,
                mode: email.EmailPriority.mode,
                processed_at: email.EmailPriority.processed_at
            } : null,
            action: email.EmailAction ? {
                type: email.EmailAction.type,
                title: email.EmailAction.title,
                status: email.EmailAction.status,
                due_date: email.EmailAction.due_date,
                start_time: email.EmailAction.start_time,
                end_time: email.EmailAction.end_time,
                external_id: email.EmailAction.external_id
            } : null
        };
    },

    /**
     * Mark email as read/unread
     */
    async markEmailAsRead(req, res) {
        try {
            const { emailId } = req.params;
            const { isRead = true } = req.body;

            const email = await Email.findByPk(emailId);
            if (!email) {
                return res.status(404).json({ error: "Email not found" });
            }

            if (String(email.user_id) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await email.update({ is_read: isRead });
            return res.json({ message: "Email updated", email: emailService.formatEmailResponse(email) });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Delete email
     */
    async deleteEmail(req, res) {
        try {
            const { emailId } = req.params;
            const email = await Email.findByPk(emailId);

            if (!email) {
                return res.status(404).json({ error: "Email not found" });
            }

            if (String(email.user_id) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const response = emailService.formatEmailResponse(email);
            await email.destroy();
            return res.json({ message: "Email deleted", email: response });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Send email reply
     */
    async sendEmail(req, res) {
        try {
            const { emailId, message } = req.body;
            if (!emailId || !message) {
                return res.status(400).json({ error: "emailId and message are required" });
            }

            const email = await Email.findByPk(emailId);
            if (!email) {
                return res.status(404).json({ error: "Email not found" });
            }

            if (String(email.user_id) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // Defer sending logic to the designated provider's module
            if (email.provider === "outlook") {
                const outlookService = require("./outlookservice");
                await outlookService.sendReply(req.userId, email, message);
            } else {
                // Default to gmail
                const gmailService = require("./gmailservice");
                await gmailService.sendReply(req.userId, email, message);
            }

            return res.json({ message: "Reply sent successfully" });
        } catch (error) {
            return res.status(500).json({ error: error.message || "Failed to send reply" });
        }
    },

    /**
     * Generate AI draft reply for an email using OpenRouter
     */
    async generateDraftReply(req, res) {
        try {
            const { emailId } = req.body;
            const tone = req.body.tone || "professional";

            if (!emailId) {
                return res.status(400).json({ error: "emailId is required" });
            }

            const email = await Email.findByPk(emailId);
            if (!email) {
                return res.status(404).json({ error: "Email not found" });
            }

            if (String(email.user_id) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || "").trim();
            const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

            if (!OPENROUTER_API_KEY) {
                return res.status(503).json({ error: "AI service not configured. Set OPENROUTER_API_KEY in .env." });
            }

            const subject = String(email.subject || "").trim();
            const sender = String(email.sender_name || email.sender_email || "").trim();
            const snippet = String(email.snippet || "").trim().slice(0, 1500);

            const systemPrompt = `You are a professional email reply assistant. Generate a helpful, contextual reply to the email below.

Rules:
- Write ONLY the reply body text. Do NOT include "Subject:", "To:", greeting headers, or email metadata.
- Start directly with a greeting like "Hi [Name]," or "Hello," then the body.
- Keep it concise (2-4 sentences unless the context demands more).
- Match the tone: "${tone}" (professional, friendly, or formal).
- Be specific to the email content — don't be generic.
- End with an appropriate sign-off like "Best regards," or "Thanks," but do NOT add a name/signature after it.
- Output plain text only — no markdown, no HTML, no bullet points.`;

            const userPrompt = `EMAIL TO REPLY TO:
From: ${sender}
Subject: ${subject}
Content: ${snippet}

Generate a ${tone} reply:`;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "SmartInbox"
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 512
                })
            });

            if (!response.ok) {
                let errorDetail = "";
                try {
                    const errJson = await response.json();
                    errorDetail = errJson.error?.message || JSON.stringify(errJson).slice(0, 200);
                } catch {
                    errorDetail = `HTTP ${response.status}`;
                }
                return res.status(502).json({ error: `AI service error: ${errorDetail}` });
            }

            const data = await response.json();
            const draft = String(data?.choices?.[0]?.message?.content || "").trim();

            if (!draft) {
                return res.status(502).json({ error: "AI returned empty response" });
            }

            return res.json({
                draft,
                model: OPENROUTER_MODEL,
                tone
            });
        } catch (error) {
            console.error("Draft reply error:", error);
            return res.status(500).json({ error: error.message || "Failed to generate draft" });
        }
    }
};

module.exports = emailService;

