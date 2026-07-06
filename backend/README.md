# InBox_IQ Express Backend

This directory houses the Node.js / Express backend service for **InBox_IQ (Unified Smart Inbox)**.

## 🚀 How to get started

Check out the main root [README.md](../README.md) for full project architecture, environment variable configurations, database setup, and detailed API specs.

### What is in here?
- **Sequelize ORM & MySQL**: Manages database sync, users, emails, priority scores, and task tracking records.
- **Provider Integrations**: Handles token exchanging and fetching for Google Gmail and Microsoft Outlook Graph APIs.
- **OpenRouter LLM Interface**: Connects to OpenRouter (using `xiaomi/mimo-v2-pro` and other fallback models) to calculate priorities, extract action items, and draft email replies.
- **Real-Time Streaming**: Emits live updates using Server-Sent Events (SSE) so the frontend immediately catches changes without polling.

### Fast commands
Install dependencies and run:
```bash
npm install
node server.js
```