import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/authService';
import { message } from 'antd';
import LoadingSpinner from '../../components/LoadingSpinner';

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPredicted, setTotalPredicted] = useState(0);
  const [rerunningClaims, setRerunningClaims] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/claims/');
      console.log('Claims response:', response.data);
      
      const claimsData = response.data.results || response.data;
      setPredictions(claimsData);
      
      // Ensure we're adding up numeric values and defaulting to 0 for missing values
      const predictedTotal = claimsData.reduce((sum, claim) => {
        const amount = claim.ml_prediction?.settlement_amount;
        // Check if amount is a valid number
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);
      setTotalPredicted(predictedTotal);
    } catch (error) {
      console.error('Error fetching claims:', error);
      message.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const filteredPredictions = predictions.filter(claim => {
    if (activeTab === 'completed' && claim.status !== 'COMPLETED') return false;
    if (activeTab === 'pending' && claim.status !== 'PENDING') return false;
    
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        claim.reference_number.toLowerCase().includes(searchLower) ||
        claim.user?.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Prediction History</h1>
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Search by reference or email..."
            className="px-4 py-2 border border-gray-300 rounded-md w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reference
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Settlement Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPredictions.map((claim) => (
              <tr key={claim.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {claim.reference_number}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {claim.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    claim.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : claim.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : claim.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {claim.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {claim.decided_settlement_amount !== null && claim.decided_settlement_amount !== undefined ? (
                    <div>
                      <div className="flex items-center">
                        <span className="line-through mr-1">
                          £{typeof claim.ml_prediction?.settlement_amount === 'number' 
                            ? claim.ml_prediction.settlement_amount.toFixed(2) 
                            : typeof claim.ml_prediction?.settlement_amount === 'string'
                            ? parseFloat(claim.ml_prediction.settlement_amount).toFixed(2)
                            : '0.00'}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          £{typeof claim.decided_settlement_amount === 'number'
                            ? claim.decided_settlement_amount.toFixed(2)
                            : typeof claim.decided_settlement_amount === 'string'
                            ? parseFloat(claim.decided_settlement_amount).toFixed(2)
                            : '0.00'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 italic">Adjusted</div>
                    </div>
                  ) : (
                    <span>
                      £{typeof claim.ml_prediction?.settlement_amount === 'number' 
                        ? claim.ml_prediction.settlement_amount.toFixed(2) 
                        : typeof claim.ml_prediction?.settlement_amount === 'string'
                        ? parseFloat(claim.ml_prediction.settlement_amount).toFixed(2)
                        : '0.00'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link 
                    to={`/claims/${claim.id}`} 
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionHistory;