import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A component to protect admin routes and redirect non-admin users
 */
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  // Check if user is admin (either by role or superuser status)
  const isAdmin = user.role === 'ADMIN' || user.is_superuser === true;
  
  // Redirect non-admin users to the regular dashboard
  if (!isAdmin) {
    console.log('User is not an admin, redirecting to dashboard');
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default AdminRoute;