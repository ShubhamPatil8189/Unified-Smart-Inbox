/**
 * Centralized Environment Configuration Utility
 * Consolidates all environment variables and provides helper functions
 * used across the backend.
 */

const normalizeEnv = (value) => {
  return String(value || "").trim().replace(/^['\"]|['\"]$/g, "");
};

// --- Frontend URLs ---
const FRONTEND_URL = normalizeEnv(process.env.FRONTEND_URL) || "http://localhost:5173";
const CORS_ORIGINS = [
  FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "").split(","),
  ...(process.env.CORS_ORIGINS || "").split(","),
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://unifiedbox.vercel.app"
].map(o => normalizeEnv(o)).filter(Boolean);

// --- Backend URLs (Self Reference) ---
// Used for OAuth redirects. Prioritizes explicit REDIRECT_URI, then constructs from BACKEND_URL or RENDER_EXTERNAL_URL.
const BACKEND_URL = normalizeEnv(process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL) || "http://localhost:8000";
const REDIRECT_URI = normalizeEnv(process.env.REDIRECT_URI) || `${BACKEND_URL}/login/oauth2/code/google`;
const OUTLOOK_REDIRECT_URI = normalizeEnv(process.env.OUTLOOK_REDIRECT_URI) || `${BACKEND_URL}/auth/outlook/callback`;

// --- Server Port ---
let derivedPort = 0;
try {
  if (REDIRECT_URI) {
    const parsed = new URL(REDIRECT_URI);
    derivedPort = Number(parsed.port) || 0;
  }
} catch {
  derivedPort = 0;
}
const PORT = derivedPort || Number(process.env.PORT) || 8000;

// --- Helper Functions ---
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

module.exports = {
  FRONTEND_URL,
  CORS_ORIGINS: [...new Set(CORS_ORIGINS)],
  REDIRECT_URI,
  OUTLOOK_REDIRECT_URI,
  PORT,
  buildFrontendUrl,
  requestWantsJson,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET,
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY
};

console.log(`[Config] Initialized Core Configuration:`);
console.log(`[Config] FRONTEND_URL: ${FRONTEND_URL}`);
console.log(`[Config] GOOGLE_REDIRECT_URI: ${REDIRECT_URI}`);
console.log(`[Config] OUTLOOK_REDIRECT_URI: ${OUTLOOK_REDIRECT_URI}`);
console.log(`[Config] PORT: ${PORT}`);
