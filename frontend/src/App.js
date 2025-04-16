import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import FinanceRoute from './components/FinanceRoute';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/Profile';
import MLModels from './pages/MLModels/MLModels';
import PredictionHistory from './pages/MLModels/PredictionHistory';
import SubmitClaim from './pages/MLModels/SubmitClaim';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import FinanceClaims from './pages/finance/FinanceClaims';
import FinanceReports from './pages/finance/FinanceReports';
import FinanceClaimDetail from './pages/finance/FinanceClaimDetail';
import FinanceUserProfile from './pages/finance/FinanceUserProfile';
import UserManagement from './pages/admin/UserManagement';
import AdminUserProfile from './pages/admin/AdminUserProfile';
import ActivityLogs from './pages/admin/ActivityLogs';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClaims from './pages/admin/AdminClaims';
import AdminClaimDetail from './pages/admin/AdminClaimDetail';
import NotFound from './pages/NotFound';

// Claims Components
import ClaimsList from './components/Claims/ClaimsList';
import ClaimForm from './components/Claims/ClaimForm';
import ClaimDetail from './components/Claims/ClaimDetail';

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
        <Route path="/login" element={
          <AuthLayout>
            {!user ? <Login /> : (
              user.role === 'ADMIN' || user.is_superuser === true ? 
                <Navigate to="/admin" /> : 
                user.role === 'FINANCE' ?
                <Navigate to="/finance/dashboard" /> :
                <Navigate to="/dashboard" />
            )}
          </AuthLayout>
        } />
        
        <Route path="/register" element={
          <AuthLayout>
            {!user ? <Register /> : (
              user.role === 'ADMIN' || user.is_superuser === true ? 
                <Navigate to="/admin" /> : 
                user.role === 'FINANCE' ?
                <Navigate to="/finance/dashboard" /> :
                <Navigate to="/dashboard" />
            )}
          </AuthLayout>
        } />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={
            user ? 
              (user.role === 'ADMIN' || user.is_superuser === true ? 
                <Navigate to="/admin" replace /> : 
                user.role === 'FINANCE' ?
                <Navigate to="/finance/dashboard" replace /> :
                <Navigate to="/dashboard" replace />
              ) : 
              <Navigate to="/login" replace />
          } />
          
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
          
          {/* Finance Routes - Now using FinanceRoute component */}
          <Route 
            path="finance/dashboard" 
            element={
              <FinanceRoute>
                <FinanceDashboard />
              </FinanceRoute>
            } 
          />
          
          <Route 
            path="finance/claims" 
            element={
              <FinanceRoute>
                <FinanceClaims />
              </FinanceRoute>
            } 
          />
          
          <Route 
            path="finance/reports" 
            element={
              <FinanceRoute>
                <FinanceReports />
              </FinanceRoute>
            } 
          />
          
          <Route 
            path="finance/claims/:id" 
            element={
              <FinanceRoute>
                <FinanceClaimDetail />
              </FinanceRoute>
            } 
          />
          
          {/* New route for viewing user profiles in finance area */}
          <Route 
            path="finance/users/:id" 
            element={
              <FinanceRoute>
                <FinanceUserProfile />
              </FinanceRoute>
            } 
          />
          
          {/* Admin Only Routes - Now using AdminRoute component */}
          <Route 
            path="admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          
          <Route 
            path="admin/users" 
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } 
          />
          
          {/* Add a "create user" route that redirects to the user management page */}
          <Route
            path="admin/users/new"
            element={
              <AdminRoute>
                <Navigate to="/admin/users" replace state={{ showForm: true }} />
              </AdminRoute>
            }
          />
          
          {/* New route for viewing individual user profiles in admin area */}
          <Route 
            path="admin/users/:id" 
            element={
              <AdminRoute>
                <AdminUserProfile />
              </AdminRoute>
            } 
          />
          
          <Route 
            path="admin/activity-logs" 
            element={
              <AdminRoute>
                <ActivityLogs />
              </AdminRoute>
            } 
          />

          <Route 
            path="admin/claims" 
            element={
              <AdminRoute>
                <AdminClaims />
              </AdminRoute>
            } 
          />

          <Route 
            path="admin/claims/:id" 
            element={
              <AdminRoute>
                <AdminClaimDetail />
              </AdminRoute>
            } 
          />
        </Route>
        
      {/* Claims routes */}
      <Route path="/claims" element={<ProtectedRoute><ClaimsList /></ProtectedRoute>} />
      <Route path="/claims/new" element={<ProtectedRoute><ClaimForm /></ProtectedRoute>} />
      <Route path="/claims/:id" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
        
        {/* 404 Not Found */}
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