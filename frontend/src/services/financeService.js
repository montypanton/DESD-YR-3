// financeService.js - Handles API requests for Finance user functionality
import { apiClient } from './authService';
import axios from 'axios';
// Import the billing service integration
import { submitInvoiceToExternalService, checkInvoiceStatus, getPaymentMethods } from './billingServiceIntegration';

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
    const claimsCount = Array.isArray(response.data) ? response.data.length : 
                        (response.data?.results ? response.data.results.length : 'unknown');
    console.log(`Successfully fetched ${claimsCount} claims`);
    return response;
  } catch (error) {
    console.error('Error fetching from standard endpoint:', error);
    console.log('Attempting fallback to finance-specific endpoint...');
    // If that fails, try the finance-specific endpoint
    try {
      const fallbackResponse = await apiClient.get('/finance/claims/');
      const claimsCount = Array.isArray(fallbackResponse.data) ? fallbackResponse.data.length : 
                          (fallbackResponse.data?.results ? fallbackResponse.data.results.length : 'unknown');
      console.log(`Successfully fetched ${claimsCount} claims from fallback`);
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
 * Get billable claims per company and month
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise} API response with billable claims data
 */
export const getBillableClaims = async (params = {}) => {
  return await apiClient.get('/finance/billable-claims/', { params });
};

/**
 * Get users under each company with their usage costs
 * @param {Object} params - Query parameters for filtering
 * @returns {Promise} API response with company users data
 */
export const getCompanyUsers = async (params = {}) => {
  return await apiClient.get('/finance/company-users/', { params });
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
      
      // Log count based on response format
      const claimsCount = Array.isArray(response.data) ? response.data.length : 
                         (response.data?.results ? response.data.results.length : 'unknown');
      console.log(`Retrieved ${claimsCount} claims with status ${status}`);
      return response;
    } else {
      // If no status is provided, get all claims
      const response = await apiClient.get('/claims/');
      
      // Log count based on response format
      const claimsCount = Array.isArray(response.data) ? response.data.length : 
                         (response.data?.results ? response.data.results.length : 'unknown');
      console.log(`Retrieved ${claimsCount} claims (all statuses)`);
      return response;
    }
  } catch (error) {
    console.error(`Error fetching claims with status ${status}:`, error.response?.status || 'unknown status', error.message);
    
    // If direct endpoint fails, try finance-specific endpoint
    try {
      if (status) {
        console.log(`Attempting fallback to finance endpoint with status: ${status}`);
        const fallbackResponse = await apiClient.get(`/finance/claims/?status=${status}`);
        
        // Log count based on response format
        const claimsCount = Array.isArray(fallbackResponse.data) ? fallbackResponse.data.length : 
                           (fallbackResponse.data?.results ? fallbackResponse.data.results.length : 'unknown');
        console.log(`Retrieved ${claimsCount} claims from finance endpoint with status ${status}`);
        return fallbackResponse;
      } else {
        console.log(`Attempting fallback to finance endpoint for all claims`);
        const fallbackResponse = await apiClient.get('/finance/claims/');
        
        // Log count based on response format
        const claimsCount = Array.isArray(fallbackResponse.data) ? fallbackResponse.data.length : 
                           (fallbackResponse.data?.results ? fallbackResponse.data.results.length : 'unknown');
        console.log(`Retrieved ${claimsCount} claims from finance endpoint (all statuses)`);
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
  return await apiClient.post(`/claims/${claimId}/review/`, actionData);
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
  try {
    // Standard config without custom headers that could trigger CORS issues
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    console.log('createInvoice request payload (stringified):', JSON.stringify(invoiceData));
    
    // Try with direct Axios call first
    try {
      const response = await apiClient.post('/finance/invoices/', invoiceData, config);
      console.log('createInvoice response:', response.data);
      return response;
    } catch (axiosError) {
      console.error('Axios attempt failed:', axiosError);
      
      // Fall back to fetch API if axios fails
      console.log('Attempting with fetch API directly');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('token');
      
      const fetchResponse = await fetch(`${baseUrl}/finance/invoices/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(invoiceData)
      });
      
      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('Fetch API error:', {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          body: errorText
        });
        throw new Error(`Fetch API failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
      }
      
      const data = await fetchResponse.json();
      return { data };
    }
  } catch (error) {
    console.error('createInvoice error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    
    // If it's an HTML response (like a Django error page), try to extract useful info
    if (error.response?.data && typeof error.response.data === 'string' && 
        error.response.data.includes('<!DOCTYPE html>')) {
      
      // Extract Django error message if available
      const errorMatch = error.response.data.match(/<pre class="exception_value">(.*?)<\/pre>/s);
      if (errorMatch && errorMatch[1]) {
        console.error('Django error:', errorMatch[1].trim());
      }
      
      // Extract traceback if available
      const tracebackMatch = error.response.data.match(/<div id="traceback">(.*?)<\/div>/s);
      if (tracebackMatch && tracebackMatch[1]) {
        console.error('Django traceback found - check server logs');
      }
    }
    
    throw error;
  }
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

/**
 * Billing Rates API methods
 */

/**
 * Get all billing rates
 * @returns {Promise} API response with billing rates data
 */
export const getBillingRates = async () => {
  return await apiClient.get('/finance/billing-rates/');
};

/**
 * Get a specific billing rate by ID
 * @param {number} id - Billing rate ID
 * @returns {Promise} API response with billing rate data
 */
export const getBillingRate = async (id) => {
  return await apiClient.get(`/finance/billing-rates/${id}/`);
};

/**
 * Create a new billing rate
 * @param {Object} rateData - Billing rate data
 * @returns {Promise} API response with created billing rate
 */
export const createBillingRate = async (rateData) => {
  return await apiClient.post('/finance/billing-rates/', rateData);
};

/**
 * Update an existing billing rate
 * @param {number} id - Billing rate ID
 * @param {Object} rateData - Updated billing rate data
 * @returns {Promise} API response with updated billing rate
 */
export const updateBillingRate = async (id, rateData) => {
  return await apiClient.put(`/finance/billing-rates/${id}/`, rateData);
};

/**
 * Delete a billing rate
 * @param {number} id - Billing rate ID
 * @returns {Promise} API response confirming deletion
 */
export const deleteBillingRate = async (id) => {
  return await apiClient.delete(`/finance/billing-rates/${id}/`);
};

/**
 * Get all active billing rates
 * @returns {Promise} API response with active billing rates data
 */
export const getActiveBillingRates = async () => {
  return await apiClient.get('/finance/billing-rates/active/');
};

/**
 * Get billing rates for a specific company
 * @param {number} companyId - Insurance company ID
 * @returns {Promise} API response with company's billing rates
 */
export const getCompanyBillingRates = async (companyId) => {
  return await apiClient.get(`/finance/billing-rates/by_company/?company_id=${companyId}`);
};

/**
 * Activate a billing rate
 * @param {number} id - Billing rate ID
 * @returns {Promise} API response with activated billing rate
 */
export const activateBillingRate = async (id) => {
  return await apiClient.post(`/finance/billing-rates/${id}/activate/`);
};

/**
 * Deactivate a billing rate
 * @param {number} id - Billing rate ID
 * @returns {Promise} API response with deactivated billing rate
 */
export const deactivateBillingRate = async (id) => {
  return await apiClient.post(`/finance/billing-rates/${id}/deactivate/`);
};

/**
 * Usage Analytics API methods
 */

/**
 * Get usage analytics for ML predictions
 * @param {Object} params - Query parameters for filtering data
 * @returns {Promise} API response with usage analytics data
 */
export const getUsageAnalytics = async (params = {}) => {
  return await apiClient.get('/finance/usage-analytics/', { params });
};

/**
 * Get usage summary with billing information
 * @param {Object} params - Query parameters for filtering data
 * @returns {Promise} API response with usage summary data
 */
export const getUsageSummary = async (params = {}) => {
  return await apiClient.get('/finance/usage-summary/', { params });
};

/**
 * Export predictions data as CSV
 * @param {Object} params - Query parameters for filtering data
 * @returns {Promise} API response with CSV data
 */
export const exportPredictions = async (params = {}) => {
  return await apiClient.get('/finance/export-predictions/', {
    params,
    responseType: 'blob'
  });
};

export default {
  getAllClaims,
  getFinanceSummary,
  getRecentClaims,
  getBillableClaims,
  getCompanyUsers,
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
  bulkAssignToCompany,
  // Billing rates methods
  getBillingRates,
  getBillingRate,
  createBillingRate,
  updateBillingRate,
  deleteBillingRate,
  getActiveBillingRates,
  getCompanyBillingRates,
  activateBillingRate,
  deactivateBillingRate,
  // Usage analytics methods
  getUsageAnalytics,
  getUsageSummary,
  exportPredictions
};