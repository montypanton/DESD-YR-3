import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getAllClaims, 
  getClaimsByStatus, 
  exportClaims, 
  getUsageAnalytics, 
  getBillingRates,
  getBillableClaims
} from '../../services/financeService';
import { apiClient } from '../../services/authService';

const AdminClaims = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [claims, setClaims] = useState({
    pending: [],
    approved: [],
    rejected: [],
    processed: [],
    billable: [] // New tab for billable activity
  });
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    claimType: '',
    confidenceScore: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // New state for billing data
  const [billingRecords, setBillingRecords] = useState([]);
  const [billingRates, setBillingRates] = useState([]);
  const [usageMetrics, setUsageMetrics] = useState({
    totalBilled: 0,
    averagePerClaim: 0,
    claimsProcessed: 0,
    mlUsageCount: 0
  });
  const [billingSummary, setBillingSummary] = useState({
    byCompany: [],
    byUser: [],
    byMonth: []
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Fetching users for lookup...');
        const response = await apiClient.get('/account/users/');
        const usersList = response.data.results || response.data;
        console.log('Users API response:', response.data);

        const usersMap = {};
        usersList.forEach(user => {
          usersMap[user.id] = user;
        });

        console.log('Created users map with keys:', Object.keys(usersMap));
        console.log('Sample user data:', usersMap[Object.keys(usersMap)[0]]);

        setUsers(usersMap);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        console.log('Fetching claims for tab:', activeTab);

        let response;

        const statusMap = {
          'pending': 'PENDING',
          'approved': 'APPROVED',
          'rejected': 'REJECTED',
          'processed': 'PROCESSED'
        };

        if (activeTab === 'all') {
          response = await getAllClaims();
          console.log('All claims API response:', response.data);

          const allClaims = response.data.results || response.data || [];
          console.log('Processing all claims, total count:', allClaims.length);

          const sortedClaims = {
            pending: allClaims.filter(claim => claim.status === 'PENDING'),
            approved: allClaims.filter(claim => claim.status === 'APPROVED'),
            rejected: allClaims.filter(claim => claim.status === 'REJECTED'),
            processed: allClaims.filter(claim => claim.status === 'PROCESSED')
          };
          setClaims(sortedClaims);

          Object.keys(sortedClaims).forEach(key => {
            console.log(`${key} claims:`, sortedClaims[key].length);
          });
        } else {
          response = await getClaimsByStatus(statusMap[activeTab]);
          console.log(`${activeTab} claims API response:`, response.data);

          let fetchedClaims = response.data.results || response.data || [];
          console.log('Fetched claims before filtering:', fetchedClaims.length);

          console.log('User IDs from claims:', fetchedClaims.map(claim => {
            const userId = typeof claim.user === 'object' ? claim.user?.id : claim.user;
            return {
              claimId: claim.id,
              userId: userId,
              userObject: claim.user
            };
          }));

          if (filters.dateFrom) {
            fetchedClaims = fetchedClaims.filter(claim =>
              new Date(claim.created_at) >= new Date(filters.dateFrom)
            );
          }

          if (filters.dateTo) {
            fetchedClaims = fetchedClaims.filter(claim =>
              new Date(claim.created_at) <= new Date(filters.dateTo)
            );
          }

          if (filters.claimType) {
            fetchedClaims = fetchedClaims.filter(claim =>
              claim.title?.toLowerCase().includes(filters.claimType.toLowerCase()) ||
              claim.description?.toLowerCase().includes(filters.claimType.toLowerCase())
            );
          }

          if (filters.confidenceScore > 0) {
            fetchedClaims = fetchedClaims.filter(claim =>
              claim.ml_prediction &&
              claim.ml_prediction.confidence_score >= (filters.confidenceScore / 100)
            );
          }

          console.log('Fetched claims after filtering:', fetchedClaims.length);

          setClaims(prevClaims => ({
            ...prevClaims,
            [activeTab]: fetchedClaims
          }));
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching claims:', err);
        setError('Failed to load claims. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, [activeTab, filters]);
  
  // New effect for fetching billing data when the filters change
  useEffect(() => {
    if (activeTab === 'billable') {
      fetchBillingData();
    }
  }, [activeTab, filters]);
  
  // Function to fetch billing data
  const fetchBillingData = async () => {
    try {
      setLoading(true);
      console.log('Fetching billing data with filters:', filters);
      
      // Prepare filter parameters
      const params = {};
      if (filters.dateFrom) {
        params.from_date = filters.dateFrom;
        params.date_from = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.to_date = filters.dateTo;
        params.date_to = filters.dateTo;
      }
      
      // Fetch billing records, rates, usage metrics, and company users in parallel
      const [billableResponse, ratesResponse, usageResponse, companyUsersResponse] = await Promise.all([
        getBillableClaims(params),
        getBillingRates(),
        getUsageAnalytics(params),
        apiClient.get('/finance/company-users/', { params })
      ]);
      
      console.log('Billable claims response:', billableResponse.data);
      console.log('Billing rates response:', ratesResponse.data);
      console.log('Usage analytics response:', usageResponse.data);
      console.log('Company users response:', companyUsersResponse.data);
      
      // Process billable claims data
      const billableClaims = billableResponse.data || [];
      setBillingRecords(billableClaims);
      
      // Get real claims data from the billing claims response
      const claimsData = [];
      
      // Process each billable record and extract the claim info
      billableClaims.forEach(record => {
        // Find or create a claim object from the billing data
        // This will vary based on your API response structure
        const claim = {
          id: record.id || record.company_id,
          reference_number: record.month || 'Unknown', 
          user: { 
            id: record.company_id,
            email: record.company_name 
          },
          title: `${record.claim_count} Claims`,
          description: `Rate: $${record.rate_per_claim} per claim`,
          amount: record.billable_amount || 0,
          created_at: new Date(),
          ml_prediction: {
            settlement_amount: record.total_settlement_amount || 0,
            confidence_score: 1.0
          }
        };
        
        claimsData.push(claim);
      });
      
      // Update claims state with billable claims for the table view
      setClaims(prevClaims => ({
        ...prevClaims,
        billable: claimsData
      }));
      
      // Set billing rates
      setBillingRates(ratesResponse.data || []);
      
      // Calculate usage metrics
      const usageData = usageResponse.data || [];
      
      // Extract metrics from billing data
      let totalBilled = 0;
      let totalClaims = 0;
      let totalML = 0;
      
      billableClaims.forEach(record => {
        totalBilled += parseFloat(record.billable_amount || 0);
        totalClaims += parseInt(record.claim_count || 0);
      });
      
      // Get ML predictions count from usage data
      usageData.forEach(item => {
        // This depends on the structure of your usage analytics data
        if (item.claims_count) totalML += parseInt(item.claims_count);
        // Add any prediction counts from the API
        if (item.approved_claims) totalML += parseInt(item.approved_claims);
      });
      
      // Update usage metrics state
      setUsageMetrics({
        totalBilled: totalBilled,
        averagePerClaim: totalClaims > 0 ? totalBilled / totalClaims : 0,
        claimsProcessed: totalClaims,
        mlUsageCount: totalML || totalClaims // Fallback to claims count if ML count isn't available
      });
      
      // Generate summary data from the billing claims
      // By Company
      const companySummary = {};
      billableClaims.forEach(record => {
        const companyId = record.company_id || 'unknown';
        if (!companySummary[companyId]) {
          companySummary[companyId] = {
            id: companyId,
            name: record.company_name || 'Unknown Company',
            count: 0,
            amount: 0
          };
        }
        companySummary[companyId].count += parseInt(record.claim_count || 0);
        companySummary[companyId].amount += parseFloat(record.billable_amount || 0);
      });
      
      // By User - use the company users data
      const userSummary = {};
      if (companyUsersResponse.data && Array.isArray(companyUsersResponse.data)) {
        companyUsersResponse.data.forEach(user => {
          const userId = user.id || 'unknown';
          userSummary[userId] = {
            id: userId,
            name: user.email || user.full_name || 'Unknown User',
            count: user.approved_claims_count || 0,
            amount: (user.rate_per_claim * user.approved_claims_count) || 0
          };
        });
      }
      
      // By Month - extract from billable claims if they have month data
      const monthSummary = {};
      billableClaims.forEach(record => {
        if (record.month) {
          const monthKey = record.month;
          const [year, month] = monthKey.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
          
          if (!monthSummary[monthKey]) {
            monthSummary[monthKey] = {
              key: monthKey,
              name: monthName,
              count: 0,
              amount: 0
            };
          }
          
          monthSummary[monthKey].count += parseInt(record.claim_count || 0);
          monthSummary[monthKey].amount += parseFloat(record.billable_amount || 0);
        }
      });
      
      // If we don't have any month data, create a default entry for the current month
      if (Object.keys(monthSummary).length === 0) {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Sum up all billing amounts for the current month
        let totalCount = 0;
        let totalAmount = 0;
        billableClaims.forEach(record => {
          totalCount += parseInt(record.claim_count || 0);
          totalAmount += parseFloat(record.billable_amount || 0);
        });
        
        monthSummary[currentMonthKey] = {
          key: currentMonthKey,
          name: currentMonthName,
          count: totalCount,
          amount: totalAmount
        };
      }
      
      // Update billing summary state with the processed data
      setBillingSummary({
        byCompany: Object.values(companySummary).sort((a, b) => b.amount - a.amount),
        byUser: Object.values(userSummary).sort((a, b) => b.amount - a.amount),
        byMonth: Object.values(monthSummary).sort((a, b) => a.key.localeCompare(b.key))
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getUserInfo = (userId) => {
    console.log('getUserInfo called with userId:', userId, typeof userId);

    if (!userId) {
      console.log('No userId provided');
      return { fullName: 'Unknown', email: 'Unknown' };
    }

    const user = users[userId];
    console.log('Found user in map:', user);

    if (!user) {
      console.log('User not found in map for ID:', userId);
      console.log('Available userIds:', Object.keys(users));
      return { fullName: `Unknown (ID: ${userId})`, email: 'Unknown' };
    }

    const fullName = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email || 'Unknown';

    console.log('Returning user info:', { fullName, email: user.email });
    return {
      fullName,
      email: user.email || 'Unknown'
    };
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const formattedDay = day < 10 ? `0${day}` : day;
      return `${month} ${formattedDay}, ${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const toggleClaimSelection = (claimId) => {
    setSelectedClaims(prevSelected => {
      if (prevSelected.includes(claimId)) {
        return prevSelected.filter(id => id !== claimId);
      } else {
        return [...prevSelected, claimId];
      }
    });
  };

  const selectAllVisible = () => {
    const visibleClaimIds = claims[activeTab].map(claim => claim.id);
    if (selectedClaims.length === visibleClaimIds.length) {
      setSelectedClaims([]);
    } else {
      setSelectedClaims(visibleClaimIds);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const idsToExport = selectedClaims.length > 0
        ? selectedClaims
        : claims[activeTab].map(claim => claim.id);

      if (idsToExport.length === 0) {
        setError("No claims selected to export");
        setLoading(false);
        return;
      }

      const response = await exportClaims(exportFormat, idsToExport);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `claims-export-${Date.now()}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
      setShowExportOptions(false);
    } catch (err) {
      console.error('Error exporting claims:', err);
      setError('Failed to export claims. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      claimType: '',
      confidenceScore: 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Claims Management</h1>
        <div className="flex items-center space-x-3">
          {showExportOptions ? (
            <div className="flex items-center bg-white dark:bg-gray-800 p-2 rounded-md shadow-md">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="mr-2 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
              <button
                onClick={handleExport}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm"
              >
                Export
              </button>
              <button
                onClick={() => setShowExportOptions(false)}
                className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
                Filter Claims
              </button>
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => setShowExportOptions(true)}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export Claims Data
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 dark:bg-red-900 dark:text-red-100">
          <p>{error}</p>
        </div>
      )}

      {/* Standard Filters - For non-billable tabs */}
      {showFilters && activeTab !== 'billable' && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filter Claims</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Claim Type</label>
              <input
                type="text"
                name="claimType"
                value={filters.claimType}
                onChange={handleFilterChange}
                placeholder="e.g., Collision, Vehicle"
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min. Confidence Score: {filters.confidenceScore}%
              </label>
              <input
                type="range"
                name="confidenceScore"
                value={filters.confidenceScore}
                onChange={handleFilterChange}
                min="0"
                max="100"
                step="5"
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
            >
              Reset
            </button>
          </div>
        </div>
      )}
      
      {/* Billing Activity Date Range Filter - Always visible when on billable tab */}
      {activeTab === 'billable' && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Billing Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filters.dateFrom && filters.dateTo ? (
                <span>Showing billing data from {formatDate(filters.dateFrom)} to {formatDate(filters.dateTo)}</span>
              ) : filters.dateFrom ? (
                <span>Showing billing data from {formatDate(filters.dateFrom)} onwards</span>
              ) : filters.dateTo ? (
                <span>Showing billing data up to {formatDate(filters.dateTo)}</span>
              ) : (
                <span>Showing all billing data</span>
              )}
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
            >
              Reset Dates
            </button>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'pending'
                ? 'border-purple-500 text-purple-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Review ({claims.pending.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'approved'
                ? 'border-purple-500 text-purple-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Approved ({claims.approved.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'rejected'
                ? 'border-purple-500 text-purple-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rejected ({claims.rejected.length})
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'processed'
                ? 'border-purple-500 text-purple-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Processed ({claims.processed.length})
          </button>
          <button
            onClick={() => setActiveTab('billable')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'billable'
                ? 'border-purple-500 text-purple-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Billable Activity ({claims.billable?.length || 0})
          </button>
        </nav>
      </div>

      {/* Billing Summary - Only shown when billable tab is active */}
      {activeTab === 'billable' && !loading && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Billed Amount Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900 rounded-full p-3">
                <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Total Billed</h2>
                <p className="mt-1 text-2xl font-semibold text-gray-700 dark:text-gray-300">
                  ${usageMetrics.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Average Per Claim Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-full p-3">
                <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Avg. Per Claim</h2>
                <p className="mt-1 text-2xl font-semibold text-gray-700 dark:text-gray-300">
                  ${usageMetrics.averagePerClaim.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Claims Processed Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900 rounded-full p-3">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Claims Processed</h2>
                <p className="mt-1 text-2xl font-semibold text-gray-700 dark:text-gray-300">
                  {usageMetrics.claimsProcessed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* ML Usage Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">ML Predictions</h2>
                <p className="mt-1 text-2xl font-semibold text-gray-700 dark:text-gray-300">
                  {usageMetrics.mlUsageCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Billing Summary Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* By Company */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Billing by Company</h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Claims</th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {billingSummary.byCompany.map((company) => (
                    <tr key={company.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{company.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">{company.count}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                        ${company.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {billingSummary.byCompany.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* By User */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Billing by User</h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Claims</th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {billingSummary.byUser.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">{user.count}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                        ${user.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {billingSummary.byUser.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* By Month */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Billing by Month</h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Month</th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Claims</th>
                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {billingSummary.byMonth.map((month) => (
                    <tr key={month.key}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{month.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-300">{month.count}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                        ${month.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {billingSummary.byMonth.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : claims[activeTab]?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        checked={selectedClaims.length > 0 && selectedClaims.length === claims[activeTab].length}
                        onChange={selectAllVisible}
                      />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  {activeTab !== 'pending' && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Predicted Settlement
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {claims[activeTab].map((claim) => {
                  console.log('Rendering claim:', claim.id);
                  console.log('Claim user data:', claim.user);

                  const userId = typeof claim.user === 'object' ? claim.user?.id : claim.user;
                  console.log('Extracted userId:', userId, typeof userId);

                  const userInfo = getUserInfo(userId);
                  console.log('Retrieved userInfo:', userInfo);

                  return (
                    <tr key={claim.id || claim.reference_number}>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            checked={selectedClaims.includes(claim.id)}
                            onChange={() => toggleClaimSelection(claim.id)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {claim.reference_number || claim.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <div>
                          <div className="font-semibold">{userInfo.fullName}</div>
                          <div className="text-xs text-gray-400">{userInfo.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {claim.title || (claim.claim_data?.incidentType || 'General Claim')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                        {claim.description || claim.claim_data?.damageDescription || 'No description available'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${parseFloat(claim.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {activeTab !== 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {claim.ml_prediction?.settlement_amount ? (
                            <div className="flex items-center">
                              ${parseFloat(claim.ml_prediction.settlement_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span className="ml-1 text-xs text-gray-400">({(claim.ml_prediction.confidence_score * 100).toFixed(0)}% confidence)</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not available</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(claim.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {activeTab === 'pending' ? (
                          <div className="flex justify-end space-x-2">
                            <Link
                              to={`/admin/claims/${claim.id}`}
                              className="text-purple-600 hover:text-purple-700"
                            >
                              Review
                            </Link>
                          </div>
                        ) : (
                          <Link
                            to={`/admin/claims/${claim.id}`}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            View Details
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No claims found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No {activeTab} claims are available at this time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClaims;