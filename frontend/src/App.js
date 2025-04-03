import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Profile/Profile';
import MLModels from './pages/MLModels/MLModels';
import PredictionHistory from './pages/MLModels/PredictionHistory';
import Finance from './pages/Finance/Finance';
import UserManagement from './pages/Admin/UserManagement';
import ActivityLogs from './pages/Admin/ActivityLogs';
import NotFound from './pages/NotFound';

function App() {
  const { user } = useAuth();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      
      {/* Protected routes */}
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
      
      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;