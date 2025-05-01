import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/authService';

const MLEngineerDashboard = () => {
  const [stats, setStats] = useState({
    totalModels: 0,
    activeModels: 0,
    totalPredictions: 0,
    accuracyRate: 0,
    overrideRate: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [modelsResponse, predictionsResponse] = await Promise.all([
          apiClient.get('/ml/models/'),
          apiClient.get('/ml/predictions/')
        ]);

        const models = modelsResponse.data.results || modelsResponse.data;
        const predictions = predictionsResponse.data.results || predictionsResponse.data;

        // Calculate stats
        const activeModels = models.filter(model => model.is_active);
        const overriddenPredictions = predictions.filter(pred => pred.was_overridden);

        setStats({
          totalModels: models.length,
          activeModels: activeModels.length,
          totalPredictions: predictions.length,
          accuracyRate: calculateAccuracyRate(predictions),
          overrideRate: (overriddenPredictions.length / predictions.length) * 100 || 0,
          recentActivity: predictions.slice(0, 5) // Last 5 predictions
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const calculateAccuracyRate = (predictions) => {
    if (!predictions.length) return 0;
    const accuratePredictions = predictions.filter(
      pred => pred.output_data?.predicted_outcome === pred.actual_outcome
    );
    return (accuratePredictions.length / predictions.length) * 100;
  };

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

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Models Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Models</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {loading ? '...' : stats.totalModels}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      {loading ? '' : `${stats.activeModels} active`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/ml-models" className="font-medium text-indigo-600 hover:text-indigo-500">
                View all models
              </Link>
            </div>
          </div>
        </div>

        {/* Predictions Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Model Accuracy</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {loading ? '...' : `${stats.accuracyRate.toFixed(1)}%`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/ml-engineer/performance" className="font-medium text-indigo-600 hover:text-indigo-500">
                View performance metrics
              </Link>
            </div>
          </div>
        </div>

        {/* Override Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Override Rate</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {loading ? '...' : `${stats.overrideRate.toFixed(1)}%`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/ml-engineer/analytics" className="font-medium text-indigo-600 hover:text-indigo-500">
                Analyze overrides
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/ml-models" className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700">
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

        <Link to="/user-interactions" className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700">
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

        <Link to="/ml-engineer/fairness" className="relative group bg-white dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-700">
          <div>
            <span className="rounded-lg inline-flex p-3 bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 ring-4 ring-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v-4m6 0h-2m-6 0H6v4m0-11v-4m6 0h-2" />
              </svg>
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Fairness Monitoring
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Monitor and analyze model fairness metrics
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Recent Activity</h3>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="animate-pulse p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              ))}
            </div>
          ) : stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((activity, idx) => (
              <li key={idx} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-900 dark:text-white">
                    Model prediction for claim #{activity.id}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Status: {activity.status}
                  {activity.was_overridden && " (Overridden)"}
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-4 sm:px-6 text-center text-gray-500 dark:text-gray-400">
              No recent activity found
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MLEngineerDashboard;