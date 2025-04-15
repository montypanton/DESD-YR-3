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
  if (roles && !isUserAuthorized(user, roles)) {
    console.log('User is not authorized for this route. User role:', user.role, 'Is superuser:', user.is_superuser);
    
    // Redirect admins to admin dashboard, others to regular dashboard
    if (user.role === 'ADMIN' || user.is_superuser === true) {
      return <Navigate to="/admin" />;
    } else {
      return <Navigate to="/dashboard" />;
    }
  }

  // If user is authenticated and has required role, show the protected component
  return children;
};

// Helper function to check if a user has access to a route
const isUserAuthorized = (user, requiredRoles) => {
  // Superusers can access any route
  if (user.is_superuser === true) {
    return true;
  }
  
  // Check if the user's role is in the list of required roles
  return requiredRoles.includes(user.role);
};

export default ProtectedRoute;