import { useState } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const emails = [
    { id: 1, subject: "Meeting Tomorrow", priority: "high" },
    { id: 2, subject: "Amazon Sale", priority: "low" },
    { id: 3, subject: "Project Deadline", priority: "high" },
  ];

  function runAnalysis() {
    setShowResults(false);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowResults(true);
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-24 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-10">

          {/* Left Side */}
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              Prioritize What Matters
            </h1>

            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-lg">
              Smart Inbox uses AI to prioritize your Gmail inbox so you can focus
              on the messages that move the needle.
            </p>

            <div className="flex gap-4 mt-8">
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Get Started
              </Link>

              <Link
                to="/login"
                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105 transition-all duration-200"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className="relative flex justify-center">
            <div className="absolute w-72 h-72 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-3xl opacity-30 dark:opacity-20"></div>

            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/40 p-6 w-[380px] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Live Example
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your inbox with AI prioritization
                </p>
              </div>

              <div className="space-y-3">
                {emails.map((e) => (
                  <div
                    key={e.id}
                    className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {e.subject}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        from: sender@example.com
                      </div>
                    </div>

                    <div className="ml-3">
                      {loading ? (
                        <svg
                          className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                      ) : showResults ? (
                        e.priority === "high" ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                            High
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                            Low
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={
                  showResults
                    ? () => {
                        setLoading(false);
                        setShowResults(false);
                      }
                    : runAnalysis
                }
                className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                {loading
                  ? "Analyzing..."
                  : showResults
                  ? "Reset"
                  : "Run AI Analysis"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white dark:bg-gray-900 py-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-tr from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                AI Priority Detection
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Let smart algorithms determine what matters most so you don't
                have to.
              </p>
            </div>

            <div className="bg-gradient-to-tr from-green-50 to-green-100 dark:from-emerald-950/50 dark:to-emerald-900/30 p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Smart Summary
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Quick overviews of long email threads to save you time.
              </p>
            </div>

            <div className="bg-gradient-to-tr from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/30 p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Gmail Integration
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Seamless connection with your inbox for real-time updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white dark:bg-gray-900 py-24 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                About Smart Inbox
              </h2>
              <p className="mt-6 text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                Smart Inbox is designed to help professionals focus on what truly matters. By using AI-powered prioritization, the platform analyzes incoming emails and highlights the most important messages so you can spend less time sorting and more time acting.
              </p>
              <ul className="mt-6 space-y-3 text-gray-700 dark:text-gray-300">
                <li>• AI-powered email prioritization</li>
                <li>• Smart summaries of long conversations</li>
                <li>• Seamless Gmail integration</li>
              </ul>
            </div>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-6 rounded-xl transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Insights</h3>
                <p className="text-gray-600 dark:text-gray-400">Get intelligent prioritization that learns from your behavior.</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-emerald-950/40 dark:to-blue-950/40 p-6 rounded-xl transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Time-Saving Automation</h3>
                <p className="text-gray-600 dark:text-gray-400">Reduce email management time by up to 50%.</p>
              </div>
              <div className="bg-gradient-to-r from-pink-50 to-orange-50 dark:from-pink-950/40 dark:to-orange-950/40 p-6 rounded-xl transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Seamless Integration</h3>
                <p className="text-gray-600 dark:text-gray-400">Works directly with your existing Gmail account.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-10 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul>
                <li><a href="#" className="block mb-2 hover:text-white transition">Features</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">AI Priority Detection</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Smart Summary</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Gmail Integration</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul>
                <li><a href="#" className="block mb-2 hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">API</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Blog</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul>
                <li><a href="#" className="block mb-2 hover:text-white transition">About</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Careers</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Contact</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Partners</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul>
                <li><a href="#" className="block mb-2 hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Security</a></li>
                <li><a href="#" className="block mb-2 hover:text-white transition">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 dark:border-gray-800 mt-12 pt-6 flex items-center justify-between text-sm">
            <div>Smart Inbox © 2026</div>
            <div>Designed by Unified Coders</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;