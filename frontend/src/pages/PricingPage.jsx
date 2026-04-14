import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { HiCheck, HiX } from "react-icons/hi";

const PricingPage = () => {
  const [yearly, setYearly] = useState(false);

  const price = (monthly) => (yearly ? monthly * 10 : monthly);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors duration-300">

      <Navbar />

      {/* HERO */}
      <div className="text-center pt-20">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          Pricing that scales with you 
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Choose a plan and boost your productivity.
        </p>

        {/* TOGGLE */}
        <div className="flex justify-center mt-8">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                !yearly ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                yearly ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mt-16 px-6">

        {/* FREE */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-2xl dark:hover:shadow-gray-900/40 hover:-translate-y-2 transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Free</h2>
          <p className="text-3xl font-bold mt-4 text-gray-900 dark:text-white">₹0</p>
          <ul className="mt-6 space-y-2 text-gray-600 dark:text-gray-400">
            <li>✔ Basic AI prioritization</li>
            <li>✔ Gmail integration</li>
          </ul>
          <button className="mt-6 w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            Get Started
          </button>
        </div>

        {/* PRO */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-2 border-indigo-500 scale-105 relative hover:-translate-y-2 transition-all duration-300">
          <span className="absolute top-3 right-3 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
            Most Popular
          </span>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pro</h2>
          <p className="text-3xl font-bold mt-4 text-gray-900 dark:text-white">
            ₹{price(499)}{yearly ? "/yr" : "/mo"}
          </p>

          <ul className="mt-6 space-y-2 text-gray-600 dark:text-gray-400">
            <li>✔ Advanced AI insights</li>
            <li>✔ Smart summaries</li>
            <li>✔ Priority alerts</li>
          </ul>

          <button className="mt-6 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            Upgrade
          </button>
        </div>

        {/* ENTERPRISE */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-2xl dark:hover:shadow-gray-900/40 hover:-translate-y-2 transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Enterprise</h2>
          <p className="text-3xl font-bold mt-4 text-gray-900 dark:text-white">Custom</p>
          <ul className="mt-6 space-y-2 text-gray-600 dark:text-gray-400">
            <li>✔ Team collaboration</li>
            <li>✔ Custom AI models</li>
          </ul>
          <button className="mt-6 w-full py-2 bg-gray-900 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 transition">
            Contact Us
          </button>
        </div>

      </div>

      
      {/* FEATURE COMPARISON */}
      <div className="max-w-6xl mx-auto mt-24 px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Compare Plans
        </h2>

        <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm text-left">

            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-5 font-semibold">Features</th>
                <th className="text-center">Free</th>
                <th className="text-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">Pro </th>
                <th className="text-center">Enterprise</th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800">

              <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td className="p-5 font-medium text-gray-900 dark:text-gray-200">
                  AI Prioritization
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rank emails automatically</p>
                </td>
                <td className="text-center text-green-600 dark:text-green-400"><HiCheck className="mx-auto" /></td>
                <td className="text-center text-green-600 dark:text-green-400 bg-indigo-50 dark:bg-indigo-900/20"><HiCheck className="mx-auto" /></td>
                <td className="text-center text-green-600 dark:text-green-400"><HiCheck className="mx-auto" /></td>
              </tr>

              <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td className="p-5 font-medium text-gray-900 dark:text-gray-200">
                  Smart Summary
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI summaries</p>
                </td>
                <td className="text-center text-gray-400 dark:text-gray-500"><HiX className="mx-auto" /></td>
                <td className="text-center text-green-600 dark:text-green-400 bg-indigo-50 dark:bg-indigo-900/20"><HiCheck className="mx-auto" /></td>
                <td className="text-center text-green-600 dark:text-green-400"><HiCheck className="mx-auto" /></td>
              </tr>

              <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td className="p-5 font-medium text-gray-900 dark:text-gray-200">
                  Team Collaboration
                </td>
                <td className="text-center text-gray-400 dark:text-gray-500"><HiX className="mx-auto" /></td>
                <td className="text-center text-gray-400 dark:text-gray-500 bg-indigo-50 dark:bg-indigo-900/20"><HiX className="mx-auto" /></td>
                <td className="text-center text-green-600 dark:text-green-400"><HiCheck className="mx-auto" /></td>
              </tr>

            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};

export default PricingPage;