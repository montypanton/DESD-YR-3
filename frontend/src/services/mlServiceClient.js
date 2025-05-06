// Production ML service client without fallbacks or mocks
import axios from 'axios';

// Create a dedicated axios instance for ML service
const mlServiceAxios = axios.create({
  timeout: 20000, // 20 second timeout for ML processing
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': process.env.REACT_APP_ML_API_KEY || 'default-dev-key'
  }
});

// ML service base URL from environment variable
const ML_SERVICE_URL = process.env.REACT_APP_ML_SERVICE_URL || 'http://localhost:8001';

/**
 * Make a direct prediction using the ML model
 * @param {Object} inputData The claim data for prediction
 * @returns {Promise} The prediction result
 */
export const predictWithModel = async (inputData) => {
  try {
    // Prepare request data with minimal cache-busting
    const requestData = {
      input_data: inputData,
      model_name: 'random_forest_model',
      request_id: `req_${Date.now()}`
    };
    
    // Try service URL with fallback for Docker networking
    const url = `${ML_SERVICE_URL}/api/v1/predict`;
    const response = await mlServiceAxios.post(
      url, 
      requestData,
      {
        timeout: 30000, // 30 second timeout
        headers: {
          'Cache-Control': 'no-cache',
          'X-Request-ID': `req_${Date.now()}`
        }
      }
    );

    // Standardize the response format
    return {
      data: {
        prediction: response.data.prediction || {
          settlement_amount: response.data.settlement_amount,
          confidence_score: response.data.confidence_score
        }
      },
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    // Create a standardized error object
    throw {
      message: `ML service error: ${error.message || 'Unknown error'}`,
      status: error.response?.status,
      code: 'ML_SERVICE_ERROR'
    };
  }
};

/**
 * Get available ML models
 * @returns {Promise} List of available models
 */
export const getAvailableModels = async () => {
  try {
    const response = await mlServiceAxios.get(`${ML_SERVICE_URL}/api/v1/models`);
    return response.data;
  } catch (error) {
    console.error('Error fetching available models:', error);
    throw error;
  }
};

export default {
  predictWithModel,
  getAvailableModels
};