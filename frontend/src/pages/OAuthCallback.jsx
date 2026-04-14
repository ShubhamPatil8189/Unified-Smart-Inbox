import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
      return;
    }

    const oauth = searchParams.get("oauth");
    if (oauth === "success") {
      // The backend sets the session cookie upon success. 
      // Changing window.location forces a full app reload, ensuring AuthContext picks it up.
      window.location.href = "/dashboard";
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col pt-20 px-4 bg-gray-50 dark:bg-gray-900 items-center transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/40 rounded-xl max-w-md w-full text-center transition-colors duration-300">
        {error ? (
          <div>
            <div className="mb-4 text-red-500 dark:text-red-400">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Authentication Failed</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 bg-red-50 dark:bg-red-900/30 p-3 rounded text-sm break-words">{error}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              This usually happens if you deny permissions or if the Google Cloud App lacks requested scopes.
            </p>
            <button 
              onClick={() => navigate("/login")}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Completing Login...</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Please wait while we redirect you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
