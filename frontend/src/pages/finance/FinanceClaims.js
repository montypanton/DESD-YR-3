import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllClaims, getClaimsByStatus, exportClaims } from '../../services/financeService';

const FinanceClaims = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [claims, setClaims] = useState({
    pending: [],
    approved: [],
    rejected: [],
    processed: []
  });
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

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        let response;

        const statusMap = {
          'pending': 'PENDING',
          'approved': 'APPROVED',
          'rejected': 'REJECTED',
          'processed': 'PROCESSED'
        };

        if (activeTab === 'all') {
          response = await getAllClaims();
          const allClaims = response.data.results || response.data || [];
          const sortedClaims = {
            pending: allClaims.filter(claim => claim.status === 'PENDING'),
            approved: allClaims.filter(claim => claim.status === 'APPROVED'),
            rejected: allClaims.filter(claim => claim.status === 'REJECTED'),
            processed: allClaims.filter(claim => claim.status === 'PROCESSED')
          };
          setClaims(sortedClaims);
        } else {
          response = await getClaimsByStatus(statusMap[activeTab]);
          let fetchedClaims = response.data.results || response.data || [];

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
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
                Filter Claims
              </button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
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

      {showFilters && (
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
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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
                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'pending'
                ? 'border-green-500 text-green-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Review ({claims.pending.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'approved'
                ? 'border-green-500 text-green-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Approved ({claims.approved.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'rejected'
                ? 'border-green-500 text-green-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rejected ({claims.rejected.length})
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'processed'
                ? 'border-green-500 text-green-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Processed ({claims.processed.length})
          </button>
        </nav>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : claims[activeTab].length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        checked={selectedClaims.length > 0 && selectedClaims.length === claims[activeTab].length}
                        onChange={selectAllVisible}
                      />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Employee
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
                {claims[activeTab].map((claim) => (
                  <tr key={claim.id || claim.reference_number}>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          checked={selectedClaims.includes(claim.id)}
                          onChange={() => toggleClaimSelection(claim.id)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {claim.reference_number || claim.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {claim.user?.email || (claim.user ? `${claim.user.first_name} ${claim.user.last_name}` : 'Unknown')}
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
                            to={`/finance/claims/${claim.id}`}
                            className="text-green-600 hover:text-green-700"
                          >
                            Review
                          </Link>
                        </div>
                      ) : (
                        <Link
                          to={`/finance/claims/${claim.id}`}
                          className="text-green-600 hover:text-green-700"
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
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

export default FinanceClaims;