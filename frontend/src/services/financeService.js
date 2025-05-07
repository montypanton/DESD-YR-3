// financeService.js - Handles API requests for Finance user functionality
import { apiClient } from './authService';
import axios from 'axios';

// Base URL for API requests
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Get all claims for finance dashboard
 * @returns {Promise} API response with claims data
 */
export const getAllClaims = async () => {
  try {
    console.log('Attempting to fetch claims from standard endpoint...');
    // First try the standard endpoint
    const response = await apiClient.get('/claims/');
    console.log('Successfully fetched claims:', response.data);
    return response;
  } catch (error) {
    console.error('Error fetching from standard endpoint:', error);
    console.log('Attempting fallback to finance-specific endpoint...');
    // If that fails, try the finance-specific endpoint
    try {
      const fallbackResponse = await apiClient.get('/finance/claims/');
      console.log('Successfully fetched claims from fallback:', fallbackResponse.data);
      return fallbackResponse;
    } catch (fallbackError) {
      console.error('Error fetching from finance endpoint:', fallbackError);
      // Re-throw the error to be handled by the caller
      throw fallbackError;
    }
  }
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
  try {
    // First try the dedicated recent claims endpoint
    return await apiClient.get(`/claims/recent/?limit=${limit}`);
  } catch (error) {
    // If that fails, get all claims and sort them client-side by date
    const response = await getAllClaims();
    
    // Extract claims from response
    const allClaims = response.data.results || response.data || [];
    
    // Sort claims by created_at date (newest first)
    const sortedClaims = [...allClaims].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    // Return only the requested number of claims
    const recentClaims = sortedClaims.slice(0, limit);
    
    // Format response to match expected structure
    return {
      data: recentClaims
    };
  }
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
 * @param {string} status - Status to filter by (PENDING, APPROVED, REJECTED, COMPLETED)
 * @returns {Promise} API response with filtered claims
 */
export const getClaimsByStatus = async (status) => {
  try {
    // Try first with status parameter
    if (status) {
      console.log(`Fetching claims with status: ${status}`);
      const response = await apiClient.get(`/claims/?status=${status}`);
      console.log(`Retrieved ${response.data?.length || 0} claims with status ${status}`);
      return response;
    } else {
      // If no status is provided, get all claims
      const response = await apiClient.get('/claims/');
      console.log(`Retrieved ${response.data?.length || 0} claims (all statuses)`);
      return response;
    }
  } catch (error) {
    console.error(`Error fetching claims with status ${status}:`, error.response?.status || 'unknown status', error.message);
    
    // If direct endpoint fails, try finance-specific endpoint
    try {
      if (status) {
        console.log(`Attempting fallback to finance endpoint with status: ${status}`);
        const fallbackResponse = await apiClient.get(`/finance/claims/?status=${status}`);
        console.log(`Retrieved ${fallbackResponse.data?.length || 0} claims from finance endpoint with status ${status}`);
        return fallbackResponse;
      } else {
        console.log(`Attempting fallback to finance endpoint for all claims`);
        const fallbackResponse = await apiClient.get('/finance/claims/');
        console.log(`Retrieved ${fallbackResponse.data?.length || 0} claims from finance endpoint (all statuses)`);
        return fallbackResponse;
      }
    } catch (fallbackError) {
      console.error(`Finance fallback also failed:`, fallbackError.response?.status || 'unknown status', fallbackError.message);
      throw fallbackError;
    }
  }
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

/* 
 * PUBLIC API METHODS (NO AUTHENTICATION REQUIRED)
 */

/**
 * Get all active insurance companies without authentication
 * @returns {Promise} API response with insurance companies data
 */
export const getPublicInsuranceCompanies = async () => {
  // Create a clean instance that doesn't include auth headers
  return await axios.get(`${API_BASE_URL}/finance/public/insurance-companies/`);
};

/* 
 * INSURANCE COMPANY API METHODS
 */

/**
 * Get all insurance companies
 * @param {Object} params - Query parameters for filtering and sorting
 * @returns {Promise} API response with insurance companies data
 */
export const getInsuranceCompanies = async (params = {}) => {
  return await apiClient.get('/finance/insurance-companies/', { params });
};

/**
 * Get a specific insurance company by ID
 * @param {number} id - Insurance company ID
 * @returns {Promise} API response with insurance company data
 */
export const getInsuranceCompany = async (id) => {
  return await apiClient.get(`/finance/insurance-companies/${id}/`);
};

/**
 * Create a new insurance company
 * @param {Object} companyData - Insurance company data
 * @returns {Promise} API response with created insurance company
 */
export const createInsuranceCompany = async (companyData) => {
  return await apiClient.post('/finance/insurance-companies/', companyData);
};

/**
 * Update an existing insurance company
 * @param {number} id - Insurance company ID
 * @param {Object} companyData - Updated insurance company data
 * @returns {Promise} API response with updated insurance company
 */
export const updateInsuranceCompany = async (id, companyData) => {
  return await apiClient.put(`/finance/insurance-companies/${id}/`, companyData);
};

/**
 * Delete an insurance company
 * @param {number} id - Insurance company ID
 * @returns {Promise} API response confirming deletion
 */
export const deleteInsuranceCompany = async (id) => {
  return await apiClient.delete(`/finance/insurance-companies/${id}/`);
};

/**
 * Get all billing records for a specific insurance company
 * @param {number} companyId - Insurance company ID
 * @returns {Promise} API response with billing records data
 */
export const getInsuranceCompanyBillingRecords = async (companyId) => {
  return await apiClient.get(`/finance/insurance-companies/${companyId}/billing_records/`);
};

/**
 * Get all invoices for a specific insurance company
 * @param {number} companyId - Insurance company ID
 * @returns {Promise} API response with invoices data
 */
export const getInsuranceCompanyInvoices = async (companyId) => {
  return await apiClient.get(`/finance/insurance-companies/${companyId}/invoices/`);
};

/* 
 * INVOICING API METHODS
 */

/**
 * Get all invoices
 * @param {Object} params - Query parameters for filtering and sorting
 * @returns {Promise} API response with invoices data
 */
export const getInvoices = async (params = {}) => {
  return await apiClient.get('/finance/invoices/', { params });
};

/**
 * Get a specific invoice by ID
 * @param {number} id - Invoice ID
 * @returns {Promise} API response with invoice data
 */
export const getInvoice = async (id) => {
  return await apiClient.get(`/finance/invoices/${id}/`);
};

/**
 * Create a new invoice
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise} API response with created invoice
 */
export const createInvoice = async (invoiceData) => {
  return await apiClient.post('/finance/invoices/', invoiceData);
};

/**
 * Update an existing invoice
 * @param {number} id - Invoice ID
 * @param {Object} invoiceData - Updated invoice data
 * @returns {Promise} API response with updated invoice
 */
export const updateInvoice = async (id, invoiceData) => {
  return await apiClient.put(`/finance/invoices/${id}/`, invoiceData);
};

/**
 * Delete an invoice
 * @param {number} id - Invoice ID
 * @returns {Promise} API response confirming deletion
 */
export const deleteInvoice = async (id) => {
  return await apiClient.delete(`/finance/invoices/${id}/`);
};

/**
 * Add billing records to an invoice
 * @param {number} invoiceId - Invoice ID
 * @param {Array} billingRecordIds - Array of billing record IDs to add to the invoice
 * @returns {Promise} API response confirming the addition
 */
export const addItemsToInvoice = async (invoiceId, billingRecordIds) => {
  return await apiClient.post(`/finance/invoices/${invoiceId}/add_items/`, {
    billing_record_ids: billingRecordIds
  });
};

/**
 * Generate a PDF invoice
 * @param {number} invoiceId - Invoice ID
 * @returns {Promise} API response confirming PDF generation
 */
export const generateInvoicePdf = async (invoiceId) => {
  return await apiClient.post(`/finance/invoices/${invoiceId}/generate_pdf/`);
};

/**
 * Send an invoice to the insurance company
 * @param {number} invoiceId - Invoice ID
 * @returns {Promise} API response confirming the invoice was sent
 */
export const sendInvoice = async (invoiceId) => {
  return await apiClient.post(`/finance/invoices/${invoiceId}/send_invoice/`);
};

/**
 * Mark an invoice as paid
 * @param {number} invoiceId - Invoice ID
 * @param {string} paidDate - Optional date when the invoice was paid
 * @returns {Promise} API response confirming the invoice was marked as paid
 */
export const markInvoiceAsPaid = async (invoiceId, paidDate = null) => {
  return await apiClient.post(`/finance/invoices/${invoiceId}/mark_as_paid/`, {
    paid_date: paidDate
  });
};

/**
 * Export an invoice as CSV
 * @param {number} invoiceId - Invoice ID
 * @returns {Promise} API response with CSV data
 */
export const exportInvoiceCsv = async (invoiceId) => {
  return await apiClient.get(`/finance/invoices/${invoiceId}/export_csv/`, {
    responseType: 'blob'
  });
};

/**
 * Get unbilled billing records (not added to any invoice yet)
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise} API response with unbilled billing records
 */
export const getUnbilledRecords = async (params = {}) => {
  return await apiClient.get('/finance/billing/unbilled/', { params });
};

/**
 * Get invoicing statistics
 * @returns {Promise} API response with invoicing statistics
 */
export const getInvoicingStats = async () => {
  return await apiClient.get('/finance/invoicing-stats/');
};

/**
 * Assign multiple billing records to an insurance company in bulk
 * @param {Array} recordIds - Array of billing record IDs
 * @param {number} insuranceCompanyId - Insurance company ID
 * @returns {Promise} API response confirming the assignment
 */
export const bulkAssignToCompany = async (recordIds, insuranceCompanyId) => {
  return await apiClient.post('/finance/billing/bulk_assign_to_company/', {
    record_ids: recordIds,
    insurance_company_id: insuranceCompanyId
  });
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
  processClaim,
  // Public API methods
  getPublicInsuranceCompanies,
  // Insurance company methods
  getInsuranceCompanies,
  getInsuranceCompany,
  createInsuranceCompany,
  updateInsuranceCompany,
  deleteInsuranceCompany,
  getInsuranceCompanyBillingRecords,
  getInsuranceCompanyInvoices,
  // Invoice methods
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addItemsToInvoice,
  generateInvoicePdf,
  sendInvoice,
  markInvoiceAsPaid,
  exportInvoiceCsv,
  getUnbilledRecords,
  getInvoicingStats,
  bulkAssignToCompany
};