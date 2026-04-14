import React from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { HiOutlineSearch, HiOutlineBell, HiOutlineSparkles } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Header({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = React.useState(searchParams.get("q") || "");

  React.useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      const q = searchQuery.trim();
      const currentPath = location.pathname;
      const targetPaths = ["/dashboard", "/gmail", "/outlook"];
      const targetPath = targetPaths.includes(currentPath) ? currentPath : "/dashboard";

      if (q) {
        navigate(`${targetPath}?q=${encodeURIComponent(q)}`);
      } else {
        navigate(`${targetPath}`);
      }
    }
  };

  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchUnreadCount = React.useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/notifications/user/${user.id}`);
      const count = (res.data.notifications || []).filter(n => !n.read).length;
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch notification count", err);
    }
  }, [user]);

  const [analyzing, setAnalyzing] = React.useState(false);

  const handleGlobalAnalyze = async () => {
    if (!user || analyzing) return;
    setAnalyzing(true);
    try {
      await api.post(`/priority/analyze/user/${user.id}`);
      // Refresh count or trigger a global update if needed
      fetchUnreadCount();
      alert("Analysis complete! Your priority inbox is up to date.");
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI Analysis failed. Please try again later.");
    } finally {
      setAnalyzing(false);
    }
  };

  React.useEffect(() => {
    fetchUnreadCount();
    // Refresh count periodically or on some event
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const subtitle = {
    Dashboard: "Your AI-prioritized inbox — focus on what matters most.",
    Gmail: "Your Gmail inbox prioritized by AI.",
    Outlook: "Your Outlook inbox prioritized by AI.",
    Settings: "Manage account settings and integrations.",
    "Edit Profile": "Update your personal and professional information.",
    Notifications: "Stay updated with all your notifications.",
  };

  return (
    <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 transition-colors duration-300 sticky top-0 z-20">

      {/* LEFT */}
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
          {subtitle[title] || ""}
        </p>
      </div>

      {/* CENTER SEARCH */}
      <div className="flex flex-1 justify-center px-8">
        <div className="w-full max-w-lg flex items-center bg-slate-100 dark:bg-gray-700/50 rounded-2xl px-4 py-2 border border-transparent focus-within:border-indigo-200 dark:focus-within:border-indigo-900 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all duration-300 group">
          <HiOutlineSearch className="text-slate-400 dark:text-gray-500 text-xl group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            placeholder="Search emails, senders, or keywords..."
            className="ml-3 w-full bg-transparent outline-none text-sm text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 font-medium"
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">

        {/* ANALYZE BUTTON */}
        <button
          onClick={handleGlobalAnalyze}
          disabled={analyzing}
          title="Trigger Smart AI Analysis"
          className={`p-2.5 rounded-xl transition-all duration-200 group active:scale-95 ${
            analyzing 
              ? "bg-purple-100 text-purple-600 cursor-wait dark:bg-purple-900/30 dark:text-purple-400" 
              : "hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300"
          }`}
        >
          <HiOutlineSparkles className={`text-2xl transition-colors ${
            analyzing ? "animate-pulse" : "group-hover:text-purple-600 dark:group-hover:text-purple-400"
          }`} />
        </button>

        {/* NOTIFICATION */}
        <button
          onClick={() => navigate("/notifications")}
          className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 transition-all duration-200 relative group active:scale-95"
          title="Notifications"
        >
          <HiOutlineBell className="text-slate-600 dark:text-gray-300 text-2xl group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-5 min-w-[20px] pt-1 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm animate-in fade-in zoom-in duration-300">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* PROFILE */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-gray-700 p-1 rounded-2xl transition-all duration-200 active:scale-95 group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 dark:text-gray-200 leading-none">{userName}</p>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-tighter mt-1">{userEmail}</p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-transform group-hover:rotate-3">
            {userInitial}
          </div>
        </button>

      </div>
    </header>
  );
}