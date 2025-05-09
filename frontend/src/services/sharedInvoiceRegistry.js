/**
 * Shared Invoice Registry
 * 
 * This utility provides centralized invoice number generation and lookup
 * across the entire application to ensure consistent invoice numbers
 * between the finance area and end user area.
 */

// Constants for invoice format
const ML_INVOICE_PREFIX = 'ML-INV';
const REGISTRY_KEY = 'invoice_registry';
const PAYMENTS_KEY = 'ml_invoice_payments';

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
 * @param {Object} invoiceDetails - Optional additional invoice details to store
 */
export const registerInvoice = (invoiceNumber, userId, invoiceDetails = null) => {
  try {
    // Get existing registry
    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
    
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
    
    // Store full invoice details if provided
    if (invoiceDetails) {
      if (!registry.invoiceDetails) {
        registry.invoiceDetails = {};
      }
      registry.invoiceDetails[invoiceNumber] = {
        ...invoiceDetails,
        user_id: userId,
        invoice_number: invoiceNumber
      };
    }
    
    // Store the updated registry
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    
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
    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
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
  
  const mlInvoice = {
    ...invoice,
    invoice_number: mlInvoiceNumber,
    user_id: userId,
    invoice_type: 'ml_usage',
    ml_usage: true,
  };
  
  // Register the full invoice details
  registerInvoice(mlInvoiceNumber, userId, mlInvoice);
  
  return mlInvoice;
};

/**
 * Register a payment for an invoice
 * @param {string|number} invoiceId - The invoice ID
 * @param {string} invoiceNumber - The invoice number
 * @param {Object} paymentDetails - Payment details including bank information
 * @returns {boolean} True if payment was registered successfully
 */
export const registerInvoicePayment = (invoiceId, invoiceNumber, paymentDetails) => {
  try {
    // Get existing payments
    const payments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '{}');
    
    // Store payment by both ID and invoice number for cross-reference
    payments[invoiceId] = paymentDetails;
    payments[`number-${invoiceNumber}`] = paymentDetails;
    
    // Store the updated payments
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
    
    // Also update the invoice status in the registry
    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
    if (registry.invoiceDetails && registry.invoiceDetails[invoiceNumber]) {
      registry.invoiceDetails[invoiceNumber].status = 'PAID';
      registry.invoiceDetails[invoiceNumber].payment = paymentDetails;
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    }
    
    console.log(`Registered payment for invoice ${invoiceNumber} (ID: ${invoiceId})`);
    return true;
  } catch (error) {
    console.error('Error registering payment:', error);
    return false;
  }
};

/**
 * Get payment details for an invoice
 * @param {string|number} invoiceIdOrNumber - The invoice ID or number
 * @returns {Object|null} Payment details or null if not found
 */
export const getInvoicePayment = (invoiceIdOrNumber) => {
  try {
    const payments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '{}');
    
    // First try direct lookup by ID
    if (payments[invoiceIdOrNumber]) {
      return payments[invoiceIdOrNumber];
    }
    
    // Then try lookup by number format
    if (payments[`number-${invoiceIdOrNumber}`]) {
      return payments[`number-${invoiceIdOrNumber}`];
    }
    
    // Finally look for any payment that matches the invoice number
    const matchingPayment = Object.values(payments).find(
      payment => payment.invoice_number === invoiceIdOrNumber
    );
    
    return matchingPayment || null;
  } catch (error) {
    console.error('Error getting invoice payment:', error);
    return null;
  }
};

/**
 * Update an invoice's payment status
 * @param {string|number} invoiceId - The invoice ID
 * @param {string} invoiceNumber - The invoice number
 * @param {string} status - New status (PAYMENT_PENDING, PAID, etc.)
 * @returns {boolean} True if status was updated successfully
 */
export const updateInvoiceStatus = (invoiceId, invoiceNumber, status) => {
  try {
    // Update the status in the registry
    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
    if (registry.invoiceDetails && registry.invoiceDetails[invoiceNumber]) {
      registry.invoiceDetails[invoiceNumber].status = status;
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    }
    
    // Also update any payment record if it exists
    const payments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '{}');
    if (payments[invoiceId]) {
      payments[invoiceId].status = status;
    }
    if (payments[`number-${invoiceNumber}`]) {
      payments[`number-${invoiceNumber}`].status = status;
    }
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
    
    console.log(`Updated status for invoice ${invoiceNumber} to ${status}`);
    return true;
  } catch (error) {
    console.error('Error updating invoice status:', error);
    return false;
  }
};

/**
 * Create a deterministic invoice ID based on user ID
 * @param {string|number} userId - The user ID
 * @returns {number} A deterministic invoice ID
 */
export const generateDeterministicInvoiceId = (userId) => {
  return 100000 + parseInt(userId, 10);
};

export default {
  generateUniqueMLInvoiceNumber,
  registerInvoice,
  getUserInvoices,
  isUserInvoice,
  convertToMLInvoice,
  registerInvoicePayment,
  getInvoicePayment,
  updateInvoiceStatus,
  generateDeterministicInvoiceId
};