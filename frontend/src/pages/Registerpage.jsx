import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import API_BASE_URL from "../config/apiConfig";

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/register", { name, email, password });
      login(response.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  async function handleGoogleLogin() {
    try {
      const res = await api.get("/gmail/login");
      window.location.href = res.data.loginUrl;
    } catch (err) {
      console.error("Failed to load login URL", err);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar />

      <div className="flex flex-1 items-center justify-center py-12 px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/40 rounded-2xl p-10 w-full max-w-md transition-colors duration-300">
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900 dark:text-white">
            Create your account
          </h2>

          {error && (
            <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email"
              className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full mb-4 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full mb-6 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-colors"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition mb-4 disabled:bg-indigo-400"
            >
              {isLoading ? "Creating account..." : "Register"}
            </button>
          </form>

          <div className="relative flex items-center mb-4 border-t border-gray-200 dark:border-gray-700 pt-5">
             <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin} 
            className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-600 rounded-lg py-3 mb-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition transform hover:scale-105"
          >
            <FcGoogle size={20} />
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;