import React, { useState } from "react";
import { HiOutlinePaperClip, HiOutlineEmojiHappy, HiOutlineSparkles } from "react-icons/hi";
import api from "../services/api";

function ReplyBox({ emailId, sender, subject, onCancel, onSend }) {
  const [message, setMessage] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };

  const handleAIDraft = async () => {
    if (!emailId) return;
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await api.post("/email/draft-reply", { emailId, tone: "professional" });
      if (res.data?.draft) {
        setMessage(res.data.draft);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate AI draft";
      setDraftError(msg);
      setTimeout(() => setDraftError(null), 5000);
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="transition-all duration-300 mt-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      {/* Header with To field */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wide">
          To:
        </p>
        <p className="text-sm text-slate-700 dark:text-gray-300 mt-1">{sender}</p>
      </div>

      {/* Subject reference (optional) */}
      <p className="text-xs text-slate-500 dark:text-gray-500 mb-3">
        Re: {subject}
      </p>

      {/* Textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your reply..."
        className="w-full p-3 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        rows="4"
      />

      {/* Draft error banner */}
      {draftError && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{draftError}</span>
          <button onClick={() => setDraftError(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Action buttons and icons */}
      <div className="flex items-center justify-between mt-4">
        {/* Left: Icons + AI Draft */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAIDraft}
            disabled={drafting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              drafting
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-400 cursor-wait"
                : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 active:scale-95 shadow-sm"
            }`}
            title="Generate AI-powered reply draft"
          >
            {drafting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Drafting…
              </>
            ) : (
              <>
                <HiOutlineSparkles className="w-3.5 h-3.5" />
                AI Draft
              </>
            )}
          </button>

          <button
            type="button"
            className="p-2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Attach file"
          >
            <HiOutlinePaperClip className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Add emoji"
          >
            <HiOutlineEmojiHappy className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Send and Cancel buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReplyBox;
