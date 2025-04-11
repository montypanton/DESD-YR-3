import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/authService';

// Utility function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Component for Recent Claims
const RecentClaimsList = ({ claims, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 h-16 rounded"></div>
        ))}
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 dark:text-gray-400">No claims submitted yet.</p>
        <Link to="/submit-claim" className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center">
          Submit your first claim
          <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <div key={claim.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{claim.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(claim.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                claim.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                claim.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {claim.status}
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Amount: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(claim.amount)}
              </span>
            </div>
            <Link 
              to={`/claims/${claim.id}`} 
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
      
      <div className="text-center pt-2">
        <Link 
          to="/predictions" 
          className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
        >
          View All Claims
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    total_claims: 0,
    approved_claims: 0,
    rejected_claims: 0,
    pending_claims: 0,
    total_claimed: 0,
    approved_settlements: 0,
    recent_claims: []
  });
  const [statisticsData, setStatisticsData] = useState({
    monthly_claims: [],
    status_distribution: [],
    avg_processing_time: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardResponse = await apiClient.get('/claims/dashboard/');
        setDashboardData(dashboardResponse.data);
        
        try {
          const statsResponse = await apiClient.get('/claims/statistics/');
          setStatisticsData(statsResponse.data);
        } catch (statsError) {
          console.warn('Could not load statistics data:', statsError);
          // Don't set the error state here to avoid blocking the whole dashboard
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Render status distribution chart using CSS instead of recharts
  const renderStatusChart = () => {
    if (loading) {
      return <div className="h-64 flex items-center justify-center">Loading chart...</div>;
    }
    
    const data = [
      { name: 'Approved', value: dashboardData.approved_claims, color: '#10B981' },
      { name: 'Rejected', value: dashboardData.rejected_claims, color: '#EF4444' },
      { name: 'Pending', value: dashboardData.pending_claims, color: '#F59E0B' },
    ];
    
    // Only show chart if we have claims
    if (dashboardData.total_claims === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No claims data available</p>
        </div>
      );
    }

    // Simple bar chart using CSS
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div className="h-64 flex flex-col justify-center">
        {data.map((item, index) => (
          item.value > 0 && (
            <div key={index} className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div 
                  className="h-4 rounded-full" 
                  style={{ 
                    width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                    backgroundColor: item.color
                  }}
                ></div>
              </div>
            </div>
          )
        ))}
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Total Claims: {total}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user?.first_name || 'User'}!
          </h1>
          <p className="mt-2 text-blue-100 text-lg">
            Insurance Claims Dashboard
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500 bg-opacity-10">
              <svg className="h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Total Claims</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  dashboardData.total_claims
                )}
              </p>
            </div>
          </div>
          <Link to="/predictions" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center mt-4">
            View all claims
            <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-500 bg-opacity-10">
              <svg className="h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Approved Claims</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  dashboardData.approved_claims
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-500 bg-opacity-10">
              <svg className="h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rejected Claims</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  dashboardData.rejected_claims
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content - Two columns on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Claims by Status</h2>
          {renderStatusChart()}
        </div>

        {/* Financial summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Financial Summary</h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-300">Total Claimed</span>
                <span className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(dashboardData.total_claimed)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900 bg-opacity-50 rounded-lg">
                <span className="text-green-600 dark:text-green-300">Approved Settlements</span>
                <span className="text-xl font-semibold text-green-700 dark:text-green-200">
                  {formatCurrency(dashboardData.approved_settlements)}
                </span>
              </div>
              
              {dashboardData.total_claimed > 0 && (
                <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900 bg-opacity-50 rounded-lg">
                  <span className="text-indigo-600 dark:text-indigo-300">Approval Rate</span>
                  <span className="text-xl font-semibold text-indigo-700 dark:text-indigo-200">
                    {dashboardData.total_claims > 0 ? 
                      `${((dashboardData.approved_claims / dashboardData.total_claims) * 100).toFixed(1)}%` : 
                      'N/A'}
                  </span>
                </div>
              )}
              
              {statisticsData.avg_processing_time > 0 && (
                <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900 bg-opacity-50 rounded-lg">
                  <span className="text-yellow-600 dark:text-yellow-300">Avg. Processing Time</span>
                  <span className="text-xl font-semibold text-yellow-700 dark:text-yellow-200">
                    {statisticsData.avg_processing_time.toFixed(1)} days
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Claims */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Claims</h2>
        <RecentClaimsList claims={dashboardData.recent_claims} loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/submit-claim" className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Submit New Claim</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">File an insurance claim for processing</p>
            </div>
          </Link>
          
          <Link to="/predictions" className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">View Claims</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Check status of your existing claims</p>
            </div>
          </Link>
        </div>
      </div>

      {/* How to Submit a Claim */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            How to Submit a Claim
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                  <span className="text-lg font-bold">1</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Start a New Claim</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Click the "Submit New Claim" button to begin the claims process. You'll need to provide details about the incident.
                </p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                  <span className="text-lg font-bold">2</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Describe the Incident</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Provide a clear and detailed description of what happened. Include when, where, and how the incident occurred, along with any relevant details.
                </p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                  <span className="text-lg font-bold">3</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Wait for Assessment</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Our system will analyze your claim and provide an initial assessment. You may be asked to provide additional information if needed.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 text-center">
          <Link
            to="/submit-claim"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit a Claim Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;