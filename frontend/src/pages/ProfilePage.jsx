import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { HiOutlineArrowLeft, HiOutlineSave } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Split the user's name into first and last
  const nameParts = (user?.name || "").trim().split(/\s+/);
  const defaultFirst = nameParts[0] || "";
  const defaultLast = nameParts.slice(1).join(" ") || "";

  const [formData, setFormData] = useState({
    firstName: defaultFirst,
    lastName: defaultLast,
    email: user?.email || "",
    jobTitle: "",
    phone: "",
    bio: "",
    department: "",
    location: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert("Profile updated successfully!");
    navigate("/settings");
  };

  return (
    <DashboardLayout title="Edit Profile">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/settings")}
          className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition"
        >
          <HiOutlineArrowLeft className="text-lg" />
          Back to Settings
        </button>

        {/* Profile Card */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-sm">
          {/* Profile Avatar Section */}
          <div className="mb-8 flex items-center gap-6 pb-8 border-b border-slate-200 dark:border-gray-700">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-4xl font-semibold text-white">
              {formData.firstName[0]}
              {formData.lastName[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {formData.firstName} {formData.lastName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{formData.email}</p>
              <button className="mt-3 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100 transition">
                Change Avatar
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Job Title and Department */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4 border-t border-slate-200 dark:border-gray-700 pt-8">
            <button
              onClick={() => navigate("/settings")}
              className="flex-1 px-6 py-3 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 font-semibold hover:bg-slate-50 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg transition disabled:opacity-70"
            >
              <HiOutlineSave className="text-lg" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;
