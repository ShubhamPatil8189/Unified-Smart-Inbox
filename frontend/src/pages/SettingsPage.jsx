import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineMail } from "react-icons/hi";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function SettingsPage() {
  const navigate = useNavigate(); 
  const { user, gmailConnected, outlookConnected } = useAuth();

  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const [autoPrioritization, setAutoPrioritization] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smartNotifications, setSmartNotifications] = useState(localStorage.getItem("smartNotifications") !== "false");
  const { darkMode, setDarkMode } = useTheme();

  // Priority Rules State
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({ type: "SENDER", pattern: "", target_priority: "IMPORTANT" });
  const [rulesLoading, setRulesLoading] = useState(false);

  const fetchRules = async () => {
    try {
      setRulesLoading(true);
      const api = (await import("../services/api")).default;
      const res = await api.get("/rules");
      setRules(res.data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setRulesLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRules();
  }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRule.pattern.trim()) return;
    try {
      const api = (await import("../services/api")).default;
      await api.post("/rules", newRule);
      setNewRule({ type: "SENDER", pattern: "", target_priority: "IMPORTANT" });
      fetchRules();
    } catch (error) {
      console.error("Failed to add rule:", error);
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      const api = (await import("../services/api")).default;
      await api.delete(`/rules/${id}`);
      fetchRules();
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };
  return (
    <DashboardLayout title="Settings">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-semibold">
              {userInitial}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{userName}</p>
              <p className="text-sm text-slate-500 dark:text-gray-400">{userEmail}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Update your profile information and manage account security from here.
            </p>
            <button
              onClick={() => navigate("/profile")}
              className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition"
            >
              Edit Profile
            </button>
          </div>
        </section>

        {/* Integrations */}
        <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Integrations</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Manage connected accounts and integrations.
              </p>
            </div>

            <div className="flex gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                gmailConnected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                <span className={`h-2 w-2 rounded-full ${gmailConnected ? "bg-emerald-600" : "bg-amber-500"}`} />
                Gmail {gmailConnected ? "Connected" : ""}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                outlookConnected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                <span className={`h-2 w-2 rounded-full ${outlookConnected ? "bg-emerald-600" : "bg-amber-500"}`} />
                Outlook {outlookConnected ? "Connected" : ""}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-red-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Gmail</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">{gmailConnected ? "Connected automatically syncing" : "Not connected"}</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                   try {
                     const api = (await import("../services/api")).default;
                     const res = await api.get("/gmail/login");
                     window.location.href = res.data.loginUrl;
                   } catch(e){}
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${gmailConnected ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
              >
                {gmailConnected ? "Reconnect" : "Connect"}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#0078D4] flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M1.161 2.368L22.84 0l.024 10.744-21.71 1.884V2.368zM22.85 10.744L22.868 24 1.155 21.625l.006-8.997 21.689-1.884z"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Outlook</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">{outlookConnected ? "Connected automatically syncing" : "Not connected"}</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                   try {
                     const api = (await import("../services/api")).default;
                     const res = await api.get("/outlook/login");
                     window.location.href = res.data.loginUrl;
                   } catch(e){}
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${outlookConnected ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
              >
                {outlookConnected ? "Reconnect" : "Connect"}
              </button>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferences</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Control how Smart Inbox works for you.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Email notifications</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Receive a summary of priority messages by email.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                <span className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-indigo-600 transition" />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </label>
            </div>

            {/* Smart Notifications Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Smart Notifications</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  Only notify me for high-priority/urgent messages.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={localStorage.getItem("smartNotifications") !== "false"}
                  onChange={(e) => {
                    localStorage.setItem("smartNotifications", e.target.checked ? "true" : "false");
                    // Force a re-render by updating a dummy state if needed, 
                    // or just let it be since it's used in Dashboard logic.
                    // For better UX, we'll use a local state here too.
                    setSmartNotifications(e.target.checked);
                  }}
                />
                <span className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-indigo-600 transition" />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Dark mode</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">Switch to a dark theme for the UI.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-indigo-600 transition" />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Custom Priority Rules */}
      <section className="mt-8 rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-slate-200 dark:border-gray-700">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Custom Priority Rules</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            Define explicit rules to override AI prioritization. Rules matching specific senders or patterns will always be applied first.
          </p>
        </div>

        {/* Add Rule Form */}
        <form onSubmit={handleAddRule} className="mb-8 grid gap-4 grid-cols-1 md:grid-cols-4 items-end bg-slate-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-gray-700">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Rule Type</label>
            <select 
              value={newRule.type}
              onChange={(e) => setNewRule({...newRule, type: e.target.value})}
              className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="SENDER">Sender Email</option>
              <option value="DOMAIN">Email Domain</option>
              <option value="SUBJECT">Subject Contains</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Pattern</label>
            <input 
              type="text"
              placeholder={newRule.type === 'DOMAIN' ? '@company.com' : 'Enter value...'}
              value={newRule.pattern}
              onChange={(e) => setNewRule({...newRule, pattern: e.target.value})}
              className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Target Priority</label>
            <select 
              value={newRule.target_priority}
              onChange={(e) => setNewRule({...newRule, target_priority: e.target.value})}
              className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="URGENT">Urgent</option>
              <option value="IMPORTANT">Important</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-md shadow-indigo-200 dark:shadow-none"
          >
            Add Rule
          </button>
        </form>

        {/* Rules List */}
        <div className="space-y-3">
          {rulesLoading ? (
            <div className="py-8 text-center text-slate-400">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-3xl text-center">
              <p className="text-slate-400 dark:text-gray-500">No custom rules yet. Add your first rule above.</p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition shadow-sm group">
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    rule.target_priority === 'URGENT' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                    rule.target_priority === 'IMPORTANT' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                    rule.target_priority === 'NORMAL' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                    'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {rule.target_priority}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {rule.type}: <span className="text-indigo-600 dark:text-indigo-400">"{rule.pattern}"</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteRule(rule.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}

export default SettingsPage;
