import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/authService';

const PredictionHistory = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0
  });
  
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/claims/');
        console.log('Claims response:', response.data);
        
        const claimsData = response.data.results || response.data;
        setPredictions(claimsData);
        
        setStats({
          totalClaims: claimsData.length,
          approvedClaims: claimsData.filter(claim => claim.status === 'APPROVED').length,
          rejectedClaims: claimsData.filter(claim => claim.status === 'REJECTED').length
        });
      } catch (error) {
        console.error('Error fetching claims:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchClaims();
  }, []);

  const filteredPredictions = predictions.filter(claim => {
    // Filter by tab
    if (activeTab === 'approved' && claim.status !== 'APPROVED') return false;
    if (activeTab === 'rejected' && claim.status !== 'REJECTED') return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (claim.reference_number?.toLowerCase().includes(query)) ||
        (claim.title?.toLowerCase().includes(query)) ||
        (claim.description?.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const exampleInputs = [
    {
      title: "Valid Claim Example",
      text: "I was in a car accident on March 15, 2023. The other driver ran a red light and hit my vehicle on the driver's side. I sustained injuries including whiplash and a broken arm. My car had significant damage to the driver's side door and front quarter panel. I have medical bills totaling $5,200 and repair costs of $3,800. I have all documentation including police report #23456 and medical records from City Hospital.",
      expectedResult: "This claim has a high probability of being approved based on the clear description of the accident, specific details about injuries and damages, and references to supporting documentation."
    },
    {
      title: "Potentially Fraudulent Claim Example",
      text: "I had an accident somewhere last month. My car got damaged and I think I hurt my back. I want compensation for this and need it quickly. The damage is extensive. I went to a doctor who said I'm injured. The car needs to be fixed or replaced.",
      expectedResult: "This claim raises several fraud flags due to vague details, lack of specific dates, no mention of documentation, and urgency for quick payment."
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Claims History</h1>
              <p className="mt-2 text-blue-100">View all your submitted insurance claims</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={() => setShowExampleModal(true)}
                className="inline-flex items-center px-4 py-2 border border-white text-sm font-medium rounded-md text-white hover:bg-blue-700 focus:outline-none"
              >
                View Examples
              </button>
              <Link 
                to="/submit-claim" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none"
              >
                Submit New Claim
              </Link>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
          <div className="p-4 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Claims</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{stats.totalClaims}</p>
          </div>
          
          <div className="p-4 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved Claims</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{stats.approvedClaims}</p>
          </div>
          
          <div className="p-4 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejected Claims</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{stats.rejectedClaims}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl p-4 transition-colors duration-200">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeTab === 'all' 
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              All Claims
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeTab === 'approved' 
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeTab === 'rejected' 
                  ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Rejected
            </button>
          </div>
          
          <div className="w-full sm:w-64">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search claims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {filteredPredictions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Claim ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date Submitted
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(claim.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {claim.description ? 
                            (claim.description.length > 50 ? 
                              `${claim.description.substring(0, 50)}...` : 
                              claim.description) : 
                            'No description provided'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            claim.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                            claim.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
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
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No claims found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                  {searchQuery 
                    ? "No claims match your search criteria. Try adjusting your filters." 
                    : activeTab !== 'all' 
                      ? `You don't have any ${activeTab} claims yet.`
                      : "You haven't submitted any insurance claims yet."}
                </p>
                <Link
                  to="/submit-claim"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Submit New Claim
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* How to Submit a Claim */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            How to Submit a Claim
          </h3>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mr-2">
                  <span className="text-lg font-bold">1</span>
                </div>
                <h4 className="font-medium">Describe the Incident</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Provide detailed information about what happened, including date, time, and location.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mr-2">
                  <span className="text-lg font-bold">2</span>
                </div>
                <h4 className="font-medium">Submit Documentation</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Include any relevant photos, police reports, medical records, or other evidence.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mr-2">
                  <span className="text-lg font-bold">3</span>
                </div>
                <h4 className="font-medium">Track Claim Status</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor your claim's processing status and respond to any requests for additional information.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Example Claims Modal */}
      {showExampleModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowExampleModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                      Example Claims
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Here are examples of claims that might be approved or rejected by our system.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 space-y-6">
                  {exampleInputs.map((example, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{example.title}</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {example.text}
                        </p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Analysis:</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {example.expectedResult}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowExampleModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Got It
                </button>
                <button
                  type="button"
                  onClick={() => setShowExampleModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionHistory;