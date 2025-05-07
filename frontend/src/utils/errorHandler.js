/**
 * errorHandler.js - Standard error handling utilities
 */

import { notification } from 'antd';

/**
 * Format an error for display or logging
 * @param {Error|Object} error - The error to format
 * @returns {Object} Formatted error with message and details
 */
export const formatError = (error) => {
  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      details: null
    };
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      details: error.stack
    };
  }
  
  // Handle API response errors (from axios/fetch)
  if (error.response) {
    const { status, data } = error.response;
    let message = 'An error occurred';
    let details = null;
    
    // Extract message from different response formats
    if (data) {
      if (data.detail) message = data.detail;
      else if (data.message) message = data.message;
      else if (data.error) message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      else if (data.non_field_errors && Array.isArray(data.non_field_errors)) message = data.non_field_errors[0];
      
      // For field validation errors like Django REST Framework
      if (typeof data === 'object' && data !== null) {
        const fieldErrors = [];
        for (const key in data) {
          if (Array.isArray(data[key])) {
            fieldErrors.push(`${key}: ${data[key][0]}`);
          }
        }
        if (fieldErrors.length > 0) {
          details = fieldErrors.join(', ');
        }
      }
    }
    
    return {
      message,
      details,
      status,
      originalData: data
    };
  }
  
  // Handle network errors
  if (error.request) {
    return {
      message: 'Network error. Please check your connection.',
      details: 'The request was made but no response was received'
    };
  }
  
  // Handle validation errors
  if (error.validationErrors) {
    const fieldErrors = Object.entries(error.validationErrors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(', ');
      
    return {
      message: 'Validation error',
      details: fieldErrors
    };
  }
  
  // Handle unknown error formats
  return {
    message: error.message || 'An unexpected error occurred',
    details: error.details || JSON.stringify(error)
  };
};

/**
 * Show an error notification to the user
 * @param {Error|Object} error - The error to display
 * @param {Object} options - Options for the notification
 */
export const showErrorNotification = (error, options = {}) => {
  const formattedError = formatError(error);
  
  notification.error({
    message: options.title || 'Error',
    description: formattedError.message,
    placement: options.placement || 'topRight',
    duration: options.duration || 5,
    ...options
  });
  
  return formattedError;
};

/**
 * Handle an error consistently with logging and notification
 * @param {Error|Object} error - The error to handle
 * @param {Object} options - Options for error handling
 * @returns {Object} Formatted error result
 */
export const handleError = (error, options = {}) => {
  const formattedError = formatError(error);
  
  // Log the error
  if (options.log !== false) {
    console.error('Error:', formattedError.message, formattedError.details || '', error);
  }
  
  // Show notification if enabled
  if (options.notify !== false) {
    showErrorNotification(formattedError, options.notification);
  }
  
  // Call custom handler if provided
  if (typeof options.onError === 'function') {
    options.onError(formattedError, error);
  }
  
  return formattedError;
};

/**
 * Wrap a function with standard error handling
 * @param {Function} fn - The function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function with error handling
 */
export const withErrorHandling = (fn, options = {}) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const result = handleError(error, options);
      
      // Re-throw by default unless suppressed
      if (options.rethrow !== false) {
        throw result;
      }
      
      // Return error result if not re-throwing
      return { 
        error: result,
        success: false 
      };
    }
  };
};

export default {
  formatError,
  showErrorNotification,
  handleError,
  withErrorHandling
};