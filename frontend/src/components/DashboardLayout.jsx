import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function DashboardLayout({ title, children }) {
  return (
    <div className="flex">
      <Sidebar />

      <div
        className="flex flex-col min-h-screen w-full transition-all duration-300"
        style={{ marginLeft: "var(--sidebar-width, 16rem)" }}
      >
        <Header title={title} />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
