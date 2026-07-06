# InBox_IQ React Frontend

This is the React Single-Page Application (SPA) frontend for **InBox_IQ (Unified Smart Inbox)**. It is built using **React 19**, **Vite**, and **Tailwind CSS**.

## 🚀 How to get started

Head over to the main root [README.md](../README.md) for full project architecture, local setup instructions, and database variables.

### What is in here?
- **Unified Dashboard**: View both your Gmail and Outlook emails in a single stream.
- **AI Categorization Highlights**: View the `URGENT`, `IMPORTANT`, `NORMAL`, or `LOW` priority tags along with brief explanations of why the AI selected them.
- **Calendar & Task Cards**: Manage the auto-extracted meetings, events, and task checklists.
- **Smart Reply Tonality**: Generate quick replies on-the-fly supporting professional, friendly, or formal tones.
- **SSE Stream Listener**: Listens to Server-Sent Events from the backend to update email listings and progress stats in real time.

### Commands
Run the dev server:
```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```
