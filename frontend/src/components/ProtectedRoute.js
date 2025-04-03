// Restricts access to child components based on user authentication and role; redirects if conditions fail

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Show loading spinner or placeholder while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // If roles are specified and user doesn't have required role
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  // If user is authenticated and has required role, show the protected component
  return children;
};

export default ProtectedRoute;