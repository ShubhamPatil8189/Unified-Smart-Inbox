import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">

        {/* LOGO */}
        <Link
          to="/"
          className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
        >
          Smart Inbox
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-8">

          <Link
            to="/features"
            className={`relative font-medium transition ${
              isActive("/features")
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Features
            {isActive("/features") && (
              <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
            )}
          </Link>

          <Link
            to="/pricing"
            className={`relative font-medium transition ${
              isActive("/pricing")
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Pricing
            {isActive("/pricing") && (
              <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
            )}
          </Link>

        </nav>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">

          {/* LOGIN BUTTON */}
          <Link
            to="/login"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Login
          </Link>

        </div>
      </div>
    </header>
  );
}

export default Navbar;