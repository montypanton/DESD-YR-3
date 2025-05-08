import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getAllClaims,
  getFinanceSummary,
  getRecentClaims,
  getBillableClaims
} from '../../services/financeService';

const FinanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    totalClaimsValue: 0,
    pendingCount: 0,
    avgProcessingTime: 0,
    pendingChange: 0,
    valueChange: 0,
    processingTimeChange: 0
  });
  const [recentClaims, setRecentClaims] = useState([]);
  const [billableClaims, setBillableClaims] = useState([]);

  // Fetch data when component mounts
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [summaryResponse, recentResponse, billableResponse] = await Promise.all([
          getFinanceSummary(),
          getRecentClaims(5), // Get 5 most recent claims
          getBillableClaims() // Get billable claims per company/month
        ]);
        
        // Process summary data
        const summaryData = summaryResponse.data;
        
        // Use the updated API response fields from our improved backend
        setSummaryStats({
          totalClaimsValue: summaryData.total_claimed || 0,
          pendingCount: summaryData.pending_claims || 0,
          avgProcessingTime: summaryData.avg_processing_days || 0,
          pendingChange: calculatePercentChange(
            summaryData.previous_pending || 0, 
            summaryData.pending_claims || 0
          ),
          valueChange: calculatePercentChange(
            summaryData.previous_total || 0, 
            summaryData.total_claimed || 0
          ),
          processingTimeChange: summaryData.avg_processing_days - (summaryData.previous_avg_days || 0)
        });
        
        // Process recent claims data - handle potential different data structures
        const recentClaimsData = recentResponse.data.results || recentResponse.data || [];
        setRecentClaims(recentClaimsData);
        
        // Process billable claims data
        const billableClaimsData = billableResponse.data.results || billableResponse.data || [];
        setBillableClaims(billableClaimsData);
        
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

  // Helper function to calculate percent change
  const calculatePercentChange = (previous, current) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Custom date formatter without date-fns
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      // Add leading zero to day if needed
      const formattedDay = day < 10 ? `0${day}` : day;
      
      return `${month} ${formattedDay}, ${year}`;
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to determine status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PROCESSING':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'PENDING':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  // Handle generate invoice button
  const handleGenerateInvoice = () => {
    window.location.href = '/finance/invoices/new';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
        <div className="flex items-center space-x-3">
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            onClick={handleGenerateInvoice}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Generate Invoice
          </button>
          <Link to="/finance/invoices" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
            </svg>
            Billing Service
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 dark:bg-red-900 dark:text-red-100">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase mb-2">Total Claims Value</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">£{summaryStats.totalClaimsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {summaryStats.valueChange !== 0 && (
              <span className={`ml-2 text-sm font-medium ${parseFloat(summaryStats.valueChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryStats.valueChange > 0 ? '+' : ''}{summaryStats.valueChange}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">From last month</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase mb-2">Auto-Approved Claims</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{summaryStats.approved_claims || 0}</span>
            <span className="ml-2 text-sm font-medium text-green-600">100%</span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">All claims are automatically approved</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase mb-2">Average Processing Time</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{summaryStats.avgProcessingTime} days</span>
            {summaryStats.processingTimeChange !== 0 && (
              <span className={`ml-2 text-sm font-medium ${parseFloat(summaryStats.processingTimeChange) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryStats.processingTimeChange > 0 ? '+' : ''}{summaryStats.processingTimeChange} days
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{parseFloat(summaryStats.processingTimeChange) <= 0 ? 'Improved' : 'Increased'} since last quarter</p>
        </div>
      </div>

      {/* Billing Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Company Billing</h2>
          <Link to="/finance/billing-rates" className="text-green-600 hover:text-green-700 text-sm font-medium">
            Manage rates
          </Link>
        </div>
        
        {billableClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Month
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Claims
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Billable Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {billableClaims.slice(0, 5).map((billing, index) => (
                  <tr key={`${billing.company_id}-${billing.month}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {billing.company_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {billing.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {billing.claim_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      £{typeof billing.rate_per_claim === 'number' ? billing.rate_per_claim.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      £{typeof billing.billable_amount === 'number' ? billing.billable_amount.toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No billable claims found.
          </div>
        )}
      </div>

      {/* Recent Claims */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Claims</h2>
          <Link to="/finance/claims" className="text-green-600 hover:text-green-700 text-sm font-medium">
            View all claims
          </Link>
        </div>
        
        {recentClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentClaims.map((claim) => (
                  <tr key={claim.id || claim.reference_number}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {claim.reference_number || claim.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {claim.insurance_company?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {claim.title || (claim.claim_data?.incidentType || 'General Claim')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      £{parseFloat(claim.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(claim.status)}`}>
                        {claim.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatDate(claim.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/finance/claims/${claim.id}`} className="text-green-600 hover:text-green-700">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No recent claims found.
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceDashboard;