import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllClaims, getClaimsByStatus } from '../../services/financeService';

const FinanceClaims = () => {
  const [activeTab, setActiveTab] = useState('all'); // Show all claims by default
  const [claims, setClaims] = useState({
    all: [],
    pending: [],
    approved: [],
    rejected: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        let response;

        const statusMap = {
          'pending': 'PENDING',
          'approved': 'APPROVED',
          'rejected': 'REJECTED',
          'all': ''  // Empty string to fetch all claims
        };
        
        if (activeTab === 'all') {
          response = await getAllClaims();
          let allClaims = [];
          if (response.data) {
            if (Array.isArray(response.data)) {
              allClaims = response.data;
            } else if (response.data.results && Array.isArray(response.data.results)) {
              allClaims = response.data.results;
            } else if (typeof response.data === 'object') {
              const possibleArrayProps = Object.keys(response.data).filter(key => 
                Array.isArray(response.data[key])
              );
              
              if (possibleArrayProps.length > 0) {
                allClaims = response.data[possibleArrayProps[0]];
              }
            }
          }
          
          setClaims({
            all: allClaims,
            pending: [],
            approved: [],
            rejected: []
          });
        } else {
          response = await getClaimsByStatus(statusMap[activeTab]);
          
          let fetchedClaims = [];
          if (response.data) {
            if (Array.isArray(response.data)) {
              fetchedClaims = response.data;
            } else if (response.data.results && Array.isArray(response.data.results)) {
              fetchedClaims = response.data.results;
            } else if (typeof response.data === 'object') {
              const possibleArrayProps = Object.keys(response.data).filter(key => 
                Array.isArray(response.data[key])
              );
              
              if (possibleArrayProps.length > 0) {
                fetchedClaims = response.data[possibleArrayProps[0]];
              }
            }
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
  }, [activeTab]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Claims Management</h1>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 dark:bg-red-900 dark:text-red-100">
          <p>{error}</p>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex flex-wrap" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-6 text-sm font-medium ${
              activeTab === 'all'
                ? 'border-green-500 text-green-600 border-b-2'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Claims ({claims.all.length})
          </button>
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
                    Predicted Settlement
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
                {claims[activeTab].map((claim) => (
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
                      £{parseFloat(claim.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {claim.ml_prediction?.settlement_amount ? (
                        <div className="flex items-center">
                          £{parseFloat(claim.ml_prediction.settlement_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatDate(claim.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {activeTab === 'pending' ? (
                        <Link
                          to={`/finance/claims/${claim.id}`}
                          className="text-green-600 hover:text-green-700"
                        >
                          Review
                        </Link>
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