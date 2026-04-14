import React from "react";

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-6 py-4 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>Smart Inbox © 2026</div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-gray-700 dark:hover:text-gray-200">
            Privacy
          </a>
          <a href="#" className="hover:text-gray-700 dark:hover:text-gray-200">
            Terms
          </a>
          <a href="#" className="hover:text-gray-700 dark:hover:text-gray-200">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
