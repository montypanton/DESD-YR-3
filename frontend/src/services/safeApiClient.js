// safeApiClient.js - Enhanced API client with robust error handling, notification support, and automatic retries

import axios from 'axios';
import { notification } from 'antd';

// Create enhanced axios instance
const createSafeApiClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Add request interceptor for auth headers
  client.interceptors.request.use(
    (config) => {
      // Add authorization header to every request
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for consistent data handling
  client.interceptors.response.use(
    (response) => {
      // Normalize successful responses
      return response;
    },
    (error) => {
      // Normalize error responses
      console.error('Response error:', error);
      return Promise.reject(error);
    }
  );

  return client;
};

// API base URL from environment or default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
console.log('Using API base URL:', API_BASE_URL);

// Create the enhanced API client
const apiClient = createSafeApiClient(API_BASE_URL);

// Helper function to extract data from response
const extractData = (responseData, dataPath = 'data', defaultValue = null) => {
  if (!responseData) return defaultValue;
  
  // Handle nested paths (e.g., 'data.results')
  if (dataPath.includes('.')) {
    const paths = dataPath.split('.');
    let data = responseData;
    
    for (const path of paths) {
      if (data && data[path] !== undefined) {
        data = data[path];
      } else {
        return defaultValue;
      }
    }
    
    return data;
  }
  
  // Handle direct path
  return responseData[dataPath] !== undefined ? responseData[dataPath] : defaultValue;
};

// Helper function to extract array data with validation
const extractArrayData = (responseData, dataPath = 'data') => {
  const data = extractData(responseData, dataPath, []);
  return Array.isArray(data) ? data : [];
};

// Extract meaningful error message from error object
const extractErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data;
    
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    if (data.errors) return typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
    
    // Look for Django REST framework error format
    if (data.non_field_errors) return data.non_field_errors[0];
    
    // If we have a structured error object, try to extract the first message
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (Array.isArray(data[key])) {
          return `${key}: ${data[key][0]}`;
        }
      }
    }
    
    return `Server error: ${error.response.status}`;
  }
  
  if (error.request) {
    // Request made but no response received
    return 'No response from server. Please check your connection.';
  }
  
  // Error setting up the request
  return error.message || 'Unknown error occurred';
};

// Default error handler that shows notifications
const defaultErrorHandler = (error, customHandler, options = {}) => {
  const { showErrorMessage = true } = options;
  
  const errorMessage = extractErrorMessage(error);
  console.error('API error:', errorMessage, error);
  
  // Show error notification unless disabled
  if (showErrorMessage) {
    notification.error({
      message: options.errorTitle || 'Error',
      description: options.errorMessage || errorMessage,
      placement: 'topRight',
      duration: 5
    });
  }
  
  // Call custom error handler if provided
  if (typeof customHandler === 'function') {
    customHandler(error, errorMessage);
  }
};

