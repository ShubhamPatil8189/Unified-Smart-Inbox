import React, { useState, useCallback } from "react";
import api from "../services/api";

const priorityStyles = {
  High: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Medium: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

// Threshold: only show summarize button if preview exceeds this character count
const LONG_EMAIL_THRESHOLD = 80;

function EmailCard({
  id,
  subject,
  sender,
  preview,
  priority = "Low",
  date,
  app,
  onReply,
  action,
}) {
  const badgeStyles = priorityStyles[priority] ?? priorityStyles.Low;
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const [originalBody, setOriginalBody] = useState(null);
  const [isHtml, setIsHtml] = useState(false);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [originalError, setOriginalError] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const [taskLoading, setTaskLoading] = useState(false);
  const [taskMessage, setTaskMessage] = useState(null);
  const [taskError, setTaskError] = useState(null);

  const isLongEmail = (preview || "").length > LONG_EMAIL_THRESHOLD;

  const handleSummarize = useCallback(async () => {
    if (summary) {
      setShowSummary((prev) => !prev);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const res = await api.post(`/summary/summarize/${id}`);
      setSummary(res.data.summary);
      setShowSummary(true);
    } catch (err) {
      console.error("Failed to summarize email:", err);
      setSummaryError("Could not generate summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [id, summary]);

  const handleViewOriginal = useCallback(async () => {
    if (originalBody !== null) {
      setShowOriginal((prev) => !prev);
      return;
    }

    setOriginalLoading(true);
    setOriginalError(null);

    try {
      const res = await api.get(`/email/${id}/full`);
      setOriginalBody(res.data.body || "No original content provided.");
      setIsHtml(res.data.isHtml || false);
      setShowOriginal(true);
    } catch (err) {
      console.error("Failed to fetch full email body:", err);
      setOriginalError("Could not load original message.");
    } finally {
      setOriginalLoading(false);
    }
  }, [id, originalBody]);

  const handleCreateTask = useCallback(async () => {
    setTaskLoading(true);
    setTaskMessage(null);
    setTaskError(null);
    try {
      const res = await api.post(`/task/${id}/auto-create`);
      if (res.data.success) {
         setTaskMessage(`Successfully created ${res.data.type}: ${res.data.details.title}`);
      } else {
         setTaskError(res.data.message || "Failed to create task.");
      }
    } catch (err) {
      setTaskError(err.response?.data?.error || "Error automatically creating task.");
    } finally {
      setTaskLoading(false);
      setTimeout(() => {
        setTaskMessage(null);
        setTaskError(null);
      }, 7000);
    }
  }, [id]);

  const handleReply = () => {
    if (onReply) {
      onReply();
    }
  };

  return (
    <article className="group relative rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-gray-900/40">
      {/* Priority Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles}`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {priority}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                {subject}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{sender}</p>
            </div>
            {date ? (
              <p className="whitespace-nowrap text-xs text-slate-400 dark:text-gray-500">{date}</p>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-slate-600 dark:text-gray-300 max-h-10 overflow-hidden">
            {preview}
          </p>

          {/* AI Detected Action Badge */}
          {action && (
            <div className="mt-4 flex flex-col gap-2">
              <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all shadow-sm ${
                action.status === 'CREATED' 
                  ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800' 
                  : 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800'
              }`}>
                <div className={`p-1.5 rounded-lg ${
                  action.status === 'CREATED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'
                }`}>
                  {action.type === 'EVENT' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      action.status === 'CREATED' ? 'text-emerald-600' : 'text-indigo-600'
                    }`}>
                      {action.type === 'EVENT' ? 'Event Detected' : 'Task Detected'}
                    </span>
                    {action.status === 'CREATED' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-medium">
                        Auto-Synced
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {action.title}
                  </h4>
                  {(action.due_date || action.start_time) && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1">
                        {action.type === 'EVENT' ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {new Date(action.start_time).toLocaleString()}
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Due: {new Date(action.due_date).toLocaleDateString()}
                          </>
                        )}
                      </p>
                      {action.location && (
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {action.location}
                        </p>
                      )}
                      {action.attendees && (
                         <p className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-1 italic">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                           {action.attendees}
                         </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Summary Section */}
          {showSummary && summary && (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm border transition-all duration-300 animate-in"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.06) 100%)",
                borderColor: "rgba(99,102,241,0.15)",
                animation: "summarySlideIn 0.3s ease-out",
              }}
            >
              <span className="flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a1 1 0 011 1v.586l1.293-1.293a1 1 0 111.414 1.414L12.414 5H13a7 7 0 11-7 7 1 1 0 112 0 5 5 0 105-5h-.586l-1.293 1.293a1 1 0 01-1.414-1.414L11 5.586V5a1 1 0 011-1h-1z" />
                  <path d="M5 10a1 1 0 011-1h3a1 1 0 010 2H6a1 1 0 01-1-1zm0 3a1 1 0 011-1h1a1 1 0 010 2H6a1 1 0 01-1-1z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                  AI Summary
                </span>
                <p className="mt-0.5 text-slate-700 dark:text-gray-200 leading-relaxed">
                  {summary}
                </p>
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                title="Hide summary"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          )}

          {summaryError && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">{summaryError}</p>
          )}

          {/* Full Original Email Section */}
          {showOriginal && originalBody && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-gray-200">Original Message</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-gray-900/50 rounded-lg max-h-96 overflow-y-auto w-full">
                {isHtml ? (
                   <iframe 
                     className="w-full min-h-[300px] border-0 rounded bg-white"
                     srcDoc={originalBody} 
                     title="Original Email View" 
                   />
                ) : (
                   <div className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-gray-300">{originalBody}</div>
                )}
              </div>
            </div>
          )}

          {originalError && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">{originalError}</p>
          )}

          {/* Task Notifications */}
          {taskMessage && (
            <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs rounded border border-emerald-100 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {taskMessage}
            </div>
          )}
          {taskError && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded border border-red-100 dark:border-red-900 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {taskError}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Source, Summarize, and Reply Button */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {app ? (
            <span className="text-xs font-medium text-slate-400 dark:text-gray-500">
              Source: {app}
            </span>
          ) : (
            <div />
          )}

          {/* Summarize Button — visible for long emails */}
          {isLongEmail && id && (
            <button
              id={`summarize-btn-${id}`}
              onClick={handleSummarize}
              disabled={summaryLoading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer ${
                summaryLoading
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400 cursor-wait"
                  : summary && showSummary
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  : "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 text-indigo-600 dark:text-indigo-400 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 border border-indigo-100 dark:border-indigo-800/30"
              }`}
              title={summary ? (showSummary ? "Hide summary" : "Show summary") : "Generate AI summary"}
            >
              {summaryLoading ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Summarizing…
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {summary ? (showSummary ? "Hide" : "Summary") : "Summarize"}
                </>
              )}
            </button>
          )}

          {/* View Original Button */}
          {id && (
            <button
              onClick={handleViewOriginal}
              disabled={originalLoading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer flex-shrink-0 ${
                originalLoading
                  ? "bg-slate-50 dark:bg-gray-800 text-slate-400 cursor-wait"
                  : originalBody && showOriginal
                  ? "bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-gray-600"
                  : "bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700 border border-transparent"
              }`}
              title={originalBody ? (showOriginal ? "Hide original" : "Show original") : "View original email"}
            >
              {originalLoading ? (
                 <>
                   <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                   </svg>
                 </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {originalBody ? (showOriginal ? "Hide body" : "View body") : "View body"}
                </>
              )}
            </button>
          )}
          
          {/* Create Task Button */}
          {id && (
            <button
              onClick={handleCreateTask}
              disabled={taskLoading}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer flex-shrink-0 ${
                taskLoading
                  ? "bg-slate-50 dark:bg-gray-800 text-slate-400 cursor-wait"
                  : taskMessage
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700"
              }`}
              title="Auto-extract into a Calendar Event or Task"
            >
              {taskLoading ? (
                 <>
                   <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                   </svg>
                 </>
              ) : taskMessage ? (
                 <>
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                   </svg>
                 </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Auto Task
                </>
              )}
            </button>
          )}
        </div>

        {/* Reply Button - Bottom Right, Hidden by default */}
        <button
          onClick={handleReply}
          className="opacity-0 translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 text-sm px-3 py-1 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Reply
        </button>
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes summarySlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
          }
        }
      `}</style>
    </article>
  );
}

export default EmailCard;
