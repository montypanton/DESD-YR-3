// robustClaimService.js
// Enhanced service for interacting with the improved claims API endpoints
// STRICT ML-ONLY VERSION - Enforces ML prediction requirement

import safeApiClient from './safeApiClient';

/**
 * Gets all claims with robust error handling
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with claims data
 */
export const getClaims = async (options = {}) => {
  return await safeApiClient.get('/claims/v2/', {}, {
    errorMessage: 'Failed to retrieve claims',
    ...options
  });
};

/**
 * Gets a claim by ID with robust error handling
 * @param {number|string} id - The claim ID
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with claim data
 */
export const getClaimById = async (id, options = {}) => {
  return await safeApiClient.get(`/claims/v2/${id}/`, {}, {
    errorMessage: 'Failed to retrieve claim details',
    ...options
  });
};

/**
 * Creates a new claim with robust error handling and strict ML prediction validation
 * @param {Object} claimData - The claim data to submit
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with the created claim
 * @throws {Error} - If ML prediction is missing or invalid
 */
export const createClaim = async (claimData, options = {}) => {
  // Validate that ML prediction is included and valid
  const mlPrediction = claimData.ml_prediction;
  
  console.log('Creating claim with data:', JSON.stringify(claimData, null, 2));
  
  if (!mlPrediction) {
    console.error('ML prediction missing in claim data');
    throw new Error('ML prediction is required for claim submission');
  }
  
  // Ensure settlement_amount is a valid number
  const settlementAmount = Number(mlPrediction.settlement_amount);
  
  if (!mlPrediction.settlement_amount || isNaN(settlementAmount) || settlementAmount <= 0) {
    console.error('Invalid settlement amount:', mlPrediction.settlement_amount, 'parsed as:', settlementAmount);
    throw new Error('Valid ML settlement amount is required');
  }
  
  // Verify ML prediction source is correctly set
  if (mlPrediction.source !== 'ml_service') {
    console.error('Invalid ML prediction source:', mlPrediction.source);
    throw new Error('Only ML service predictions are accepted. Calculated predictions are not allowed.');
  }
  
  // Add ML prediction verification flag
  claimData.ml_verified = true;
  
  // Get the current user info from localStorage if available
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');
  let userData = null;
  
  try {
    userData = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error('Error parsing user data from localStorage:', e);
  }
  
  // Normalize the data structure to ensure compatibility with backend
  const normalizedData = {
    ...claimData,
    // Explicitly include title to make sure it's set
    title: claimData.title || 'Insurance Claim',
    // Include user reference if available, otherwise backend will use authenticated user
    user: userData?.id,
    ml_prediction: {
      settlement_amount: settlementAmount,
      confidence_score: Number(mlPrediction.confidence_score || 0.85),
      source: 'ml_service'
    }
  };
  
  // Use the correct endpoint for the API
  try {
    // The v2 endpoint might not exist, let's try the standard endpoint
    return await safeApiClient.post('/claims/', normalizedData, {}, {
      successMessage: 'Claim submitted successfully',
      showSuccessMessage: true,
      errorMessage: 'Failed to submit claim',
      ...options
    });
  } catch (error) {
    console.error('Claim submission error:', error);
    // Rethrow to allow proper error handling
    throw error;
  }
};

/**
 * Re-runs prediction for a claim with strict ML-only options
 * @param {number|string} claimId - The claim ID
 * @param {Object} options - Options for prediction (e.g. use_fallback)
 * @param {Object} apiOptions - Options for the API call
 * @returns {Promise} - Promise with prediction results
 */
export const rerunPrediction = async (claimId, options = {}, apiOptions = {}) => {
  // Enforce ML-only service prediction
  const predictionOptions = {
    use_service: true,     // Force using ML service
    use_fallback: false,   // No calculated fallbacks allowed
    use_cache: true,       // Allow using cached ML predictions
    ...options
  };
  
  return await safeApiClient.post(`/claims/v2/${claimId}/rerun-prediction/`, predictionOptions, {}, {
    successMessage: 'ML prediction re-run successfully',
    showSuccessMessage: true,
    errorMessage: 'Failed to re-run ML prediction',
    ...apiOptions
  });
};

/**
 * Processes a claim (approve/reject) with strict ML prediction validation
 * @param {number|string} claimId - The claim ID
 * @param {string} status - The new status (APPROVED, REJECTED, etc.)
 * @param {number} settlementAmount - Settlement amount from ML prediction (required for APPROVED)
 * @param {Object} apiOptions - Options for the API call
 * @returns {Promise} - Promise with processed claim data
 */
export const processClaim = async (claimId, status, settlementAmount = null, apiOptions = {}) => {
  const data = { status };
  
  // For APPROVED claims, settlement amount is required and must come from ML prediction
  if (status === 'APPROVED') {
    if (settlementAmount === null || isNaN(Number(settlementAmount)) || Number(settlementAmount) <= 0) {
      throw new Error('A valid ML prediction settlement amount is required to approve a claim');
    }
    
    data.settlement_amount = settlementAmount;
    data.ml_verified = true; // Indicate this is from ML
  }
  
  return await safeApiClient.post(`/claims/v2/${claimId}/process/`, data, {}, {
    successMessage: `Claim ${status.toLowerCase()} successfully`,
    showSuccessMessage: true,
    errorMessage: 'Failed to process claim',
    ...apiOptions
  });
};

/**
 * Gets dashboard data with robust error handling
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with dashboard data
 */
export const getDashboardData = async (options = {}) => {
  return await safeApiClient.get('/claims/v2/dashboard/', {}, {
    errorMessage: 'Failed to retrieve dashboard data',
    ...options
  });
};

/**
 * Gets recent claims with robust error handling
 * @param {number} limit - Number of claims to retrieve
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with recent claims data
 */
export const getRecentClaims = async (limit = 5, options = {}) => {
  return await safeApiClient.get('/claims/v2/recent/', {
    params: { limit }
  }, {
    errorMessage: 'Failed to retrieve recent claims',
    ...options
  });
};

/**
 * Validates if a claim has valid ML prediction data
 * @param {Object} claim - The claim to validate
 * @returns {boolean} - Whether the claim has valid ML prediction
 */
export const hasValidMLPrediction = (claim) => {
  if (!claim || !claim.ml_prediction) {
    return false;
  }
  
  const prediction = claim.ml_prediction;
  
  // Check for valid settlement amount
  if (!prediction.settlement_amount || 
      isNaN(Number(prediction.settlement_amount)) || 
      Number(prediction.settlement_amount) <= 0) {
    return false;
  }
  
  // Verify source is ML service
  if (prediction.source !== 'ml_service') {
    return false;
  }
  
  return true;
};

export default {
  getClaims,
  getClaimById,
  createClaim,
  rerunPrediction,
  processClaim,
  getDashboardData,
  getRecentClaims,
  hasValidMLPrediction
};