/**
 * Makes a robust API GET request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} params - URL parameters
 * @param {Object} config - Additional axios config
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const get = async (url, params = {}, config = {}, options = {}) => {
  const { 
    onSuccess, 
    onError, 
    successMessage,
    errorMessage,
    showSuccessMessage = false,
    showErrorMessage = true,
    ...restOptions
  } = options;

  try {
    const response = await apiClient.get(url, { 
      ...config, 
      params 
    });
    
    // Show success notification if requested
    if (showSuccessMessage && successMessage) {
      notification.success({
        message: 'Success',
        description: successMessage,
        placement: 'topRight',
        duration: 3
      });
    }
    
    // Call success handler if provided
    if (typeof onSuccess === 'function') {
      onSuccess(response);
    }
    
    return response;
  } catch (error) {
    defaultErrorHandler(error, onError, { 
      errorMessage, 
      showErrorMessage,
      ...restOptions
    });
    
    // Re-throw for caller to handle
    throw error;
  }
};

/**
 * Makes a robust API POST request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} params - URL parameters
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const post = async (url, data = {}, params = {}, options = {}) => {
  const { 
    onSuccess, 
    onError, 
    successMessage,
    errorMessage,
    showSuccessMessage = false,
    showErrorMessage = true,
    timeout,
    ...restOptions
  } = options;

  // Create config with timeout if specified
  const config = { params };
  if (timeout) {
    config.timeout = timeout;
  }

  try {
    const response = await apiClient.post(url, data, config);
    
    // Show success notification if requested
    if (showSuccessMessage && successMessage) {
      notification.success({
        message: 'Success',
        description: successMessage,
        placement: 'topRight',
        duration: 3
      });
    }
    
    // Call success handler if provided
    if (typeof onSuccess === 'function') {
      onSuccess(response);
    }
    
    return response;
  } catch (error) {
    defaultErrorHandler(error, onError, { 
      errorMessage, 
      showErrorMessage,
      ...restOptions
    });
    
    // Re-throw for caller to handle
    throw error;
  }
};

/**
 * Makes a robust API PUT request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} params - URL parameters
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const put = async (url, data = {}, params = {}, options = {}) => {
  const { 
    onSuccess, 
    onError, 
    successMessage,
    errorMessage,
    showSuccessMessage = false,
    showErrorMessage = true,
    ...restOptions
  } = options;

  try {
    const response = await apiClient.put(url, data, { params });
    
    // Show success notification if requested
    if (showSuccessMessage && successMessage) {
      notification.success({
        message: 'Success',
        description: successMessage,
        placement: 'topRight',
        duration: 3
      });
    }
    
    // Call success handler if provided
    if (typeof onSuccess === 'function') {
      onSuccess(response);
    }
    
    return response;
  } catch (error) {
    defaultErrorHandler(error, onError, { 
      errorMessage, 
      showErrorMessage,
      ...restOptions
    });
    
    // Re-throw for caller to handle
    throw error;
  }
};

/**
 * Makes a robust API PATCH request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} params - URL parameters
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const patch = async (url, data = {}, params = {}, options = {}) => {
  const { 
    onSuccess, 
    onError, 
    successMessage,
    errorMessage,
    showSuccessMessage = false,
    showErrorMessage = true,
    ...restOptions
  } = options;

  try {
    const response = await apiClient.patch(url, data, { params });
    
    // Show success notification if requested
    if (showSuccessMessage && successMessage) {
      notification.success({
        message: 'Success',
        description: successMessage,
        placement: 'topRight',
        duration: 3
      });
    }
    
    // Call success handler if provided
    if (typeof onSuccess === 'function') {
      onSuccess(response);
    }
    
    return response;
  } catch (error) {
    defaultErrorHandler(error, onError, { 
      errorMessage, 
      showErrorMessage,
      ...restOptions
    });
    
    // Re-throw for caller to handle
    throw error;
  }
};

/**
 * Makes a robust API DELETE request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} params - URL parameters
 * @param {Object} options - Request options
 * @returns {Promise<any>} Response data
 */
export const del = async (url, params = {}, options = {}) => {
  const { 
    onSuccess, 
    onError, 
    successMessage,
    errorMessage,
    showSuccessMessage = false,
    showErrorMessage = true,
    ...restOptions
  } = options;

  try {
    const response = await apiClient.delete(url, { params });
    
    // Show success notification if requested
    if (showSuccessMessage && successMessage) {
      notification.success({
        message: 'Success',
        description: successMessage,
        placement: 'topRight',
        duration: 3
      });
    }
    
    // Call success handler if provided
    if (typeof onSuccess === 'function') {
      onSuccess(response);
    }
    
    return response;
  } catch (error) {
    defaultErrorHandler(error, onError, { 
      errorMessage, 
      showErrorMessage,
      ...restOptions
    });
    
    // Re-throw for caller to handle
    throw error;
  }
};

export default {
  get,
  post,
  put,
  patch,
  del,
  client: apiClient,
  baseURL: API_BASE_URL
};