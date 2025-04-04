import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/authService';
import ClaimForm from '../../components/Claims/ClaimForm';

const ClaimsPage = () => {
  const { user } = useAuth();
  const [userClaims, setUserClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserClaims = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/claims/claims/user_claims/');
        setUserClaims(response.data.results || response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching user claims:', error);
        setError('Failed to load your claims. Please try again later.');
        setUserClaims([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserClaims();
  }, []);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Claims</h1>
        <p className="text-gray-600">Submit and manage your insurance claims</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClaimForm />
        </div>

        <div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">My Claims</h2>
            {userClaims.length > 0 ? (
              <div className="space-y-4">
                {userClaims.map((claim) => (
                  <div key={claim.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          claim.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          claim.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {claim.status}
                        </span>
                        <h3 className="text-sm font-medium mt-2">{claim.injuryType} Injury</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted: {new Date(claim.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">£{claim.settlementValue || 'Pending'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">You haven't submitted any claims yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimsPage;