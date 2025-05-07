/**
 * apiClient.js - Unified API client for making HTTP requests
 * Consolidates functionality from safeApiClient and robustApiClient
 */

import axios from 'axios';
import { notification } from 'antd';

// API base URL from environment or default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Create axios instance with defaults and interceptors
 */
const createApiClient = (baseURL) => {
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
      // Debug the request
      console.log('Making API request to:', config.url);
      
      // Add authorization header to every request
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
        console.log('Added auth token to request');
      } else {
        console.log('No auth token found in localStorage');
      }
      
      // For ML endpoints, always add the token to the request body as well
      if (config.url.includes('/ml/') && config.data && typeof config.data === 'object') {
        config.data.auth_token = token;
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
    (response) => response,
    (error) => {
      console.error('Response error:', error);
      return Promise.reject(error);
    }
  );

  return client;
};

// Create the enhanced API client
const axiosClient = createApiClient(API_BASE_URL);

/**
 * Extract meaningful error message from error object
 */
const extractErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data;
    
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    
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

/**
 * Extract data from response with path support
 */
const extractData = (responseData, dataPath = null, defaultValue = null) => {
  if (!responseData) return defaultValue;
  
  // If no dataPath specified, return the whole response
  if (!dataPath) return responseData;
  
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

/**
 * Make an API request with standardized error handling
 */
const request = async (method, url, data = null, options = {}) => {
  const {
    params,
    headers,
    showSuccessMessage = false,
    showErrorMessage = true,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    dataPath,
    defaultValue,
    timeout
  } = options;

  const config = {
    method,
    url: url.startsWith('http') ? url : url,
    headers: { ...headers },
    params
  };

  if (data) {
    config.data = data;
  }

  if (timeout) {
    config.timeout = timeout;
  }

  try {
    const response = await axiosClient(config);

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
    
    // Return data based on dataPath if specified
    return dataPath ? extractData(response.data, dataPath, defaultValue) : response.data;
  } catch (error) {
    const errorMsg = errorMessage || extractErrorMessage(error);
    
    // Show error notification unless disabled
    if (showErrorMessage) {
      notification.error({
        message: 'Error',
        description: errorMsg,
        placement: 'topRight',
        duration: 5
      });
    }
    
    // Call error handler if provided
    if (typeof onError === 'function') {
      onError(error, errorMsg);
    }
    
    throw error;
  }
};

const apiClient = {
  /**
   * Make a GET request
   */
  get: (url, options = {}) => request('get', url, null, options),
  
  /**
   * Make a POST request
   */
  post: (url, data = {}, options = {}) => request('post', url, data, options),
  
  /**
   * Make a PUT request
   */
  put: (url, data = {}, options = {}) => request('put', url, data, options),
  
  /**
   * Make a PATCH request
   */
  patch: (url, data = {}, options = {}) => request('patch', url, data, options),
  
  /**
   * Make a DELETE request
   */
  delete: (url, options = {}) => request('delete', url, null, options),
  
  /**
   * Upload a file using FormData
   */
  upload: (url, formData, options = {}) => {
    const uploadOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'multipart/form-data'
      }
    };
    
    return request('post', url, formData, uploadOptions);
  },

  // Base URL for reference
  baseURL: API_BASE_URL
};

export default apiClient;