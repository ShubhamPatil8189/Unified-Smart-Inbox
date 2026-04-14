const { Email } = require("../models");
const processingService = require("./processingservice");

// ========== CONFIG ==========
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || "").trim();
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "xiaomi/mimo-v2-pro";

// In-memory cache for summaries (per-process, resets on restart)
const summaryCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanText(value, maxLength = 2000) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

const SUMMARY_SYSTEM_PROMPT = `You are an email summarizer. Your task is to produce a concise, informative summary of the email content in exactly 1-2 sentences.

Rules:
- Output ONLY the summary text — no labels, no prefixes like "Summary:", no quotes, no markdown.
- The summary must capture the key intent/action/info of the email.
- Keep it under 180 characters.
- Use professional, clear language.
- If the email is very short already, rephrase it more concisely.`;

function buildSummaryPrompt(subject, snippet, sender) {
    return `${SUMMARY_SYSTEM_PROMPT}

EMAIL:
From: ${cleanText(sender, 200)}
Subject: ${cleanText(subject, 300)}
Content: ${cleanText(snippet, 1500)}`;
}

async function generateSummaryViaOpenRouter(subject, snippet, sender) {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API key is missing. Set OPENROUTER_API_KEY in .env.");
    }

    const prompt = buildSummaryPrompt(subject, snippet, sender);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "InBoxIQ"
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [{
                role: "user",
                content: prompt
            }],
            temperature: 0.3,
            max_tokens: 120
        })
    });

    if (!response.ok) {
        let details = "";
        try {
            const json = await response.json();
            details = json.error?.message || JSON.stringify(json).slice(0, 200);
        } catch {
            try {
                details = String(await response.text() || "").trim().slice(0, 200);
            } catch {
                details = "";
            }
        }
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`);
    }

    const data = await response.json();
    const raw = String(data?.choices?.[0]?.message?.content || "").trim();

    if (!raw) {
        throw new Error("Empty summary response from OpenRouter.");
    }

    // Clean up any unwanted prefixes the model might add
    return raw
        .replace(/^["']|["']$/g, "")
        .replace(/^(Summary:\s*)/i, "")
        .trim();
}

/**
 * Simple extractive fallback summary when AI is unavailable.
 * Takes the first 1-2 sentences of the snippet.
 */
function buildFallbackSummary(snippet) {
    const text = cleanText(snippet, 500);
    if (!text) return "No content available to summarize.";

    // Split on sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
        const summary = sentences.slice(0, 2).join(" ").trim();
        return summary.length > 180 ? summary.slice(0, 177) + "…" : summary;
    }

    // No sentence boundaries found — truncate
    return text.length > 180 ? text.slice(0, 177) + "…" : text;
}

const summaryService = {

    async summarizeEmailRoute(req, res) {
        try {
            const { emailId } = req.params;
            const email = await processingService.resolveEmailById(emailId);

            if (!email) {
                return res.status(404).json({ error: "Email not found" });
            }

            if (String(email.user_id) !== String(req.userId)) {
                return res.status(403).json({ error: "Forbidden: you can only summarize your own emails." });
            }

            // Check cache first
            const cacheKey = `summary_${email.id}`;
            const cached = summaryCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
                return res.json({
                    emailId: email.id,
                    summary: cached.summary,
                    source: "cache"
                });
            }

            let summary;
            let source = "ai";

            try {
                summary = await generateSummaryViaOpenRouter(
                    email.subject,
                    email.snippet,
                    email.sender_email
                );
            } catch (aiError) {
                console.warn(`[SummaryService] AI summarization failed for email ${email.id}:`, aiError.message);
                summary = buildFallbackSummary(email.snippet);
                source = "fallback";
            }

            // Cache the result
            summaryCache.set(cacheKey, {
                summary,
                timestamp: Date.now()
            });

            return res.json({
                emailId: email.id,
                summary,
                source
            });
        } catch (error) {
            console.error("[SummaryService] Error:", error.message);
            return res.status(500).json({ error: error.message });
        }
    },

    /**
     * Batch summarize multiple emails at once.
     * Accepts { emailIds: [1, 2, 3] } in request body.
     */
    async batchSummarizeRoute(req, res) {
        try {
            const emailIds = req.body?.emailIds;
            if (!Array.isArray(emailIds) || emailIds.length === 0) {
                return res.status(400).json({ error: "emailIds array is required." });
            }

            // Cap at 10 emails per batch to avoid timeouts
            const idsToProcess = emailIds.slice(0, 10);
            const results = {};

            for (const emailId of idsToProcess) {
                const email = await processingService.resolveEmailById(emailId);
                if (!email || String(email.user_id) !== String(req.userId)) {
                    results[emailId] = { summary: null, error: "Not found or forbidden" };
                    continue;
                }

                // Check cache
                const cacheKey = `summary_${email.id}`;
                const cached = summaryCache.get(cacheKey);
                if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
                    results[emailId] = { summary: cached.summary, source: "cache" };
                    continue;
                }

                try {
                    const summary = await generateSummaryViaOpenRouter(
                        email.subject,
                        email.snippet,
                        email.sender_email
                    );
                    summaryCache.set(cacheKey, { summary, timestamp: Date.now() });
                    results[emailId] = { summary, source: "ai" };
                } catch (aiError) {
                    const fallback = buildFallbackSummary(email.snippet);
                    summaryCache.set(cacheKey, { summary: fallback, timestamp: Date.now() });
                    results[emailId] = { summary: fallback, source: "fallback" };
                }
            }

            return res.json({ summaries: results });
        } catch (error) {
            console.error("[SummaryService] Batch error:", error.message);
            return res.status(500).json({ error: error.message });
        }
    }
};

module.exports = summaryService;
