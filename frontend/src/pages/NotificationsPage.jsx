import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineTrash,
} from "react-icons/hi";

function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get(`/notifications/user/${user.id}`);
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <HiOutlineCheckCircle className="text-emerald-500 text-2xl" />;
      case "priority":
        return <HiOutlineExclamationCircle className="text-red-500 text-2xl" />;
      case "warning":
        return <HiOutlineExclamationCircle className="text-yellow-500 text-2xl" />;
      case "info":
        return <HiOutlineInformationCircle className="text-blue-500 text-2xl" />;
      default:
        return <HiOutlineBell className="text-indigo-500 text-2xl" />;
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await api.patch(`/notifications/user/${user.id}/read-all`);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-4xl mx-auto">
        {/* Notifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-slate-500 dark:text-gray-400">Loading your alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-gray-800 p-16 shadow-lg border border-slate-100 dark:border-gray-700 text-center">
              <div className="bg-slate-50 dark:bg-gray-700/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <HiOutlineBell className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No notifications yet</h3>
              <p className="text-slate-500 dark:text-gray-400">When your AI identifies high-priority emails, alerts will appear here.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl p-6 shadow-sm transition-all duration-300 border ${
                  notification.read
                    ? "bg-white/50 dark:bg-gray-800/50 border-slate-100 dark:border-gray-700 opacity-80"
                    : "bg-white dark:bg-gray-800 border-indigo-100 dark:border-indigo-900/50 shadow-indigo-100/20 dark:shadow-none"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3
                          className={`text-lg font-bold tracking-tight ${
                            notification.read
                              ? "text-slate-700 dark:text-gray-300"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p
                          className={`mt-2 text-sm leading-relaxed ${
                            notification.read
                              ? "text-slate-500 dark:text-gray-500"
                              : "text-slate-600 dark:text-gray-400"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="mt-4 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                          {new Date(notification.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 dark:shadow-none"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                          aria-label="Delete notification"
                        >
                          <HiOutlineTrash className="text-xl" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default NotificationsPage;
