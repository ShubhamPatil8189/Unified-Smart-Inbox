import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { 
  HiOutlineCalendar, 
  HiOutlineClipboardCheck, 
  HiOutlineExternalLink, 
  HiOutlineTrash, 
  HiOutlinePencil, 
  HiOutlinePlus,
  HiOutlineX
} from "react-icons/hi";

function TimeText({ time }) {
  if (!time) return <span className="text-gray-400">No time set</span>;
  const d = parseISO(time);
  let prefix = "";
  if (isToday(d)) prefix = "Today at ";
  else if (isTomorrow(d)) prefix = "Tomorrow at ";
  else if (isPast(d)) prefix = "Past due: ";

  return (
    <span className={isPast(d) ? "text-red-500 font-medium" : "text-gray-600 dark:text-gray-300"}>
      {prefix}
      {format(d, "MMM d, h:mm a")}
    </span>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "task",
    provider: "gmail",
    startTime: "",
    endTime: "",
    dueDate: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/task/all");
      setTasks(res.data.tasks || []);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to fetch tasks/events", err);
      setError("Failed to load your calendar and tasks. Please ensure your accounts are connected.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (item, isEvent) => {
    if (!window.confirm(`Are you sure you want to delete this ${isEvent ? 'event' : 'task'}?`)) return;
    
    try {
      await api.delete(`/task/${item.id}?provider=${item.source}&type=${isEvent ? 'event' : 'task'}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete item: " + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      type: "task",
      provider: "gmail",
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item, isEvent) => {
    setModalMode("edit");
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      type: isEvent ? "event" : "task",
      provider: item.source,
      startTime: item.time ? format(parseISO(item.time), "yyyy-MM-dd'T'HH:mm") : "",
      endTime: item.endTime ? format(parseISO(item.endTime), "yyyy-MM-dd'T'HH:mm") : "",
      dueDate: item.time ? format(parseISO(item.time), "yyyy-MM-dd'T'HH:mm") : ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "add") {
        await api.post("/task/manual", formData);
      } else {
        await api.patch(`/task/${editingItem.id}`, {
          provider: editingItem.source,
          type: formData.type,
          details: {
            title: formData.title,
            description: formData.description,
            startTime: formData.type === 'event' ? formData.startTime : undefined,
            endTime: formData.type === 'event' ? formData.endTime : undefined,
            dueDate: formData.type === 'task' ? formData.dueDate : undefined
          }
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert("Failed to save: " + (err.response?.data?.error || err.message));
    }
  };

  const renderItem = (item, isEvent) => {
    const isGoogle = item.source === "gmail";
    const bgColors = isGoogle
      ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
      : "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30";
    const textColors = isGoogle ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400";

    return (
      <div
        key={item.id}
        className={`relative rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow group dark:bg-gray-800 ${
          item.completed ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bgColors} ${textColors}`}>
                  {isGoogle ? "Google" : "Microsoft"} {isEvent ? "Calendar" : "Tasks"}
                </span>
                {item.completed && (
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <HiOutlineClipboardCheck /> Done
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenEditModal(item, isEvent)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md"
                >
                  <HiOutlinePencil className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item, isEvent)}
                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h3 className={`text-base font-semibold text-slate-900 dark:text-white truncate ${item.completed ? 'line-through text-slate-500' : ''}`}>
              {item.title}
            </h3>
            {item.description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400 line-clamp-2">
                {item.description}
              </p>
            )}
            
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                {isEvent ? <HiOutlineCalendar className="text-gray-400" /> : <HiOutlineClipboardCheck className="text-gray-400" />}
                <TimeText time={item.time} />
              </div>
              {isEvent && item.endTime && (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span>→</span>
                  <TimeText time={item.endTime} />
                </div>
              )}
            </div>
          </div>
          
          {item.htmlLink && (
            <a
              href={item.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg shrink-0"
              title="Open externally"
            >
              <HiOutlineExternalLink className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout title="Tasks & Calendar">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <p className="text-sm text-gray-500 dark:text-gray-400">Manage your synced agenda across platforms.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
        >
          <HiOutlinePlus className="text-lg" />
          <span>Add New</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unified Upcoming Events */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-gray-700">
            <HiOutlineCalendar className="text-2xl text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Events</h2>
          </div>
          
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-2 pb-10">
            {loading ? (
              <div className="animate-pulse flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-slate-100 dark:bg-gray-800 rounded-xl" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No upcoming events scheduled.</p>
            ) : (
              events.map((e) => renderItem(e, true))
            )}
          </div>
        </section>

        {/* Unified Tasks List */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-gray-700">
            <HiOutlineClipboardCheck className="text-2xl text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">To-Do List</h2>
          </div>
          
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-2 pb-10">
            {loading ? (
               <div className="animate-pulse flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-slate-100 dark:bg-gray-800 rounded-xl" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
               <p className="text-sm text-gray-500 dark:text-gray-400 italic">No pending tasks found.</p>
            ) : (
              tasks.map((t) => renderItem(t, false))
            )}
          </div>
        </section>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {modalMode === "add" ? "Add New Item" : "Edit Item"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
              >
                <HiOutlineX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Task or Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    disabled={modalMode === "edit"}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="task">Task</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                  <select
                    disabled={modalMode === "edit"}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    value={formData.provider}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                  >
                    <option value="gmail">Google</option>
                    <option value="outlook">Microsoft</option>
                  </select>
                </div>
              </div>

              {formData.type === "event" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start</label>
                    <input
                      type="datetime-local"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End</label>
                    <input
                      type="datetime-local"
                      required
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-lg active:scale-95"
                >
                  {modalMode === "add" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
