// financeService.js - Handles API requests for Finance user functionality
import { apiClient } from './authService';

/**
 * Get all claims for finance dashboard
 * @returns {Promise} API response with claims data
 */
export const getAllClaims = async () => {
  // Use the claims endpoint from the claims app instead of finance-specific one
  return await apiClient.get('/claims/');
};

/**
 * Get financial summary statistics for dashboard
 * @returns {Promise} API response with summary data
 */
export const getFinanceSummary = async () => {
  // Use finance dashboard endpoint for financial data
  return await apiClient.get('/finance/dashboard/');
};

/**
 * Get recent claims for finance dashboard
 * @param {number} limit - Number of claims to return
 * @returns {Promise} API response with recent claims
 */
export const getRecentClaims = async (limit = 5) => {
  // Use the recent endpoint in the claims API that we just created
  return await apiClient.get(`/claims/recent/?limit=${limit}`);
};

/**
 * Flag a claim for financial review
 * @param {string} claimId - ID of the claim to flag
 * @param {Object} flagData - Data related to the flag (reason, priority, etc.)
 * @returns {Promise} API response confirming the flag was added
 */
export const flagClaim = async (claimId, flagData) => {
  // Use the claims endpoint directly instead of finance-specific endpoint
  return await apiClient.post(`/claims/${claimId}/flag/`, flagData);
};

/**
 * Add a comment to a claim
 * @param {string} claimId - ID of the claim to comment on
 * @param {Object} commentData - Comment data (text, etc.)
 * @returns {Promise} API response confirming comment was added
 */
export const addClaimComment = async (claimId, commentData) => {
  // Use the claims endpoint directly instead of finance-specific endpoint
  return await apiClient.post(`/claims/${claimId}/comment/`, commentData);
};

/**
 * Get claims filtered by status
 * @param {string} status - Status to filter by (PENDING, APPROVED, REJECTED)
 * @returns {Promise} API response with filtered claims
 */
export const getClaimsByStatus = async (status) => {
  return await apiClient.get(`/claims/?status=${status}`);
};

/**
 * Export claims data as CSV or PDF
 * @param {string} format - Format to export (csv or pdf)
 * @param {Array} claimIds - Optional array of claim IDs to export
 * @returns {Promise} API response with file data
 */
export const exportClaims = async (format, claimIds = null) => {
  // Use the claims endpoint directly instead of finance-specific endpoint
  const url = claimIds 
    ? `/claims/export/?format=${format}&ids=${claimIds.join(',')}`
    : `/claims/export/?format=${format}`;
  
  return await apiClient.get(url, { responseType: 'blob' });
};

/**
 * Get financial insights and aggregate data
 * @param {Object} params - Parameters for filtering data
 * @returns {Promise} API response with aggregated data
 */
export const getFinancialInsights = async (params = {}) => {
  // Use the statistics endpoint from claims
  return await apiClient.get('/claims/statistics/', { params });
};

/**
 * Process a claim (approve or reject)
 * @param {string} claimId - ID of the claim to process
 * @param {Object} actionData - Action data (status, notes, etc.)
 * @returns {Promise} API response confirming the action
 */
export const processClaim = async (claimId, actionData) => {
  // Use the claims endpoint directly instead of finance-specific endpoint
  return await apiClient.post(`/claims/${claimId}/process/`, actionData);
};

export default {
  getAllClaims,
  getFinanceSummary,
  getRecentClaims,
  flagClaim,
  addClaimComment,
  getClaimsByStatus,
  exportClaims,
  getFinancialInsights,
  processClaim
};