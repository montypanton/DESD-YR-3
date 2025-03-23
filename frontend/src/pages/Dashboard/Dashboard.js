// Displays the user dashboard with prediction stats, activity logs (for admins), and available ML models

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/authService';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    predictions: [],
    predictionCount: 0,
    recentActivity: [],
    mlModels: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const predictionsResponse = await apiClient.get('/ml/predictions/my_predictions/');
        
        let activityLogs = [];
        if (user.role === 'ADMIN') {
          const activityResponse = await apiClient.get('/account/activity-logs/');
          activityLogs = activityResponse.data.results;
        }
        
        let mlModels = [];
        const mlModelsResponse = await apiClient.get('/ml/models/');
        mlModels = mlModelsResponse.data.results || [];
        
        setStats({
          predictions: predictionsResponse.data.results || [],
          predictionCount: predictionsResponse.data.count || 0,
          recentActivity: activityLogs,
          mlModels: mlModels
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user.first_name || user.email}!</h1>
        <p className="text-gray-600">
          Here's an overview of your ML platform activity.
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Predictions</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.predictionCount}</p>
          <p className="text-sm text-gray-500 mt-1">Total predictions made</p>
          <Link to="/predictions" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
            View all predictions →
          </Link>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Available Models</h2>
          <p className="text-3xl font-bold text-green-600">{stats.mlModels.length}</p>
          <p className="text-sm text-gray-500 mt-1">ML models ready to use</p>
          {user.role === 'ML_ENGINEER' || user.role === 'ADMIN' ? (
            <Link to="/ml-models" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
              Manage models →
            </Link>
          ) : (
            <Link to="/predictions" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
              Run prediction →
            </Link>
          )}
        </div>
        
        {user.role === 'ADMIN' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">User Activity</h2>
            <p className="text-3xl font-bold text-purple-600">{stats.recentActivity.length}</p>
            <p className="text-sm text-gray-500 mt-1">Recent activities logged</p>
            <Link to="/admin/activity-logs" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
              View activity logs →
            </Link>
          </div>
        )}
        
        {user.role === 'FINANCE' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Billing</h2>
            <p className="text-3xl font-bold text-yellow-600">Finance</p>
            <p className="text-sm text-gray-500 mt-1">Access billing records</p>
            <Link to="/finance" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
              View finance dashboard →
            </Link>
          </div>
        )}
      </div>
      
      {/* Recent Predictions */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Predictions</h2>
        
        {stats.predictions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.predictions.slice(0, 5).map((prediction) => (
                  <tr key={prediction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{prediction.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prediction.model?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${prediction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          prediction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {prediction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prediction.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/predictions/${prediction.id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">
            No predictions made yet. 
            <Link to="/predictions" className="ml-1 text-blue-600 hover:text-blue-800">
              Run your first prediction
            </Link>
          </div>
        )}
        
        {stats.predictions.length > 5 && (
          <div className="mt-4 text-right">
            <Link to="/predictions" className="text-sm text-blue-600 hover:text-blue-800">
              View all predictions →
            </Link>
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            to="/predictions" 
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Run Prediction</h3>
              <p className="text-sm text-gray-500">Use ML models for predictions</p>
            </div>
          </Link>
          
          <Link 
            to="/profile" 
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Profile</h3>
              <p className="text-sm text-gray-500">View and edit your profile</p>
            </div>
          </Link>
          
          {user.role === 'ML_ENGINEER' && (
            <Link 
              to="/ml-models" 
              className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Model</h3>
                <p className="text-sm text-gray-500">Upload new ML models</p>
              </div>
            </Link>
          )}
          
          {user.role === 'ADMIN' && (
            <Link 
              to="/admin/users" 
              className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Users</h3>
                <p className="text-sm text-gray-500">Add, edit or deactivate users</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;