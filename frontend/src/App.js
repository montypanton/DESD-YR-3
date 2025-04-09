import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/Profile';
import MLModels from './pages/MLModels/MLModels';
import PredictionHistory from './pages/MLModels/PredictionHistory';
import SubmitClaim from './pages/MLModels/SubmitClaim';
import Finance from './pages/finance/Finance';
import UserManagement from './pages/admin/UserManagement';
import ActivityLogs from './pages/admin/ActivityLogs';
import NotFound from './pages/NotFound';

// Claims Components
import ClaimsList from './components/Claims/ClaimsList';
import ClaimForm from './components/Claims/ClaimForm';
import ClaimDetail from './components/Claims/ClaimDetail';

// Theme-aware wrapper for auth pages
const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
    {children}
  </div>
);

function App() {
  const { user } = useAuth();
  
  return (
    <div className="font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Routes>
        {/* Public routes wrapped in AuthLayout for theme support */}
        <Route path="/login" element={
          <AuthLayout>
            {!user ? <Login /> : <Navigate to="/dashboard" />}
          </AuthLayout>
        } />
        
        <Route path="/register" element={
          <AuthLayout>
            {!user ? <Register /> : <Navigate to="/dashboard" />}
          </AuthLayout>
        } />
        
        {/* Protected routes - Layout already has theme support */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          
          {/* ML Engineer & Admin Routes */}
          <Route 
            path="ml-models" 
            element={
              <ProtectedRoute roles={['ADMIN', 'ML_ENGINEER']}>
                <MLModels />
              </ProtectedRoute>
            } 
          />
          
          {/* Available to all authenticated users */}
          <Route path="predictions" element={<PredictionHistory />} />
          <Route path="submit-claim" element={<SubmitClaim />} />
          
          {/* Finance & Admin Routes */}
          <Route 
            path="finance" 
            element={
              <ProtectedRoute roles={['ADMIN', 'FINANCE']}>
                <Finance />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Only Routes */}
          <Route 
            path="admin/users" 
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="admin/activity-logs" 
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <ActivityLogs />
              </ProtectedRoute>
            } 
          />
        </Route>
        
        {/* Claims routes - outside the Layout component */}
        <Route path="/claims" element={<ClaimsList />} />
        <Route path="/claims/new" element={<ClaimForm />} />
        <Route path="/claims/:id" element={<ClaimDetail />} />
        
        {/* 404 Not Found - with theme support */}
        <Route path="*" element={
          <AuthLayout>
            <NotFound />
          </AuthLayout>
        } />
      </Routes>
    </div>
  );
}

export default App;