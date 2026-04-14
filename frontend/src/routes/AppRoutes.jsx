import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import OAuthCallback from "../pages/OAuthCallback";
import Dashboard from "../pages/Dashboard";
import GmailPage from "../pages/GmailPage";
import OutlookPage from "../pages/OutlookPage";
import TasksPage from "../pages/TasksPage";
import SettingsPage from "../pages/SettingsPage";
import ProfilePage from "../pages/ProfilePage";
import NotificationsPage from "../pages/NotificationsPage";
import FeaturesPage from "../pages/FeaturesPage";
import PricingPage from "../pages/PricingPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/google/callback" element={<OAuthCallback />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/gmail" element={<GmailPage />} />
        <Route path="/outlook" element={<OutlookPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;