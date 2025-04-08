import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component to handle redirects from legacy URLs to new ones
 * This is useful when changing routes but maintaining backward compatibility
 */
const LegacyRedirect = ({ to }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect on component mount
    navigate(to, { replace: true });
  }, [navigate, to]);
  
  // Show a loading state while redirect happens
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-3 text-gray-600 dark:text-gray-300">Redirecting...</p>
      </div>
    </div>
  );
};

export default LegacyRedirect;
