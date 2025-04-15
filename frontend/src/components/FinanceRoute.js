import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A component to protect finance routes and redirect non-finance users
 */
const FinanceRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  // Check if user is finance (either by role or admin status since admins can access finance)
  const isFinance = user.role === 'FINANCE' || user.role === 'ADMIN' || user.is_superuser === true;
  
  // Redirect non-finance users to the regular dashboard
  if (!isFinance) {
    console.log('User is not authorized for finance, redirecting to dashboard');
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default FinanceRoute;