// mlService.js
// Enhanced service for interacting with the ML service API
import safeApiClient from './safeApiClient';

/**
 * Gets ML service health status
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with ML service health data
 */
export const getServiceHealth = async (options = {}) => {
  return await safeApiClient.get('/ml/service/', {}, {
    errorMessage: 'Failed to retrieve ML service status',
    ...options
  });
};

/**
 * Gets available ML models
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with ML models data
 */
export const getModels = async (options = {}) => {
  return await safeApiClient.get('/ml/models/', {}, {
    errorMessage: 'Failed to retrieve ML models',
    ...options
  });
};

/**
 * Makes a prediction with robust error handling and fallback options
 * @param {Object} inputData - Input data for prediction
 * @param {Object} predictionOptions - Options for prediction (e.g., use_fallback, use_service)
 * @param {Object} apiOptions - Options for the API call
 * @returns {Promise} - Promise with prediction results
 */
export const makePrediction = async (inputData, predictionOptions = {}, apiOptions = {}) => {
  const data = {
    input_data: inputData,
    ...predictionOptions
  };
  
  // Always use the ML service through its direct endpoint
  try {
    // First try the ML service endpoint directly
    const response = await safeApiClient.post('/ml/models/predict/', data, {}, {
      errorMessage: 'Failed to make prediction with ML service',
      showErrorMessage: false, // Don't show error message immediately
      ...apiOptions
    });
    console.log('ML service prediction successful', response.data);
    return response;
  } catch (error) {
    console.log('Primary ML service endpoint failed, trying robust endpoint');
    
    // Try the robust endpoint as a first fallback
    try {
      const response = await safeApiClient.post('/ml/predict/robust/', data, {}, {
        errorMessage: 'Failed to make prediction with robust endpoint',
        showErrorMessage: false,
        ...apiOptions
      });
      console.log('Robust prediction successful', response.data);
      return response;
    } catch (robustError) {
      console.log('Robust endpoint failed, trying standard prediction endpoint');
      
      // Finally fall back to the standard prediction endpoint
      return await safeApiClient.post('/claims/predict/', data, {}, {
        errorMessage: 'Failed to make prediction with any service',
        ...apiOptions
      });
    }
  }
};

/**
 * Gets prediction history
 * @param {number} limit - Number of predictions to retrieve
 * @param {Object} options - Options for the API call
 * @returns {Promise} - Promise with prediction history data
 */
export const getPredictionHistory = async (limit = 10, options = {}) => {
  return await safeApiClient.get('/ml/predictions/', {
    params: { limit }
  }, {
    errorMessage: 'Failed to retrieve prediction history',
    ...options
  });
};

export default {
  getServiceHealth,
  getModels,
  makePrediction,
  getPredictionHistory
};