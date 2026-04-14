import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import EmailCard from "../components/EmailCard";
import ReplyBox from "../components/ReplyBox";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

function OutlookPage() {
  const { user, outlookConnected } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q");

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [filter, setFilter] = useState("All");
  const [replyingEmailId, setReplyingEmailId] = useState(null);
  const [replies, setReplies] = useState({});
  const pollRef = useRef(null);

  const fetchOutlook = useCallback(async () => {
    if (!user || !outlookConnected) {
      setLoading(false);
      return;
    }
    try {
      const endpoint = searchQuery
        ? `/priority/user/${user.id}/search?q=${encodeURIComponent(searchQuery)}&provider=outlook`
        : `/priority/user/${user.id}/emails?provider=outlook`;
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
          preview: e.snippet || "",
          priority: uiPriority,
          date: e.received_at ? new Date(e.received_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
          action: e.action, // Pass the action
        };
      });
      setEmails(mappedEmails);
    } catch (error) {
      console.error("Failed to fetch outlook", error);
    } finally {
      setLoading(false);
    }
  }, [user, outlookConnected, searchQuery]);

  // Pull new emails from Outlook API → DB, then refresh the list
  const syncNewEmails = useCallback(async (isManual = false) => {
    if (!user || !outlookConnected) return;
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get(`/outlook/fetch/${user.id}`);
      const newCount = res.data.count || 0;
      await fetchOutlook();
      if (newCount > 0) {
        setToast(`${newCount} new email${newCount > 1 ? "s" : ""} fetched!`);
        setTimeout(() => setToast(null), 4000);
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
  }, [user, outlookConnected, fetchOutlook]);

  // Initial load
  useEffect(() => {
    fetchOutlook();
  }, [fetchOutlook]);

  // Auto-poll every 2 minutes
  useEffect(() => {
    if (!user || !outlookConnected) return;
    const initialTimeout = setTimeout(() => syncNewEmails(false), 5000);
    pollRef.current = setInterval(() => syncNewEmails(false), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollRef.current);
    };
  }, [user, outlookConnected, syncNewEmails]);

  const filteredEmails = useMemo(() => {
    if (filter === "All") return emails;
    return emails.filter((email) => email.priority === filter);
  }, [filter, emails]);

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
    <DashboardLayout title="Outlook">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="col-span-2 space-y-6">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Outlook status</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{outlookConnected ? "Connected • Auto-refreshes every 2 min" : "Outlook not connected"}</p>
              </div>
              <div className="flex items-center gap-2">
                {outlookConnected && (
                  <button
                    id="refresh-outlook-btn"
                    onClick={() => syncNewEmails(true)}
                    disabled={refreshing}
                    title="Fetch new emails from Outlook"
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer ${
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
                )}
                {outlookConnected ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Not Connected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Toast notification */}
          {toast && (
            <div className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-between animate-pulse">
              <span>{toast}</span>
              <button onClick={() => setToast(null)} className="ml-3 text-current opacity-50 hover:opacity-100 cursor-pointer">✕</button>
            </div>
          )}

          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {searchQuery ? `Search Results for "${searchQuery}"` : "Email list"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Filter what you see in your inbox.</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {[
                  { label: "All", value: "All" },
                  { label: "High", value: "High" },
                  { label: "Medium", value: "Medium" },
                  { label: "Low", value: "Low" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none ${
                      filter === option.value
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading emails...</p>
              ) : !outlookConnected ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Connect Your Outlook Account</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-5">To view your emails here, please authorize access to your Microsoft account.</p>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await api.get("/outlook/login");
                        window.location.href = res.data.loginUrl;
                      } catch (err) {
                        console.error("Failed to load login URL", err);
                      }
                    }}
                    className="px-5 py-2 bg-[#0078D4] hover:bg-[#106EBE] text-white font-medium rounded-lg transition-colors border border-transparent"
                  >
                    Connect Outlook
                  </button>
                </div>
              ) : filteredEmails.map((email) => (
                <div key={email.id}>
                  <EmailCard
                    id={email.id}
                    subject={email.subject}
                    sender={email.sender}
                    preview={email.preview}
                    priority={email.priority}
                    date={email.date}
                    app="Outlook"
                    action={email.action}
                    onReply={() => handleReply(email.id)}
                  />
                  {replyingEmailId === email.id && (
                    <ReplyBox
                      emailId={email.id}
                      sender={email.sender}
                      subject={email.subject}
                      onCancel={handleCancelReply}
                      onSend={(message) => handleSendReply(email.id, message)}
                    />
                  )}
                </div>
              ))}
              {!loading && filteredEmails.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-gray-400">No messages match this filter.</p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick tips</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                Use filters to see only high priority messages.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                Mark messages as starred to surface them later.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                Reconnect Outlook if you notice missing messages.
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </DashboardLayout>
  );
}

export default OutlookPage;
