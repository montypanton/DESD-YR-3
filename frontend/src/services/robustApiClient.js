// robustApiClient.js - Enhanced API client with robust error handling and response normalization

import axios from 'axios';
import { 
  extractData, 
  extractArrayData, 
  defaultErrorHandler, 
  extractErrorMessage 
} from '../utils/apiUtils';
import { getAuthHeader } from './authService';

// Create enhanced axios instance
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
      // Add authorization header to every request
      const authHeader = getAuthHeader();
      if (authHeader) {
        config.headers.Authorization = authHeader;
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

// Create the enhanced API client
const apiClient = createApiClient(API_BASE_URL);

/**
 * Makes a robust API GET request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} options - Request options
 * @param {Object} options.params - URL parameters
 * @param {Function} options.onError - Custom error handler
 * @param {string} options.dataPath - Path to extract data from response
 * @param {any} options.defaultValue - Default value if data extraction fails
 * @returns {Promise<any>} Extracted data from response
 */
export const get = async (url, options = {}) => {
  const { 
    params, 
    onError, 
    dataPath = 'data', 
    defaultValue = [],
    requireArray = false
  } = options;

  try {
    const response = await apiClient.get(url, { params });
    
    return requireArray 
      ? extractArrayData(response.data, dataPath) 
      : extractData(response.data, dataPath, defaultValue);
  } catch (error) {
    defaultErrorHandler(error, onError);
    // Re-throw or return default based on options
    if (options.throwError) {
      throw error;
    }
    return defaultValue;
  }
};

/**
 * Makes a robust API POST request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} options - Request options
 * @returns {Promise<any>} Extracted data from response
 */
export const post = async (url, data = {}, options = {}) => {
  const { 
    onError, 
    dataPath = 'data', 
    defaultValue = null,
    config = {}
  } = options;

  try {
    const response = await apiClient.post(url, data, config);
    return extractData(response.data, dataPath, defaultValue);
  } catch (error) {
    defaultErrorHandler(error, onError);
    // Re-throw or return default based on options
    if (options.throwError) {
      throw error;
    }
    return defaultValue;
  }
};

/**
 * Makes a robust API PUT request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} options - Request options
 * @returns {Promise<any>} Extracted data from response
 */
export const put = async (url, data = {}, options = {}) => {
  const { 
    onError, 
    dataPath = 'data', 
    defaultValue = null,
    config = {}
  } = options;

  try {
    const response = await apiClient.put(url, data, config);
    return extractData(response.data, dataPath, defaultValue);
  } catch (error) {
    defaultErrorHandler(error, onError);
    // Re-throw or return default based on options
    if (options.throwError) {
      throw error;
    }
    return defaultValue;
  }
};

/**
 * Makes a robust API DELETE request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} options - Request options
 * @returns {Promise<any>} Extracted data from response
 */
export const del = async (url, options = {}) => {
  const { 
    onError, 
    dataPath = 'data', 
    defaultValue = null,
    config = {}
  } = options;

  try {
    const response = await apiClient.delete(url, config);
    return extractData(response.data, dataPath, defaultValue);
  } catch (error) {
    defaultErrorHandler(error, onError);
    // Re-throw or return default based on options
    if (options.throwError) {
      throw error;
    }
    return defaultValue;
  }
};

/**
 * Makes a robust API PATCH request with standardized error handling
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request payload
 * @param {Object} options - Request options
 * @returns {Promise<any>} Extracted data from response
 */
export const patch = async (url, data = {}, options = {}) => {
  const { 
    onError, 
    dataPath = 'data', 
    defaultValue = null,
    config = {}
  } = options;

  try {
    const response = await apiClient.patch(url, data, config);
    return extractData(response.data, dataPath, defaultValue);
  } catch (error) {
    defaultErrorHandler(error, onError);
    // Re-throw or return default based on options
    if (options.throwError) {
      throw error;
    }
    return defaultValue;
  }
};

export default {
  get,
  post,
  put,
  del,
  patch,
  client: apiClient,
  baseURL: API_BASE_URL
};