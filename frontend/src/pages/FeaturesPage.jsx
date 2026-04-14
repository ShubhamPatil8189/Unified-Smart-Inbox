import React from "react";
import Navbar from "../components/Navbar";
import { HiOutlineLightningBolt, HiOutlineMail, HiOutlineChartBar } from "react-icons/hi";

const features = [
  {
    icon: <HiOutlineLightningBolt size={28} />,
    title: "AI Priority Detection",
    desc: "Automatically identify the most important emails using AI.",
  },
  {
    icon: <HiOutlineMail size={28} />,
    title: "Smart Summary",
    desc: "Summarize long email threads instantly.",
  },
  {
    icon: <HiOutlineChartBar size={28} />,
    title: "Insights & Analytics",
    desc: "Track productivity and email patterns.",
  },
];

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors duration-300">

      <Navbar />

      {/* HERO */}
      <div className="max-w-6xl mx-auto text-center pt-20 px-6">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          Powerful Features to Boost Productivity 
        </h1>
        <p className="mt-6 text-gray-600 dark:text-gray-400 text-lg">
          Smart Inbox helps you focus on what matters using AI-powered insights.
        </p>
      </div>

      {/* FEATURE CARDS */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mt-16 px-6 pb-20">
        {features.map((f, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md hover:shadow-2xl dark:hover:shadow-gray-900/40 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="text-indigo-600 dark:text-indigo-400 mb-4">{f.icon}</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{f.title}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default FeaturesPage;