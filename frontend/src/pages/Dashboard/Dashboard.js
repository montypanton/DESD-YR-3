import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_predictions: 25,
    active_models: 8,
    recent_activity: 12
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg mb-8 p-8 text-white">
        <h1 className="text-3xl font-bold">Welcome back, {user?.first_name || 'User'}!</h1>
        <p className="text-blue-100 mt-2">Here's an overview of your ML Platform activities</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
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
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow-md rounded-xl transition-all hover:shadow-lg border border-gray-100">
          <div className="px-6 py-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-full p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Predictions</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats?.total_predictions || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <div className="text-sm">
              <Link to="/predictions" className="font-medium text-blue-600 hover:text-blue-500">View all predictions<span aria-hidden="true"> &rarr;</span></Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-md rounded-xl transition-all hover:shadow-lg border border-gray-100">
          <div className="px-6 py-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-full p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Available Models</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats?.active_models || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <div className="text-sm">
              <Link to="/ml-models" className="font-medium text-blue-600 hover:text-blue-500">View all models<span aria-hidden="true"> &rarr;</span></Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-md rounded-xl transition-all hover:shadow-lg border border-gray-100">
          <div className="px-6 py-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-full p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Recent Activity</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats?.recent_activity || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <div className="text-sm">
              {user?.role === 'ADMIN' && (
                <Link to="/admin/activity-logs" className="font-medium text-blue-600 hover:text-blue-500">View activity logs<span aria-hidden="true"> &rarr;</span></Link>
              )}
              {user?.role !== 'ADMIN' && (
                <span className="text-gray-500">Activity summary</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Quick Actions
      </h2>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/predictions" className="bg-white overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-all border border-gray-100 group">
          <div className="px-6 py-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-full p-3 group-hover:bg-blue-600 transition-colors">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Prediction History</h3>
                <p className="text-sm text-gray-500">View your past predictions and run new ones</p>
              </div>
            </div>
          </div>
        </Link>

        {(user?.role === 'ML_ENGINEER' || user?.role === 'ADMIN') && (
          <Link to="/ml-models" className="bg-white overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-all border border-gray-100 group">
            <div className="px-6 py-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-full p-3 group-hover:bg-indigo-600 transition-colors">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Manage Models</h3>
                  <p className="text-sm text-gray-500">Upload and manage ML models</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {user?.role === 'ADMIN' && (
          <Link to="/admin/users" className="bg-white overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-all border border-gray-100 group">
            <div className="px-6 py-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-full p-3 group-hover:bg-green-600 transition-colors">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600 transition-colors">Manage Users</h3>
                  <p className="text-sm text-gray-500">Add, edit or deactivate users</p>
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
      
      {/* Getting Started Section */}
      <div className="mt-10 bg-gray-50 shadow-sm rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold text-lg mb-3">1</div>
              <h3 className="text-md font-medium mb-2">Select a Model</h3>
              <p className="text-sm text-gray-500">Choose from our collection of trained models for your prediction tasks.</p>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold text-lg mb-3">2</div>
              <h3 className="text-md font-medium mb-2">Input Data</h3>
              <p className="text-sm text-gray-500">Provide your data in JSON format for the model to process.</p>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold text-lg mb-3">3</div>
              <h3 className="text-md font-medium mb-2">Get Results</h3>
              <p className="text-sm text-gray-500">View and analyze your prediction results instantly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;