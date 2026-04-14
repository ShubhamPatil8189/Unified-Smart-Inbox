import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, check if the JWT cookie is valid and fetch user profile
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user);
        setGmailConnected(res.data.user.gmailConnected);
        setOutlookConnected(res.data.user.outlookConnected);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } catch {
        // JWT expired or missing – clear any stale local data
        setUser(null);
        setGmailConnected(false);
        setOutlookConnected(false);
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      setGmailConnected(false);
      setOutlookConnected(false);
      localStorage.removeItem("user");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, gmailConnected, outlookConnected, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

