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
  const [refreshing, setRefreshing] = useState(false);
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

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      // Don't show full loading state on refresh, just the refreshing indicator
      if (!refreshing) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // Use a single comprehensive API call first to get the most data
      try {
        const summaryResponse = await getFinanceSummary();
        const summaryData = summaryResponse.data;
        console.log('Finance summary data:', summaryData);
        
        // Check if the summary includes billable claims
        const billableClaimsData = summaryData.billable_claims || [];
        
        // Use the updated API response fields from our improved backend
        setSummaryStats({
          totalClaimsValue: summaryData.total_claimed || 0,
          pendingCount: summaryData.pending_claims || 0,
          avgProcessingTime: summaryData.avg_processing_days || 0,
          approved_claims: summaryData.approved_claims || 0,
          pendingChange: calculatePercentChange(
            summaryData.previous_pending || 0, 
            summaryData.pending_claims || 0
          ),
          valueChange: calculatePercentChange(
            summaryData.previous_total || 0, 
            summaryData.total_claimed || 0
          ),
          processingTimeChange: summaryData.avg_processing_days - (summaryData.previous_avg_days || 0),
          dataTimestamp: summaryData.data_timestamp ? new Date(summaryData.data_timestamp) : new Date()
        });
        
        // Use billing_by_company data if available
        if (summaryData.billing_by_company && summaryData.billing_by_company.length > 0) {
          // Transform billing_by_company data to match billable claims format if needed
          const transformedBillingData = summaryData.billing_by_company.map(item => ({
            company_id: item.insurance_company,
            company_name: item.insurance_company__name,
            month: item.month || new Date().toISOString().slice(0, 7),
            claim_count: item.records_count || 0,
            rate_per_claim: 0, // We don't have this in billing_by_company
            billable_amount: item.total_amount || 0
          }));
          
          setBillableClaims(transformedBillingData);
        }
        // If we have billable_claims data directly, use that
        else if (billableClaimsData.length > 0) {
          console.log('Using billable_claims data from summary response:', billableClaimsData);
          setBillableClaims(billableClaimsData);
        }
        
        // Use recent_claims from summary if available
        if (summaryData.recent_claims && summaryData.recent_claims.length > 0) {
          setRecentClaims(summaryData.recent_claims);
        } else {
          // Fall back to separate claims API call
          const recentResponse = await getRecentClaims(5);
          const recentClaimsData = recentResponse.data.results || recentResponse.data || [];
          setRecentClaims(recentClaimsData);
        }
        
        setError(null);
        
      } catch (summaryError) {
        console.error('Error fetching summary data, falling back to individual calls:', summaryError);
        
        // Fall back to individual API calls if the summary endpoint fails
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
        
        // Fetch data in parallel with explicit current month/year parameters
        const [recentResponse, billableResponse] = await Promise.all([
          getRecentClaims(5), // Get 5 most recent claims
          getBillableClaims({ year: currentYear, month: currentMonth }) // Get billable claims for current month
        ]);
        
        // Process recent claims data
        const recentClaimsData = recentResponse.data.results || recentResponse.data || [];
        setRecentClaims(recentClaimsData);
        
        // Process billable claims data
        const billableClaimsData = billableResponse.data.results || billableResponse.data || [];
        console.log('Received billable claims data from backup call:', billableClaimsData);
        setBillableClaims(billableClaimsData);
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Fetch data when component mounts and periodically refresh
  useEffect(() => {
    // Fetch immediately when component mounts
    fetchDashboardData();
    
    // Also set up a refresh interval (every 30 seconds)
    const refreshInterval = setInterval(fetchDashboardData, 30000);
    
    // Clean up the interval when component unmounts
    return () => clearInterval(refreshInterval);
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
            <span className="ml-2 text-sm font-medium text-green-600">
              {summaryStats.total_claims > 0 
                ? `${((summaryStats.approved_claims / summaryStats.total_claims) * 100).toFixed(0)}%` 
                : '100%'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(summaryStats.dataTimestamp || Date.now()).toLocaleTimeString()}
          </p>
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
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Company Billing</h2>
            {/* Refresh button */}
            <button 
              onClick={handleRefresh} 
              className="ml-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              disabled={refreshing}
              title="Refresh billing data"
            >
              <svg 
                className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
            {summaryStats.dataTimestamp && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                Updated: {new Date(summaryStats.dataTimestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
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
                {billableClaims.slice(0, 5).map((billing, index) => {
                  // Calculate billable amount if not explicitly provided
                  const displayRate = parseFloat(billing.rate_per_claim || 0);
                  const claimCount = parseInt(billing.claim_count || 0, 10);
                  const calculatedAmount = displayRate * claimCount;
                  const billableAmount = parseFloat(billing.billable_amount || billing.total_amount || calculatedAmount || 0);

                  return (
                    <tr key={`${billing.company_id || index}-${billing.month || 'current'}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {billing.company_name || billing.insurance_company__name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {billing.month || new Date().toISOString().slice(0, 7)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {billing.claim_count || billing.records_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        £{displayRate.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        £{billableAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {refreshing ? (
              <div className="flex justify-center items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-gray-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading billing data...
              </div>
            ) : (
              <div>
                <p>No billable claims found for the current month.</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-2 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                >
                  Refresh data
                </button>
              </div>
            )}
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