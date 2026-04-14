import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import EmailCard from "../components/EmailCard";
import ReplyBox from "../components/ReplyBox";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const Dashboard = () => {
  const { user, gmailConnected, outlookConnected } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q");

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [toast, setToast] = useState(null);

  const [replyingEmailId, setReplyingEmailId] = useState(null);
  const [replies, setReplies] = useState({});
  const pollRef = useRef(null);

  // Fetch prioritized emails from DB
  const fetchEmails = useCallback(async () => {
    if (!user || (!gmailConnected && !outlookConnected)) {
      setLoading(false);
      return;
    }
    try {
      const endpoint = searchQuery 
        ? `/priority/user/${user.id}/search?q=${encodeURIComponent(searchQuery)}`
        : `/priority/user/${user.id}/emails`;
      const res = await api.get(endpoint);
      const mappedEmails = (res.data.emails || []).map((e) => {
        let uiPriority = "Low";
        if (e.priority) {
          if (e.priority.label === "URGENT" || e.priority.label === "IMPORTANT") uiPriority = "High";
          else if (e.priority.label === "NORMAL") uiPriority = "Medium";
        }

        return {
          id: e.id,
          subject: e.subject || "(No Subject)",
          sender: e.sender_email || "Unknown",
          app: e.provider === "outlook" ? "Outlook" : "Gmail",
          preview: e.snippet || "",
          priority: uiPriority,
          date: e.received_at ? new Date(e.received_at).toLocaleString() : "",
          action: e.action, // Pass the detected action
        };
      });
      setEmails(mappedEmails);
    } catch (error) {
      console.error("Failed to fetch priority emails", error);
    } finally {
      setLoading(false);
    }
  }, [user, gmailConnected, searchQuery]);

  // Pull new emails from APIs → DB, then refresh the list
  const syncNewEmails = useCallback(async (isManual = false) => {
    if (!user || (!gmailConnected && !outlookConnected)) return;
    if (isManual) setRefreshing(true);
    
    // Get smart notification setting (default to true as requested)
    const smartEnabled = localStorage.getItem("smartNotifications") !== "false";

    try {
      let totalNew = 0;
      let highPriorityEmails = [];

      if (gmailConnected) {
        const res = await api.get(`/gmail/fetch/${user.id}`);
        const fetched = res.data.emails || [];
        totalNew += fetched.length;
        highPriorityEmails.push(...fetched.filter(e => 
          e.priority?.label === "IMPORTANT" || e.priority?.label === "URGENT"
        ));
      }
      if (outlookConnected) {
        const res = await api.get(`/outlook/fetch/${user.id}`);
        const fetched = res.data.emails || [];
        totalNew += fetched.length;
        highPriorityEmails.push(...fetched.filter(e => 
          e.priority?.label === "IMPORTANT" || e.priority?.label === "URGENT"
        ));
      }

      // Always refresh the displayed list after sync
      await fetchEmails();

      if (totalNew > 0) {
        const highCount = highPriorityEmails.length;
        
        if (smartEnabled) {
          if (highCount > 0) {
            setToast(`🔥 ${highCount} new high-priority message${highCount > 1 ? "s" : ""}!`);
            setTimeout(() => setToast(null), 5000);
          } else if (isManual) {
            setToast(`Inbox up to date (no new high-priority)`);
            setTimeout(() => setToast(null), 3000);
          }
        } else {
          setToast(`${totalNew} new email${totalNew > 1 ? "s" : ""} fetched!`);
          setTimeout(() => setToast(null), 4000);
        }
      } else if (isManual) {
        setToast("Inbox is up to date");
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error("Failed to sync new emails", error);
      if (error.response?.status === 403) {
        window.location.reload();
        return;
      }
      if (isManual) {
        setToast("Failed to refresh emails");
        setTimeout(() => setToast(null), 4000);
      }
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, [user, gmailConnected, outlookConnected, fetchEmails]);

  // Initial load
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Auto-poll for new emails every 2 minutes
  useEffect(() => {
    if (!user || (!gmailConnected && !outlookConnected)) return;
    // Do an initial sync shortly after mount
    const initialTimeout = setTimeout(() => syncNewEmails(false), 5000);
    // Then poll every POLL_INTERVAL_MS
    pollRef.current = setInterval(() => syncNewEmails(false), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollRef.current);
    };
  }, [user, gmailConnected, syncNewEmails]);

  const handleAnalyze = async () => {
    if (!user) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res = await api.post(`/priority/analyze/user/${user.id}`);
      setAnalyzeResult({
        type: "success",
        message: `Analysis complete — ${res.data.analyzed} analyzed, ${res.data.skipped} already done${res.data.failed ? `, ${res.data.failed} failed` : ""}`
      });
      // Re-fetch emails to show updated priorities
      await fetchEmails();
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Analysis failed";
      setAnalyzeResult({ type: "error", message: msg });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReply = (emailId) => {
    setReplyingEmailId(emailId);
  };

  const handleSendReply = async (emailId, message) => {
    try {
      await api.post("/email/send", { emailId, message });
      setReplies({ ...replies, [emailId]: message });
      setReplyingEmailId(null);
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply. Did you forget to re-authenticate with the new permissions?");
    }
  };

  const handleCancelReply = () => {
    setReplyingEmailId(null);
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 px-2">
        <section className="lg:col-span-8 flex flex-col overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                {searchQuery ? `Search Results for "${searchQuery}"` : "Smart Inbox"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prioritized by AI • Auto-refreshes every 2 min</p>
            </div>
            <div className="flex items-center gap-3">
              {gmailConnected && (
                <>
                  <button
                    id="refresh-emails-btn"
                    onClick={() => syncNewEmails(true)}
                    disabled={refreshing}
                    title="Fetch new emails from Gmail"
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer ${
                      refreshing
                        ? "bg-blue-100 text-blue-400 cursor-wait"
                        : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 active:scale-95"
                    }`}
                  >
                    {refreshing ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Refreshing…
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </>
                    )}
                  </button>
                  <button
                    id="analyze-emails-btn"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer ${
                      analyzing
                        ? "bg-purple-100 text-purple-400 cursor-wait"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 active:scale-95"
                    }`}
                  >
                    {analyzing ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Analyze Emails
                      </>
                    )}
                  </button>
                </>
              )}
              {gmailConnected ? (
                <div title="Gmail Connected" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Gmail
                </div>
              ) : (
                <button 
                  title="Connect Gmail"
                  onClick={async () => {
                    try {
                      const res = await api.get("/gmail/login");
                      window.location.href = res.data.loginUrl;
                    } catch (err) { }
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm cursor-pointer transition active:scale-95"
                >
                  <span className="h-2 w-2 bg-slate-300 rounded-full"></span>
                  Connect Gmail
                </button>
              )}

              {outlookConnected ? (
                <div title="Outlook Connected" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Outlook
                </div>
              ) : (
                <button 
                  title="Connect Outlook"
                  onClick={async () => {
                    try {
                      const res = await api.get("/outlook/login");
                      window.location.href = res.data.loginUrl;
                    } catch (err) { }
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm cursor-pointer transition active:scale-95"
                >
                  <span className="h-2 w-2 bg-slate-300 rounded-full"></span>
                  Connect Outlook
                </button>
              )}
            </div>
          </div>

          {/* Toast notification */}
          {toast && (
            <div className="mx-6 mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-between animate-pulse">
              <span>{toast}</span>
              <button onClick={() => setToast(null)} className="ml-3 text-current opacity-50 hover:opacity-100 cursor-pointer">✕</button>
            </div>
          )}

          {/* Analysis result banner */}
          {analyzeResult && (
            <div className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between ${
              analyzeResult.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              <span>{analyzeResult.message}</span>
              <button onClick={() => setAnalyzeResult(null)} className="ml-3 text-current opacity-50 hover:opacity-100 cursor-pointer">✕</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <p className="text-slate-500 dark:text-gray-400 text-sm flex items-center justify-center p-12">Loading emails...</p>
            ) : (!gmailConnected && !outlookConnected) ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700">
                <div className="bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 p-4 rounded-3xl mb-5 shadow-sm">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Connect Your Email Accounts</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 max-w-sm mb-8">
                  Get started by securely connecting your Gmail or Outlook accounts. Our AI will automatically prioritize your inbox.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={async () => {
                      try {
                        const res = await api.get("/gmail/login");
                        window.location.href = res.data.loginUrl;
                      } catch (err) { }
                    }}
                    className="flex justify-center items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-100 text-white font-medium rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                    Connect Gmail
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await api.get("/outlook/login");
                        window.location.href = res.data.loginUrl;
                      } catch (err) { }
                    }}
                    className="flex justify-center items-center gap-2 px-6 py-2.5 bg-[#0078D4] hover:bg-[#106EBE] focus:ring-4 focus:ring-blue-100 text-white font-medium rounded-xl shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M1.161 2.368L22.84 0l.024 10.744-21.71 1.884V2.368zM22.85 10.744L22.868 24 1.155 21.625l.006-8.997 21.689-1.884z"/></svg>
                    Connect Outlook
                  </button>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No emails found or priority analysis is still pending.</p>
            ) : (
              emails.map((email) => (
                <div key={email.id} className="group">
                  <div className="transition-all duration-300 hover:scale-[1.01] hover:shadow-md rounded-xl">
                    <EmailCard
                      id={email.id}
                      subject={email.subject}
                      sender={email.sender}
                      preview={email.preview}
                      priority={email.priority}
                      date={email.date}
                      app={email.app}
                      action={email.action}
                      onReply={() => handleReply(email.id)}
                    />
                  </div>
                  {replyingEmailId === email.id && (
                    <div className="mt-3">
                      <ReplyBox
                        emailId={email.id}
                        sender={email.sender}
                        subject={email.subject}
                        onCancel={handleCancelReply}
                        onSend={(message) => handleSendReply(email.id, message)}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Quick insights to help you stay on top of your inbox.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4 hover:shadow-md transition">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Top sender</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {emails.length > 0 ? `Frequent updates from ${emails[0].sender}` : "Awaiting data..."}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4 hover:shadow-md transition">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Follow ups</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {emails.filter(e => e.priority === "High").length} high priority messages pending
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;