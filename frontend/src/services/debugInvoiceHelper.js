// Debug helper to create an invoice with fixed values
// This can be imported and used in the browser console for testing

import { createInvoice } from './financeService';
import { apiClient } from './authService';

/**
 * Creates a test invoice with fixed values to debug backend issues
 * @param {number} companyId - The insurance company ID to use
 * @returns {Promise} API response with created invoice or error details
 */
export const createDebugInvoice = async (companyId = 1) => {
  try {
    console.log(`Attempting to create debug invoice with company ID: ${companyId}`);
    
    // Create a minimal invoice with only required fields
    const simpleInvoice = {
      insurance_company: companyId,
      issued_date: "2025-05-08",
      due_date: "2025-05-15",
      total_amount: "100.00",
      currency: "USD",
      status: "ISSUED"
    };
    
    console.log('Debug invoice payload:', simpleInvoice);
    
    // Try using the standard endpoint first, but with direct fetch to avoid potential issues
    try {
      console.log('Trying direct fetch to standard endpoint...');
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('token');
      
      const fetchResponse = await fetch(`${baseUrl}/finance/invoices/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(simpleInvoice)
      });
      
      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('Standard endpoint failed:', {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          body: errorText
        });
        throw new Error(`Standard endpoint failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
      }
      
      const data = await fetchResponse.json();
      console.log('Debug invoice created successfully with standard endpoint:', data);
      return data;
    } catch (standardError) {
      console.error('Standard endpoint error details:', standardError);
      
      // If standard endpoint fails, try the debug endpoint
      console.log('Trying debug endpoint...');
      try {
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
        const token = localStorage.getItem('token');
        
        const debugResponse = await fetch(`${baseUrl}/finance/debug/create-invoice/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(simpleInvoice)
        });
        
        if (!debugResponse.ok) {
          const errorText = await debugResponse.text();
          console.error('Debug endpoint failed:', {
            status: debugResponse.status,
            statusText: debugResponse.statusText,
            body: errorText
          });
          throw new Error(`Debug endpoint failed: ${debugResponse.status} ${debugResponse.statusText}`);
        }
        
        const data = await debugResponse.json();
        console.log('Debug invoice created successfully with debug endpoint:', data);
        return data;
      } catch (debugError) {
        console.error('Debug endpoint error details:', debugError);
        throw debugError;
      }
    }
  } catch (error) {
    console.error('Debug invoice creation failed:', error);
    throw error;
  }
};

// Function to test creating invoices with different field combinations
export const testInvoiceCreation = async () => {
  const attempts = [
    { 
      description: "Basic required fields only",
      data: {
        insurance_company: 1,
        issued_date: "2025-05-08",
        due_date: "2025-05-15",
        total_amount: "100.00"
      }
    },
    { 
      description: "With currency specified",
      data: {
        insurance_company: 1,
        issued_date: "2025-05-08",
        due_date: "2025-05-15",
        total_amount: "100.00",
        currency: "USD"
      }
    },
    { 
      description: "With integer total_amount",
      data: {
        insurance_company: 1,
        issued_date: "2025-05-08",
        due_date: "2025-05-15",
        total_amount: 100
      }
    },
    { 
      description: "With all fields",
      data: {
        insurance_company: 1,
        issued_date: "2025-05-08",
        due_date: "2025-05-15",
        total_amount: "100.00",
        currency: "USD",
        status: "ISSUED",
        notes: "Debug test invoice"
      }
    }
  ];
  
  const results = [];
  
  for (const attempt of attempts) {
    try {
      console.log(`Trying: ${attempt.description}`);
      const response = await createInvoice(attempt.data);
      results.push({
        success: true,
        description: attempt.description,
        response: response.data
      });
    } catch (error) {
      results.push({
        success: false,
        description: attempt.description,
        error: error.message,
        details: error.response?.data 
      });
    }
  }
  
  console.table(results.map(r => ({
    description: r.description,
    success: r.success,
    message: r.success ? 'Created' : r.error
  })));
  
  return results;
};

// Function to diagnose network issues in invoice creation
export const diagnoseInvoiceCreation = async (companyId = 1) => {
  console.log("Running invoice creation diagnostic...");
  
  try {
    // First, check if we can make a simple GET request
    console.log("Testing API connectivity...");
    const connectTest = await apiClient.get('/finance/insurance-companies/');
    console.log("API connectivity test succeeded:", 
      connectTest.status === 200 ? 'OK' : `Status: ${connectTest.status}`);
    
    // Test a simple invoice with minimal fields
    console.log("Testing minimal invoice creation...");
    const minimalInvoice = {
      insurance_company: companyId,
      issued_date: "2025-05-08",
      due_date: "2025-05-15",
      total_amount: "100.00"
    };
    
    try {
      const result = await apiClient.post('/finance/debug/create-invoice/', minimalInvoice);
      console.log("Minimal invoice test succeeded:", result.data);
    } catch (err) {
      console.error("Minimal invoice test failed:", err.message);
      console.log("Response status:", err.response?.status);
      console.log("Response data:", err.response?.data);
    }
    
    return "Diagnostics complete - check console for results";
  } catch (error) {
    console.error("Diagnostics failed:", error);
    return {
      success: false,
      message: "Diagnostics failed",
      error: error.message
    };
  }
};

// Export to window for console access
if (typeof window !== 'undefined') {
  window.debugInvoice = {
    create: createDebugInvoice,
    test: testInvoiceCreation,
    diagnose: diagnoseInvoiceCreation
  };
}

export default {
  createDebugInvoice,
  testInvoiceCreation,
  diagnoseInvoiceCreation
};