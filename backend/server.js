require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./models");
const { DataTypes } = require("sequelize");

const app = express();

const { PORT, CORS_ORIGINS, buildFrontendUrl, requestWantsJson } = require("./utils/envConfig");

async function ensureDatabaseCompatibility() {
  const queryInterface = sequelize.getQueryInterface();

  async function safeDescribeTable(tableName) {
    try {
      return await queryInterface.describeTable(tableName);
    } catch (err) {
      return null;
    }
  }

  async function renameColumnIfNeeded(tableName, from, to) {
    const table = await safeDescribeTable(tableName);
    if (!table || table[to] || !table[from]) {
      return;
    }
    await queryInterface.renameColumn(tableName, from, to);
  }

  async function addColumnIfMissing(tableName, columnName, definition) {
    const table = await safeDescribeTable(tableName);
    if (!table || table[columnName]) {
      return;
    }
    await queryInterface.addColumn(tableName, columnName, definition);
  }

  async function removeColumnIfExists(tableName, columnName) {
    const table = await safeDescribeTable(tableName);
    if (!table || !table[columnName]) {
      return;
    }
    await queryInterface.removeColumn(tableName, columnName);
  }

  await addColumnIfMissing("users", "outlook_id", {
    type: DataTypes.STRING,
    allowNull: true
  });

  await addColumnIfMissing("users", "outlook_email", {
    type: DataTypes.STRING,
    allowNull: true
  });

  await addColumnIfMissing("users", "encrypted_outlook_access_token", {
    type: DataTypes.TEXT,
    allowNull: true
  });
  await addColumnIfMissing("users", "encrypted_outlook_refresh_token", {
    type: DataTypes.TEXT,
    allowNull: true
  });
  await addColumnIfMissing("users", "outlook_token_expiry", {
    type: DataTypes.DATE,
    allowNull: true
  });

  await renameColumnIfNeeded("emails", "gmail_message_id", "mail_msg_id");
  await renameColumnIfNeeded("emails", "gmail_thread_id", "mail_thread_id");
  await renameColumnIfNeeded("emails", "gmail_link", "mail_link");

  await removeColumnIfExists("emails", "body");
  await removeColumnIfExists("emails", "body_plain");
  await removeColumnIfExists("emails", "body_html");

  await addColumnIfMissing("emails", "provider", {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "gmail"
  });

  try {
    const usersTable = await safeDescribeTable("users");
    if (usersTable) {
      await sequelize.query("UPDATE users SET outlook_email = email WHERE outlook_id IS NOT NULL AND (outlook_email IS NULL OR outlook_email = '')");
    }
    const emailsTable = await safeDescribeTable("emails");
    if (emailsTable) {
      await sequelize.query("UPDATE emails SET provider = 'gmail' WHERE provider IS NULL");
    }
  } catch (err) {
    console.warn("Could not execute data migration queries:", err.message);
  }
}

// CORS for browser clients using cookie-based auth from the frontend.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (Postman/curl) with no Origin header.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = String(origin).trim().replace(/\/$/, "");
      
      if (CORS_ORIGINS.some(o => o.replace(/\/$/, "") === normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Request rejected. Origin: "${origin}" is not in allowed list.`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    optionsSuccessStatus: 204,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[request] ${req.method} ${req.path} (full: ${req.originalUrl})`);
  next();
});

const gmailRoutes = require("./routes/gmailroute");
const outlookRoutes = require("./routes/outlookroute");
const emailRoutes = require("./routes/emailroute");
const outlookService = require("./services/outlookservice");
const mailCleanupService = require("./services/mailcleanupservice");
const priorityRoutes = require("./routes/priorityroute");
const processingRoutes = require("./routes/processingroute");
const summaryRoutes = require("./routes/summaryroute");
const taskRoutes = require("./routes/taskroute");
const userRoutes = require("./routes/userroute");
const authRoutes = require("./routes/authroute");
const notificationRoutes = require("./routes/notificationroute");
const priorityRuleRoutes = require("./routes/priorityruleroute");

// Backward-compatible alias for older clients still calling /google/login.
app.get("/google/login", (req, res) => {
  return res.redirect("/gmail/login");
});

// Outlook OAuth callback endpoint used by Microsoft redirect_uri.
app.get("/auth/outlook/callback", outlookService.oauthCallback);

// Mount OAuth callback directly at /login/oauth2/code/google (as per .env REDIRECT_URI)
app.use("/login/oauth2/code", (req, res, next) => {
  console.log(`[OAuth Callback Request] ${req.method} ${req.originalUrl}`);
  next();
}, gmailRoutes);
app.use("/login/oauth2/code", outlookRoutes);

// Mount other Gmail routes
app.use("/gmail", gmailRoutes);
app.use("/outlook", outlookRoutes);
app.use("/email", emailRoutes);
app.use("/priority", priorityRoutes);
app.use("/processing", processingRoutes);
app.use("/summary", summaryRoutes);
app.use("/task", taskRoutes);
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/notifications", notificationRoutes);
app.use("/rules", priorityRuleRoutes);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed by CORS." });
  }

  return next(err);
});

// PORT is now handled by envConfig

async function bootstrap() {
  await ensureDatabaseCompatibility();
  await sequelize.sync();
  console.log("Database connected");

  mailCleanupService.startAutoCleanup();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
