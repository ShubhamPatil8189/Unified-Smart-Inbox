import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  HiOutlineHome,
  HiOutlineMail,
  HiOutlineCog,
  HiOutlineMenu,
  HiOutlineLogout,
  HiOutlineClipboardList
} from "react-icons/hi";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: HiOutlineHome },
  { label: "Gmail", to: "/gmail", icon: HiOutlineMail },
  { label: "Outlook", to: "/outlook", icon: HiOutlineMail },
  { label: "Tasks", to: "/tasks", icon: HiOutlineClipboardList },
  { label: "Settings", to: "/settings", icon: HiOutlineCog },
];

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const { logout } = useAuth();

  useEffect(() => {
    const widthValue = collapsed ? "5rem" : "16rem";
    document.documentElement.style.setProperty("--sidebar-width", widthValue);
  }, [collapsed]);

  const handleToggle = () => setCollapsed((prev) => !prev);
  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col justify-between bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${
        collapsed ? "w-20" : "w-64"
      }`}
      style={{
        width: collapsed ? "5rem" : "16rem",
        "--sidebar-width": collapsed ? "5rem" : "16rem",
      }}
    >
      {/* Top: sidebar header */}
      <div
        className={`${
          collapsed
            ? "flex justify-center py-4"
            : "flex items-center gap-3 px-4 py-4"
        } border-b border-gray-100 dark:border-gray-800`}
      >
        <button
          type="button"
          onClick={handleToggle}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Toggle sidebar"
        >
          <HiOutlineMenu className="text-xl text-gray-600 dark:text-gray-300" />
        </button>

        {!collapsed ? (
          <div className="flex flex-col leading-tight">
            <p className="font-semibold text-lg text-slate-900 dark:text-white">Smart Inbox</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Priority email workspace</p>
          </div>
        ) : null}
      </div>

      {/* Middle: navigation */}
      <nav
        className={`flex-1 ${collapsed ? "flex flex-col items-center" : "px-2"} mt-6`}
      >
        <ul className={`${collapsed ? "space-y-6" : "space-y-2"}`}> 
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className={collapsed ? "w-full" : ""}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center ${
                      collapsed ? "justify-center" : "justify-start"
                    } gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-transparent dark:border-indigo-500/20"
                      : "text-slate-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  <span className="text-xl">
                    <Icon />
                  </span>
                  <span className={`${collapsed ? "hidden" : "block"}`}>
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: theme toggle + sign out */}
      <div className="p-4 space-y-2">
        <button
          type="button"
          onClick={toggleDarkMode}
          className={`flex items-center ${
            collapsed ? "justify-center" : "justify-start"
          } gap-3 w-full rounded-lg px-4 py-3 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
        >
          {darkMode ? (
            <HiOutlineSun className="text-xl text-amber-400" />
          ) : (
            <HiOutlineMoon className="text-xl" />
          )}
          <span className={`${collapsed ? "hidden" : "block"}`}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className={`flex items-center ${
            collapsed ? "justify-center" : "justify-start"
          } gap-3 w-full rounded-lg px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
        >
          <HiOutlineLogout className="text-xl" />
          <span className={`${collapsed ? "hidden" : "block"}`}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
