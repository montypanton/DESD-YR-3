import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/authService';
import { message } from 'antd';
import LoadingSpinner from '../../components/LoadingSpinner';

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0
  });
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
      
      const predictedTotal = claimsData.reduce((sum, claim) => {
        return sum + (claim.ml_prediction?.settlement_amount || 0);
      }, 0);
      
      setStats({
        totalClaims: claimsData.length,
        approvedClaims: claimsData.filter(claim => claim.status === 'APPROVED').length,
        rejectedClaims: claimsData.filter(claim => claim.status === 'REJECTED').length
      });
      
      setTotalPredicted(predictedTotal);
    } catch (error) {
      console.error('Error fetching claims:', error);
      message.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const rerunPrediction = async (claimId) => {
    try {
      setRerunningClaims(prev => ({ ...prev, [claimId]: true }));
      
      // First get active model to ensure we have one
      const modelResponse = await apiClient.get('/ml/models/');
      const activeModel = modelResponse.data.find(model => model.is_active);
      
      if (!activeModel) {
        message.error('No active model available for prediction');
        return;
      }

      // Run the prediction
      const response = await apiClient.post(`/claims/${claimId}/rerun_prediction/`);
      
      if (response.data) {
        setPredictions(prevPredictions => 
          prevPredictions.map(claim => 
            claim.id === claimId 
              ? { 
                  ...claim, 
                  ml_prediction: response.data.prediction 
                }
              : claim
          )
        );
        message.success('Prediction re-run successfully');
        await fetchClaims(); // Refresh all data
      }
    } catch (error) {
      console.error('Error re-running prediction:', error);
      message.error(error.response?.data?.error || 'Failed to re-run prediction');
    } finally {
      setRerunningClaims(prev => ({ ...prev, [claimId]: false }));
    }
  };

  const filteredPredictions = predictions.filter(claim => {
    if (activeTab === 'approved' && claim.status !== 'APPROVED') return false;
    if (activeTab === 'rejected' && claim.status !== 'REJECTED') return false;
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
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Claims</h3>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalClaims}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Approved Claims</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approvedClaims}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Rejected Claims</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejectedClaims}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Predicted</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">£{totalPredicted.toFixed(2)}</p>
          </div>
        </div>

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
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Rejected
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
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Predicted Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Confidence
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    claim.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : claim.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {claim.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  £{claim.ml_prediction?.settlement_amount?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {(claim.ml_prediction?.confidence_score * 100).toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-4">
                  <button
                    onClick={() => rerunPrediction(claim.id)}
                    disabled={rerunningClaims[claim.id]}
                    className={`text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ${
                      rerunningClaims[claim.id] ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {rerunningClaims[claim.id] ? 'Running...' : 'Re-run Prediction'}
                  </button>
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