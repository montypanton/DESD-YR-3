/**
 * Shared Invoice Registry
 * 
 * This utility provides centralized invoice number generation and lookup
 * across the entire application to ensure consistent invoice numbers
 * between the finance area and end user area.
 */

// Constants for invoice format
const ML_INVOICE_PREFIX = 'ML-INV';

/**
 * Generate a globally unique invoice number for ML usage
 * @param {string|number} userId - The user ID this invoice is for
 * @returns {string} A unique invoice number
 */
export const generateUniqueMLInvoiceNumber = (userId) => {
  // Current timestamp for uniqueness
  const timestamp = new Date().getTime();
  
  // Create a random segment for additional uniqueness
  const randomSegment = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Format user ID consistently
  const userSegment = userId.toString().padStart(4, '0');
  
  // Format: ML-INV-USERID-TIMESTAMP-RANDOM
  const invoiceNumber = `${ML_INVOICE_PREFIX}-${userSegment}-${timestamp.toString().slice(-6)}-${randomSegment}`;
  
  // Register this invoice number in our central registry
  registerInvoice(invoiceNumber, userId);
  
  return invoiceNumber;
};

/**
 * Register an invoice in the central registry
 * @param {string} invoiceNumber - The invoice number
 * @param {string|number} userId - The user ID this invoice is for
 */
export const registerInvoice = (invoiceNumber, userId) => {
  try {
    // Get existing registry
    const registry = JSON.parse(localStorage.getItem('invoice_registry') || '{}');
    
    // Create user mapping if it doesn't exist
    if (!registry.userInvoices) {
      registry.userInvoices = {};
    }
    
    // Create array for this user if it doesn't exist
    if (!registry.userInvoices[userId]) {
      registry.userInvoices[userId] = [];
    }
    
    // Add invoice if not already registered
    if (!registry.userInvoices[userId].includes(invoiceNumber)) {
      registry.userInvoices[userId].push(invoiceNumber);
    }
    
    // Store the updated registry
    localStorage.setItem('invoice_registry', JSON.stringify(registry));
    
    console.log(`Registered invoice ${invoiceNumber} for user ${userId} in central registry`);
    
  } catch (error) {
    console.error('Error registering invoice:', error);
  }
};

/**
 * Get all registered invoice numbers for a user
 * @param {string|number} userId - The user ID to look up
 * @returns {string[]} Array of invoice numbers
 */
export const getUserInvoices = (userId) => {
  try {
    const registry = JSON.parse(localStorage.getItem('invoice_registry') || '{}');
    return (registry.userInvoices && registry.userInvoices[userId]) || [];
  } catch (error) {
    console.error('Error getting user invoices:', error);
    return [];
  }
};

/**
 * Check if an invoice belongs to a specific user
 * @param {string} invoiceNumber - The invoice number to check
 * @param {string|number} userId - The user ID to check against
 * @returns {boolean} True if the invoice belongs to the user
 */
export const isUserInvoice = (invoiceNumber, userId) => {
  const userInvoices = getUserInvoices(userId);
  return userInvoices.includes(invoiceNumber);
};

/**
 * Convert an existing finance invoice to match ML standards
 * @param {Object} invoice - The invoice object from finance
 * @param {string|number} userId - The user ID this invoice is for
 * @returns {Object} ML-formatted invoice with correct number
 */
export const convertToMLInvoice = (invoice, userId) => {
  // Generate a new ML-formatted invoice number
  const mlInvoiceNumber = generateUniqueMLInvoiceNumber(userId);
  
  return {
    ...invoice,
    invoice_number: mlInvoiceNumber,
    user_id: userId,
    invoice_type: 'ml_usage',
    ml_usage: true,
  };
};

export default {
  generateUniqueMLInvoiceNumber,
  registerInvoice,
  getUserInvoices,
  isUserInvoice,
  convertToMLInvoice
};