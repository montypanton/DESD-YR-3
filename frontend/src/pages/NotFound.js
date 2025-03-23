import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-6xl font-bold text-gray-900">404</h2>
        <p className="text-2xl font-medium text-gray-600 mt-4">Page not found</p>
        <p className="text-gray-500 mt-2">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;