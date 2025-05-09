import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/authService';

const MLEngineerDashboard = () => {
  // State management simplified as stats sections were removed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Data fetching simplified as stats sections were removed
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Accuracy rate calculation removed as no longer needed

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">ML Engineer Dashboard</h1>
          <p className="mt-2 text-indigo-100">
            Monitor and manage machine learning models and their performance
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - Removed as requested */}

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/ml-engineer/model-management" className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700">
          <div>
            <span className="rounded-lg inline-flex p-3 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 ring-4 ring-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Upload New Model
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add a new machine learning model to the platform
            </p>
          </div>
        </Link>

        <Link to="/ml-engineer/user-interactions" className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700">
          <div>
            <span className="rounded-lg inline-flex p-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 ring-4 ring-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              User Interactions
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              View detailed end-user interaction data
            </p>
          </div>
        </Link>

        <Link to="/ml-engineer/model-performance" className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700">
          <div>
            <span className="rounded-lg inline-flex p-3 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 ring-4 ring-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Model Performance
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              View detailed model performance metrics
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Activity section removed as requested */}
    </div>
  );
};

export default MLEngineerDashboard;