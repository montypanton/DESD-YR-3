import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A component to protect ML Engineer routes and redirect non-ML Engineer users
 */
const MLEngineerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  // Check if user is ML Engineer (either by role or admin status since admins can access ML Engineer routes)
  const isMLEngineer = user.role === 'ML_ENGINEER' || user.role === 'ADMIN' || user.is_superuser === true;
  
  // Redirect non-ML Engineer users to the regular dashboard
  if (!isMLEngineer) {
    console.log('User is not authorized for ML Engineer routes, redirecting to dashboard');
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default MLEngineerRoute;