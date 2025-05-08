import React, { useState, useEffect } from 'react';
import { 
  Form, Button, Input, Card, Steps, Select, 
  DatePicker, InputNumber, Switch, Upload, 
  Radio, Row, Col, Divider, Alert, Modal, 
  Progress, Spin, Typography, notification,
  Descriptions
} from 'antd';
import { 
  UploadOutlined, SaveOutlined, CarOutlined, 
  FileTextOutlined, MedicineBoxOutlined, 
  DollarOutlined, CheckCircleOutlined, InfoCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import robustClaimService from '../../services/robustClaimService';
import mlRetryService from '../../services/mlRetryService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;

// Claim form steps
const steps = [
  { 
    title: 'Incident Details', 
    icon: <CarOutlined />,
    description: 'Information about the incident' 
  },
  { 
    title: 'Damage Assessment', 
    icon: <FileTextOutlined />,
    description: 'Details about the damages' 
  },
  { 
    title: 'Medical Information', 
    icon: <MedicineBoxOutlined />,
    description: 'Any injuries or medical expenses' 
  },
  { 
    title: 'Financial Details', 
    icon: <DollarOutlined />,
    description: 'Cost and compensation information' 
  },
  { 
    title: 'Review & Submit', 
    icon: <CheckCircleOutlined />,
    description: 'Review and submit your claim' 
  }
];

// Options for accident types
const ACCIDENT_TYPES = [
  'Rear end',
  'Other side pulled out of side road',
  'Other side changed lanes and collided with clt\'s vehicle',
  'Other side turned across Clt\'s path',
  'Other side reversed into Clt\'s vehicle',
  'Rear end - Clt pushed into next vehicle',
  'Other side pulled on to roundabout',
  'Other side drove on wrong side of the road',
  'Rear end - 3 car - Clt at front',
  'Other side changed lanes on a roundabout colliding with clt\'s vehicle',
  'Other side reversed into clt\'s stationary vehicle',
  'Other side collided with Clt\'s parked vehicle',
  'Other'
];

// Options for injury prognosis
const INJURY_PROGNOSIS = [
  'A. 1 month', 'B. 2 months', 'C. 3 months', 'D. 4 months',
  'E. 5 months', 'F. 6 months', 'L. 12 months', 'R. 18 months'
];

// Options for dominant injury
const DOMINANT_INJURIES = ['Arms', 'Legs', 'Multiple', 'Hips'];

// Options for vehicle types
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Truck'];

// Options for weather conditions
const WEATHER_CONDITIONS = ['Sunny', 'Rainy', 'Snowy'];

// Options for gender
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const ImprovedClaimForm = () => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedClaimId, setSubmittedClaimId] = useState(null);
  const [mlUnavailable, setMlUnavailable] = useState(false); // Track ML service availability
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle form value changes to update the stored values
  const handleValuesChange = (changedValues, allValues) => {
    // Log changes to help debug form state issues
    if (Object.keys(changedValues).includes('AccidentDate')) {
      console.log('AccidentDate changed to:', changedValues.AccidentDate ? 
        changedValues.AccidentDate.format('YYYY-MM-DD') : 'null/undefined');
    }
    
    // FIXED: Always store the complete form state rather than just changed values
    // This ensures we always have the current complete state in formValues
    setFormValues(allValues);
    
    // For financial step, auto-calculate totals
    if (currentStep === 3) {
      const specialDamages = calculateSpecialDamages(allValues);
      const generalDamages = calculateGeneralDamages(allValues);
      
      form.setFieldsValue({
        totalSpecialDamages: specialDamages,
        totalGeneralDamages: generalDamages,
        totalClaim: specialDamages + generalDamages
      });
    }
    
    // Log entire form state after updates for critical fields
    if (changedValues.AccidentDate !== undefined || 
        changedValues.SpecialAssetDamage !== undefined ||
        changedValues.Whiplash !== undefined) {
      console.log('Current form state:', {
        AccidentDate: allValues.AccidentDate ? allValues.AccidentDate.format('YYYY-MM-DD') : 'not set',
        SpecialAssetDamage: allValues.SpecialAssetDamage,
        Whiplash: allValues.Whiplash,
        PoliceReportFiled: allValues.PoliceReportFiled
      });
    }
  };
  
  // Calculate total special damages
  const calculateSpecialDamages = (values) => {
    const fields = [
      'SpecialHealthExpenses', 'SpecialEarningsLoss', 'SpecialUsageLoss',
      'SpecialMedications', 'SpecialAssetDamage', 'SpecialRehabilitation',
      'SpecialFixes', 'SpecialLoanerVehicle', 'SpecialTripCosts',
      'SpecialJourneyExpenses', 'SpecialTherapy'
    ];
    
    let total = 0;
    fields.forEach(field => {
      if (values[field]) {
        total += parseFloat(values[field]);
      }
    });
    
    if (values.SpecialReduction) {
      total -= parseFloat(values.SpecialReduction);
    }
    
    return Math.max(0, total);
  };
  
  // Calculate total general damages
  const calculateGeneralDamages = (values) => {
    const fields = ['GeneralFixed', 'GeneralRest', 'GeneralUplift'];
    
    let total = 0;
    fields.forEach(field => {
      if (values[field]) {
        total += parseFloat(values[field]);
      }
    });
    
    return total;
  };

  // Format claim data for submission
  const formatClaimData = (values) => {
    // First, make sure we're working with a complete copy of the values
    // to avoid any reference issues
    const formData = { ...values };
    
    // Validate critical values like AccidentDate before proceeding
    if (!formData.AccidentDate) {
      console.warn('AccidentDate is missing in formatClaimData');
      // Try to get from form state as a last resort
      formData.AccidentDate = form.getFieldValue('AccidentDate');
    }
    
    // Log detailed diagnostic info for debugging
    console.log("DEBUGGING FORM VALUES IN formatClaimData:", {
      AccidentDateDirect: formData.AccidentDate,
      AccidentDateFormatted: formData.AccidentDate ? formData.AccidentDate.format('YYYY-MM-DD') : 'NOT SET',
      DriverAge: formData.DriverAge,
      Whiplash: formData.Whiplash,
      PoliceReportFiled: formData.PoliceReportFiled
    });
    
    // Calculate total claim amount
    const specialDamages = calculateSpecialDamages(formData);
    const generalDamages = calculateGeneralDamages(formData);
    const totalAmount = specialDamages + generalDamages;
    
    // Build a normalized claim data object with proper validation for all fields
    return {
      title: formData.title || `Claim from ${user?.name || user?.email || 'User'}`, // Ensure title is always populated
      description: formData.description || 'No description provided',
      amount: totalAmount,
      
      // The properly formatted and validated claim data
      claim_data: {
        // Categorical fields - use fallbacks for required fields
        AccidentType: formData.AccidentType || 'Other',
        Vehicle_Type: formData.VehicleType || 'Car',
        Weather_Conditions: formData.WeatherConditions || 'Sunny',
        Injury_Prognosis: formData.InjuryPrognosis || 'A. 1 month',
        Dominant_injury: formData.DominantInjury || 'Multiple',
        Gender: formData.Gender || 'Male',
        
        // Boolean fields - always ensure they are true booleans
        Whiplash: formData.Whiplash === true, 
        Police_Report_Filed: formData.PoliceReportFiled === true,
        Witness_Present: formData.WitnessPresent === true,
        Minor_Psychological_Injury: formData.MinorPsychologicalInjury === true,
        Exceptional_Circumstances: formData.ExceptionalCircumstances === true,
        
        // Ensure all numeric fields are valid numbers
        SpecialHealthExpenses: parseFloat(formData.SpecialHealthExpenses || 0),
        SpecialReduction: parseFloat(formData.SpecialReduction || 0),
        SpecialOverage: parseFloat(formData.SpecialOverage || 0),
        GeneralRest: parseFloat(formData.GeneralRest || 0),
        SpecialEarningsLoss: parseFloat(formData.SpecialEarningsLoss || 0),
        SpecialUsageLoss: parseFloat(formData.SpecialUsageLoss || 0),
        SpecialMedications: parseFloat(formData.SpecialMedications || 0),
        SpecialAssetDamage: parseFloat(formData.SpecialAssetDamage || 0),
        SpecialRehabilitation: parseFloat(formData.SpecialRehabilitation || 0),
        SpecialFixes: parseFloat(formData.SpecialFixes || 0),
        GeneralFixed: parseFloat(formData.GeneralFixed || 0),
        GeneralUplift: parseFloat(formData.GeneralUplift || 0),
        SpecialLoanerVehicle: parseFloat(formData.SpecialLoanerVehicle || 0),
        SpecialTripCosts: parseFloat(formData.SpecialTripCosts || 0),
        SpecialJourneyExpenses: parseFloat(formData.SpecialJourneyExpenses || 0),
        SpecialTherapy: parseFloat(formData.SpecialTherapy || 0),
        
        // Vehicle and driver information - these are critical so ensure they have values
        Vehicle_Age: parseFloat(formData.VehicleAge || 0),
        Driver_Age: parseFloat(formData.DriverAge || 30),
        Number_of_Passengers: parseFloat(formData.NumberOfPassengers || 0),
        
        // Ensure date is properly formatted - use a hierarchical approach to get the best value
        Accident_Date: formData.AccidentDate ? formData.AccidentDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        Claim_Date: dayjs().format('YYYY-MM-DD'),
        
        // Text fields - ensure they're not undefined
        incidentLocation: formData.incidentLocation || '',
        damageDescription: formData.damageDescription || '',
        injuryDescription: formData.injuryDescription || '',
        additionalInfo: formData.additionalInfo || ''
      }
    };
  };
  
  // Make ML prediction based on form values - only called once at the review step
  const makePrediction = async () => {
    // Initialize prediction state
    setPredicting(true);
    setMlUnavailable(false);
    
    try {
      // Setup retry mechanism
      const MAX_RETRIES = 2;
      let retryCount = 0;
      let success = false;
      let lastError = null;
      
      // Validate all form fields first
      const values = await form.validateFields();
      
      // Get combined values from form state and component state
      const formFieldValues = form.getFieldsValue(true);
      const combinedValues = {...formValues, ...formFieldValues, ...values};
      
      // Force-update the form with combined values to ensure consistency
      form.setFieldsValue(combinedValues);
      
      // Create a clean copy of the combined values to ensure all fields are included
      const formData = { ...combinedValues };
      
      // Ensure all values are properly set before prediction
      // Any critical missing values should be set to reasonable defaults
      if (!formData.AccidentDate) {
        console.warn('AccidentDate missing during ML prediction');
        formData.AccidentDate = dayjs(); // Default to today
      }
      
      // Log diagnostic info for prediction
      console.log("PREDICTION DATA CHECK BEFORE ML REQUEST:", {
        AccidentDate: formData.AccidentDate ? formData.AccidentDate.format('YYYY-MM-DD') : 'NOT SET',
        SpecialAssetDamage: formData.SpecialAssetDamage,
        Whiplash: formData.Whiplash,
        PoliceReportFiled: formData.PoliceReportFiled
      });
      
      // Format data for prediction using a consistent approach
      // Use the same validation logic as formatClaimData
      const inputData = {
        // Categorical fields with fallbacks
        AccidentType: formData.AccidentType || 'Other',
        Vehicle_Type: formData.VehicleType || 'Car',
        Weather_Conditions: formData.WeatherConditions || 'Sunny',
        Injury_Prognosis: formData.InjuryPrognosis || 'A. 1 month',
        Dominant_injury: formData.DominantInjury || 'Multiple',
        Gender: formData.Gender || 'Male',
        
        // Boolean fields - ensure they are always true/false
        Whiplash: formData.Whiplash === true,
        Police_Report_Filed: formData.PoliceReportFiled === true,
        Witness_Present: formData.WitnessPresent === true, 
        Minor_Psychological_Injury: formData.MinorPsychologicalInjury === true,
        Exceptional_Circumstances: formData.ExceptionalCircumstances === true,
        
        // Numeric fields - ensure they are valid numbers
        SpecialHealthExpenses: parseFloat(formData.SpecialHealthExpenses || 0),
        SpecialReduction: parseFloat(formData.SpecialReduction || 0),
        SpecialOverage: parseFloat(formData.SpecialOverage || 0),
        GeneralRest: parseFloat(formData.GeneralRest || 0),
        SpecialEarningsLoss: parseFloat(formData.SpecialEarningsLoss || 0),
        SpecialUsageLoss: parseFloat(formData.SpecialUsageLoss || 0),
        SpecialMedications: parseFloat(formData.SpecialMedications || 0),
        SpecialAssetDamage: parseFloat(formData.SpecialAssetDamage || 0),
        SpecialRehabilitation: parseFloat(formData.SpecialRehabilitation || 0),
        SpecialFixes: parseFloat(formData.SpecialFixes || 0),
        GeneralFixed: parseFloat(formData.GeneralFixed || 0),
        GeneralUplift: parseFloat(formData.GeneralUplift || 0),
        SpecialLoanerVehicle: parseFloat(formData.SpecialLoanerVehicle || 0),
        SpecialTripCosts: parseFloat(formData.SpecialTripCosts || 0),
        SpecialJourneyExpenses: parseFloat(formData.SpecialJourneyExpenses || 0),
        SpecialTherapy: parseFloat(formData.SpecialTherapy || 0),
        
        // Vehicle and driver information - critical fields
        Vehicle_Age: parseFloat(formData.VehicleAge || 0),
        Driver_Age: parseFloat(formData.DriverAge || 30),
        Number_of_Passengers: parseFloat(formData.NumberOfPassengers || 0),
        
        // Ensure dates are properly formatted
        Accident_Date: formData.AccidentDate ? formData.AccidentDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        Claim_Date: dayjs().format('YYYY-MM-DD'),
        
        // Include calculated totals to help with prediction
        TotalSpecialDamages: calculateSpecialDamages(formData),
        TotalGeneralDamages: calculateGeneralDamages(formData),
        TotalAmount: calculateSpecialDamages(formData) + calculateGeneralDamages(formData)
      };
      
      // Retry loop for ML prediction
      while (retryCount <= MAX_RETRIES && !success) {
        try {
          // Call the ML prediction service
          const response = await mlRetryService.makePrediction(inputData, {
            timeout: 30000 // 30 second timeout
          });
          
          // Validate response
          if (!response || !response.data || !response.data.prediction) {
            throw new Error('Invalid response format from ML service');
          }
          
          const predictionData = response.data.prediction;
          
          // Validate settlement amount
          const settlementAmount = parseFloat(predictionData.settlement_amount);
          if (isNaN(settlementAmount) || settlementAmount <= 0) {
            throw new Error('Invalid settlement amount received');
          }
          
          const confidenceScore = parseFloat(predictionData.confidence_score || 0.85);
          
          // Set the prediction state
          setPrediction({
            settlementAmount: settlementAmount,
            confidenceScore: confidenceScore,
            source: 'ml_service'
          });
          
          // Store the prediction in form values for submission
          form.setFieldsValue({
            predicted_settlement: settlementAmount
          });
          
          // Show success notification
          notification.success({
            message: 'AI Assessment Complete',
            description: 'The ML model has analyzed your claim details and provided a settlement estimation.',
            placement: 'topRight',
            duration: 3
          });
          
          // Mark as successful
          success = true;
          
        } catch (retryError) {
          lastError = retryError;
          retryCount++;
          
          // If we have more retries, show a retry notification
          if (retryCount <= MAX_RETRIES) {
            console.log(`ML prediction attempt ${retryCount} failed, retrying...`);
            
            // Only show notification for first retry to avoid spamming
            if (retryCount === 1) {
              notification.info({
                message: 'Retrying ML Connection',
                description: 'First attempt failed. Retrying connection to ML service...',
                placement: 'topRight',
                duration: 2
              });
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If all retries failed, handle the failure
      if (!success) {
        throw lastError || new Error('Failed to connect to ML service after multiple attempts');
      }
      
    } catch (error) {
      // Log detailed error information
      console.error('ML prediction failed after retries:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      
      // Clear any existing prediction
      setPrediction(null);
      
      // Set ML as unavailable
      setMlUnavailable(true);
      
      // Determine appropriate error message
      let errorMessage = 'Unable to generate a prediction. Please try again later.';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'The ML service request timed out. Please try again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error when connecting to ML service. Please check your connection.';
      } else if (error.response && error.response.status === 503) {
        errorMessage = 'The ML service is temporarily unavailable. Our team has been notified.';
      }
      
      // Show error notification with appropriate message
      notification.error({
        message: 'ML Prediction Failed',
        description: errorMessage,
        placement: 'topRight',
        duration: 6
      });
    } finally {
      setPredicting(false);
    }
  };

  // Handle form submission with enhanced validation
  const submitClaim = async () => {
    try {
      // Check if we have a valid ML prediction - required for submission
      if (!prediction || !prediction.settlementAmount) {
        notification.error({
          message: 'ML Prediction Required',
          description: 'A valid ML prediction is required to submit your claim. Please wait for the prediction to complete or retry.',
          placement: 'topRight',
          duration: 5
        });
        
        // If no prediction is available, trigger the prediction process
        if (!predicting) {
          makePrediction();
        }
        
        return;
      }
      
      setLoading(true);
      
      // Comprehensive pre-submission validation
      try {
        // Validate all form fields
        const values = await form.validateFields();
        
        // Get the values from both form.getFieldsValue() and formValues state to ensure we have everything
        const formFieldValues = form.getFieldsValue(true);
        const combinedValues = {...formValues, ...formFieldValues, ...values};
        
        // Force-update the form with all values to ensure consistency
        form.setFieldsValue(combinedValues);
        
        // Debug log to see what values we actually have
        console.log('VALIDATION DEBUG - Form values:', {
          fromValidateFields: values,
          fromGetFieldsValue: formFieldValues,
          fromFormValuesState: formValues,
          combined: combinedValues
        });
        
        // Critical fields validation check with specific errors
        const criticalFieldErrors = [];
        
        // Check critical fields from combined values to be extra thorough
        if (!combinedValues.AccidentDate) {
          criticalFieldErrors.push('Accident Date is required');
        }
        
        if (!combinedValues.AccidentType) {
          criticalFieldErrors.push('Accident Type is required');
        }
        
        if (!combinedValues.VehicleType) {
          criticalFieldErrors.push('Vehicle Type is required');
        }
        
        if (!combinedValues.InjuryPrognosis) {
          criticalFieldErrors.push('Injury Prognosis is required');
        }
        
        if (!combinedValues.DominantInjury) {
          criticalFieldErrors.push('Dominant Injury is required');
        }
        
        // If any critical fields are missing, show error and abort
        if (criticalFieldErrors.length > 0) {
          setLoading(false);
          notification.error({
            message: 'Missing Required Fields',
            description: (
              <div>
                <p>Please complete the following required fields:</p>
                <ul>
                  {criticalFieldErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            placement: 'topRight',
            duration: 7
          });
          
          return; // Prevent submission
        }
        
        // Log raw form values before formatting to help with debugging
        console.log('Raw form values before submission:', {
          AccidentDate: values.AccidentDate ? values.AccidentDate.format('YYYY-MM-DD') : 'not set',
          SpecialAssetDamage: values.SpecialAssetDamage,
          PoliceReportFiled: values.PoliceReportFiled,
          Whiplash: values.Whiplash,
          // Add other important fields to monitor
          allFormValues: values
        });
        
        // Format the claim data for submission - use combinedValues for maximum reliability
        const claimData = formatClaimData(combinedValues);
        
        // Set the amount to be the ML prediction settlement amount
        const settlementAmount = typeof prediction.settlementAmount === 'number' 
          ? prediction.settlementAmount 
          : parseFloat(prediction.settlementAmount);
        
        // Override the amount with the settlement amount
        claimData.amount = settlementAmount;
          
        const confidenceScore = typeof prediction.confidenceScore === 'number'
          ? prediction.confidenceScore
          : parseFloat(prediction.confidenceScore || 0.85);
          
        // Create comprehensive ML prediction data with all necessary fields
        // This ensures both frontend and backend have complete data
        claimData.ml_prediction = {
          settlement_amount: settlementAmount,
          confidence_score: confidenceScore,
          source: 'ml_service',
          processing_time: prediction.processing_time || 0.5,
          // Include input and output data which is required by the MLPrediction model
          input_data: claimData.claim_data || {},
          output_data: {
            settlement_amount: settlementAmount,
            confidence_score: confidenceScore,
            processing_time: prediction.processing_time || 0.5,
            details: {}
          }
        };
        
        // Also add direct fields for easy access
        claimData.ml_settlement_amount = settlementAmount;
        claimData.ml_confidence_score = confidenceScore;
        
        // Verify important fields are preserved correctly - last chance to catch issues
        console.log('CLAIM DATA VERIFICATION:');
        console.log('- Accident Date:', claimData.claim_data.Accident_Date);
        console.log('- Special Asset Damage:', claimData.claim_data.SpecialAssetDamage);
        console.log('- Whiplash:', claimData.claim_data.Whiplash);
        
        console.log('Submitting claim with ML prediction:', JSON.stringify(claimData.ml_prediction));
        console.log('Full claim data being submitted:', JSON.stringify(claimData, null, 2));
        
        // Final check on critical fields before submission
        if (!claimData.claim_data.Accident_Date || claimData.claim_data.Accident_Date === 'NOT SET') {
          console.error('CRITICAL: AccidentDate is still missing at submission time!');
          notification.error({
            message: 'Missing Accident Date',
            description: 'Please go back and enter a valid accident date before submitting.',
            placement: 'topRight',
            duration: 5
          });
          setLoading(false);
          return; // Prevent submission
        }
        
        // All validation passed - submit to the API endpoint
        const response = await robustClaimService.createClaim(claimData);
        
        // Handle different response formats
        let submittedClaim;
        if (response.data?.data) {
          // Format: { data: { data: { id: ... } } }
          submittedClaim = response.data.data;
        } else if (response.data?.id) {
          // Format: { data: { id: ... } }
          submittedClaim = response.data;
        } else {
          // If we can't find the ID, use a placeholder
          submittedClaim = { id: 'new-claim' };
        }
        
        // Set the ID for confirmation
        setSubmittedClaimId(submittedClaim.id);
        
        // Show success state
        setSubmitSuccess(true);
        setShowConfirmation(true);
      } catch (validationError) {
        // Form validation failed
        setLoading(false);
        
        notification.error({
          message: 'Form Validation Failed',
          description: 'Please ensure all required fields are completed correctly.',
          placement: 'topRight',
          duration: 5
        });
        
        return; // Prevent submission after validation failure
      }
      
      // Clear any displayed errors
      notification.destroy();
      
    } catch (error) {
      console.error('Error submitting claim:', error);
      
      // Close the confirmation dialog if it was mistakenly opened
      setShowConfirmation(false);
      setSubmitSuccess(false);
      
      // Get a more detailed error message if available
      let errorMessage = 'Failed to submit claim. Please ensure all required fields are completed correctly.';
      
      if (error.response && error.response.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('Detailed error information:', {
        message: error.message,
        responseData: error.response?.data,
        status: error.response?.status
      });
      
      notification.error({
        message: 'Submission Failed',
        description: errorMessage,
        placement: 'topRight',
        duration: 5
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle going back to claims list or viewing submitted claim
  const handleConfirmationAction = (viewClaim) => {
    setShowConfirmation(false);
    if (viewClaim && submittedClaimId) {
      navigate(`/claims/${submittedClaimId}`);
    } else {
      navigate('/claims');
    }
  };

  // Handle step changes with enhanced validation
  const next = async () => {
    try {
      // Validate current step fields
      await form.validateFields();
      
      // Copy the current form values to make sure state is up to date
      const currentValues = form.getFieldsValue();
      setFormValues(currentValues);
      
      // Step-specific validations
      if (currentStep === 0) {
        // First step validation - incident details
        const requiredFields = ['AccidentDate', 'AccidentType', 'WeatherConditions', 'incidentLocation', 'VehicleType', 'DriverAge'];
        const missingFields = [];
        
        // Check for missing required fields
        requiredFields.forEach(field => {
          if (!currentValues[field]) {
            missingFields.push(field);
          }
        });
        
        // Special check for accident date
        if (!currentValues.AccidentDate) {
          notification.warning({
            message: 'Accident Date Required',
            description: 'Please select a valid accident date before proceeding.',
            placement: 'topRight',
            duration: 3
          });
          return;
        } else {
          // Log the accident date to verify it's being captured correctly
          console.log('Accident date when moving to next step:', currentValues.AccidentDate.format('YYYY-MM-DD'));
          
          // Update form state explicitly to ensure accident date is preserved
          form.setFieldsValue({
            AccidentDate: currentValues.AccidentDate
          });
        }
        
        // Show warning if other required fields are missing
        if (missingFields.length > 0) {
          notification.warning({
            message: 'Required Fields Missing',
            description: `Please complete all required fields before proceeding: ${missingFields.join(', ')}`,
            placement: 'topRight',
            duration: 3
          });
          return;
        }
      } else if (currentStep === 1) {
        // Damage assessment validation
        if (!currentValues.damageDescription) {
          notification.warning({
            message: 'Damage Description Required',
            description: 'Please provide a description of the damages before proceeding.',
            placement: 'topRight', 
            duration: 3
          });
          return;
        }
      } else if (currentStep === 2) {
        // Medical information validation
        if (!currentValues.InjuryPrognosis || !currentValues.DominantInjury) {
          notification.warning({
            message: 'Medical Information Required',
            description: 'Please complete injury prognosis and dominant injury fields before proceeding.',
            placement: 'topRight',
            duration: 3
          });
          return;
        }
      }
      
      // If moving to final step (Review & Submit)
      if (currentStep === 3) {
        // Get all current form values
        const values = form.getFieldsValue(true);
        
        // List to track missing fields
        const missingFields = [];
        
        // Check each critical field
        if (!values.AccidentDate) {
          missingFields.push('Accident Date');
        }
        
        if (!values.AccidentType) {
          missingFields.push('Accident Type');
        }
        
        if (!values.InjuryPrognosis) {
          missingFields.push('Injury Prognosis');
        }
        
        if (!values.DominantInjury) {
          missingFields.push('Dominant Injury');
        }
        
        // Display error if any fields are missing
        if (missingFields.length > 0) {
          notification.error({
            message: 'Critical Information Missing',
            description: (
              <>
                <p>The following required fields are missing:</p>
                <ul>
                  {missingFields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </>
            ),
            placement: 'topRight',
            duration: 6
          });
          
          // Don't go back to first step - just prevent moving forward
          return;
        }
        
        // Clear any existing prediction
        setPrediction(null);
        setMlUnavailable(false);
        
        // Update step first
        setCurrentStep(currentStep + 1);
        
        // Calculate the totals for review page
        const specialDamages = calculateSpecialDamages(values);
        const generalDamages = calculateGeneralDamages(values);
        
        form.setFieldsValue({
          totalSpecialDamages: specialDamages,
          totalGeneralDamages: generalDamages,
          totalClaim: specialDamages + generalDamages
        });
        
        // Trigger ML prediction only when reaching the review step
        // Use setTimeout to ensure UI updates first
        setTimeout(() => {
          makePrediction();
        }, 100);
      } else {
        // For all other steps, just move to next step
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      // Form validation failed
      console.error('Validation error:', error);
      notification.error({
        message: 'Form Validation Failed',
        description: 'Please ensure all required fields are completed correctly.',
        placement: 'topRight',
        duration: 3
      });
    }
  };
  
  const prev = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Retry prediction if it failed
  const retryPrediction = () => {
    // Reset prediction states
    setPrediction(null);
    setMlUnavailable(false);
    
    // Generate a new prediction
    makePrediction();
  };
  
  // Render confirmation modal after submission
  const renderConfirmationModal = () => (
    <Modal
      title={<><CheckCircleOutlined style={{ color: '#52c41a' }} /> Claim Submitted Successfully</>}
      open={showConfirmation && submitSuccess}
      onCancel={() => handleConfirmationAction(false)}
      closable={false}
      maskClosable={false}
      footer={[
        <Button key="back" onClick={() => handleConfirmationAction(false)}>
          Return to Claims List
        </Button>,
        <Button key="view" type="primary" onClick={() => handleConfirmationAction(true)}>
          View Submitted Claim
        </Button>
      ]}
    >
      <Result
        status="success"
        title="Your claim has been submitted successfully!"
        subTitle={submittedClaimId ? `Claim ID: ${submittedClaimId}` : ''}
        extra={[
          <Paragraph key="info">
            Your claim has been received and is now pending review. You will be notified of any updates to your claim status.
          </Paragraph>
        ]}
      />
    </Modal>
  );

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderIncidentDetails();
      case 1:
        return renderDamageAssessment();
      case 2:
        return renderMedicalInformation();
      case 3:
        return renderFinancialDetails();
      case 4:
        return renderReviewSubmit();
      default:
        return null;
    }
  };
  
  // Render incident details step
  const renderIncidentDetails = () => (
    <>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="title"
            label="Claim Title"
            rules={[{ required: true, message: 'Please enter a title for your claim' }]}
          >
            <Input placeholder="e.g., Car Accident on Main Street" />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="AccidentDate"
            label="Date of Incident"
            rules={[{ required: true, message: 'Please provide the incident date' }]}
            validateTrigger={['onChange', 'onBlur']}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="YYYY-MM-DD"
              allowClear={false}
              onChange={(date) => {
                if (date) {
                  // Force update the form value and validate immediately
                  form.setFieldsValue({ AccidentDate: date });
                  
                  // Explicitly validate this field
                  form.validateFields(['AccidentDate']);
                  
                  // Also store in component state to ensure it's properly tracked
                  setFormValues(prev => ({
                    ...prev,
                    AccidentDate: date
                  }));
                }
              }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="AccidentType"
            label="Accident Type"
            rules={[{ required: true, message: 'Please select the accident type' }]}
          >
            <Select placeholder="Select accident type">
              {ACCIDENT_TYPES.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="WeatherConditions"
            label="Weather Conditions"
            rules={[{ required: true, message: 'Please select the weather conditions' }]}
          >
            <Select placeholder="Select weather conditions">
              {WEATHER_CONDITIONS.map(weather => (
                <Option key={weather} value={weather}>{weather}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="incidentLocation"
            label="Incident Location"
            rules={[{ required: true, message: 'Please enter the incident location' }]}
          >
            <Input placeholder="e.g., 123 Main St, Anytown" />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="VehicleType"
            label="Vehicle Type"
            rules={[{ required: true, message: 'Please select vehicle type' }]}
          >
            <Select placeholder="Select vehicle type">
              {VEHICLE_TYPES.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="VehicleAge"
            label="Vehicle Age (years)"
            rules={[{ required: true, message: 'Please enter vehicle age' }]}
          >
            <InputNumber min={0} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="DriverAge"
            label="Driver Age"
            rules={[{ required: true, message: 'Please enter driver age' }]}
          >
            <InputNumber min={16} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="NumberOfPassengers"
            label="Number of Passengers"
            initialValue={0}
          >
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="PoliceReportFiled"
            label="Police Report Filed"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="WitnessPresent"
            label="Witnesses Present"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item
        name="description"
        label="Incident Description"
        rules={[{ required: true, message: 'Please provide a description of the incident' }]}
      >
        <TextArea 
          rows={4} 
          placeholder="Provide a detailed description of what happened during the incident" 
        />
      </Form.Item>
      
      <Form.Item
        name="Gender"
        label="Driver Gender"
      >
        <Radio.Group>
          {GENDER_OPTIONS.map(gender => (
            <Radio key={gender} value={gender}>{gender}</Radio>
          ))}
        </Radio.Group>
      </Form.Item>
    </>
  );
  
  // Render damage assessment step
  const renderDamageAssessment = () => (
    <>
      <Form.Item
        name="damageDescription"
        label="Damage Description"
        rules={[{ required: true, message: 'Please describe the damages' }]}
      >
        <TextArea 
          rows={4} 
          placeholder="Provide a detailed description of all damages to your vehicle or property" 
        />
      </Form.Item>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="SpecialAssetDamage"
            label="Asset Damage Value"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 1500" 
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="SpecialFixes"
            label="Repair Costs"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 2000" 
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="SpecialLoanerVehicle"
            label="Loaner Vehicle Costs"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 500" 
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="SpecialUsageLoss"
            label="Usage Loss"
            initialValue={0}
            tooltip="Loss of use of your vehicle or property"
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 300" 
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="SpecialJourneyExpenses"
            label="Journey Expenses"
            initialValue={0}
            tooltip="Additional travel expenses incurred due to the incident"
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 150" 
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="SpecialTripCosts"
            label="Trip Costs"
            initialValue={0}
            tooltip="Costs of trips related to the incident"
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 200" 
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item
        name="evidence"
        label="Supporting Evidence"
        extra="Upload photos, reports, or other evidence of damages (optional)"
      >
        <Upload 
          name="files" 
          listType="picture"
          multiple
          beforeUpload={() => false} // Prevent auto-upload, will be handled on form submission
        >
          <Button icon={<UploadOutlined />}>Upload Files</Button>
        </Upload>
      </Form.Item>
      
      <Form.Item
        name="ExceptionalCircumstances"
        label="Exceptional Circumstances"
        valuePropName="checked"
        tooltip="Check if there were any exceptional circumstances that affected the incident or damages"
      >
        <Switch />
      </Form.Item>
    </>
  );
  
  // Render medical information step
  const renderMedicalInformation = () => (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="Whiplash"
            label="Whiplash Injury"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="MinorPsychologicalInjury"
            label="Minor Psychological Injury"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="InjuryPrognosis"
            label="Injury Prognosis"
            rules={[{ required: true, message: 'Please select injury prognosis' }]}
          >
            <Select placeholder="Select injury prognosis">
              {INJURY_PROGNOSIS.map(prognosis => (
                <Option key={prognosis} value={prognosis}>{prognosis}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="DominantInjury"
            label="Dominant Injury"
            rules={[{ required: true, message: 'Please select dominant injury' }]}
          >
            <Select placeholder="Select dominant injury">
              {DOMINANT_INJURIES.map(injury => (
                <Option key={injury} value={injury}>{injury}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item
        name="injuryDescription"
        label="Injury Description"
        rules={[{ required: true, message: 'Please describe any injuries' }]}
      >
        <TextArea 
          rows={4} 
          placeholder="Provide a detailed description of any injuries sustained" 
        />
      </Form.Item>
      
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="SpecialHealthExpenses"
            label="Health Expenses"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 1000" 
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="SpecialMedications"
            label="Medication Costs"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 200" 
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="SpecialRehabilitation"
            label="Rehabilitation Costs"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 500" 
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="SpecialTherapy"
            label="Therapy Costs"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 300" 
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="SpecialEarningsLoss"
            label="Lost Earnings"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
              placeholder="e.g., 1500" 
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item
        name="medicalEvidence"
        label="Medical Documentation"
        extra="Upload medical reports, bills, or other medical documentation (optional)"
      >
        <Upload 
          name="files" 
          listType="picture"
          multiple
          beforeUpload={() => false} // Prevent auto-upload, will be handled on form submission
        >
          <Button icon={<UploadOutlined />}>Upload Medical Files</Button>
        </Upload>
      </Form.Item>
    </>
  );
  
  // Render financial details step
  const renderFinancialDetails = () => (
    <>
      <Alert
        message="Financial Information"
        description="Please provide financial details related to your claim. This information will help determine appropriate compensation."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />
      
      <Divider orientation="left">Special Damages (Financial Losses)</Divider>
      
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="SpecialOverage"
            label="Special Overage"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="SpecialReduction"
            label="Special Reduction"
            initialValue={0}
            tooltip="Any reductions applicable to special damages"
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="totalSpecialDamages"
            label="Total Special Damages"
            initialValue={0}
          >
            <InputNumber 
              disabled
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Divider orientation="left">General Damages (Pain & Suffering)</Divider>
      
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="GeneralFixed"
            label="General Fixed"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="GeneralRest"
            label="General Rest"
            initialValue={0}
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="GeneralUplift"
            label="General Uplift"
            initialValue={0}
            tooltip="Additional compensation for exceptional circumstances"
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="totalGeneralDamages"
            label="Total General Damages"
            initialValue={0}
          >
            <InputNumber 
              disabled
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="totalClaim"
            label="Total Claim Amount"
            initialValue={0}
          >
            <InputNumber 
              disabled
              style={{ width: '100%' }} 
              formatter={value => `£ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/£\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item
        name="additionalInfo"
        label="Additional Financial Information"
      >
        <TextArea 
          rows={3} 
          placeholder="Any additional financial information that might be relevant to your claim" 
        />
      </Form.Item>
    </>
  );
  
  // Render review & submit step
  const renderReviewSubmit = () => (
    <>
      <Alert
        message="Review Your Claim"
        description="Please review your claim details carefully before submission. The ML model will provide a settlement prediction based on your claim data."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />
      
      {/* ML Prediction Section */}
      {predicting ? (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, fontSize: 16 }}>Analyzing your claim data with our ML model...</p>
            <Progress percent={75} status="active" strokeColor="#1890ff" />
          </div>
        </Card>
      ) : prediction ? (
        <Card 
          title={<div style={{ fontSize: 18 }}><InfoCircleOutlined /> AI Assessment</div>} 
          style={{ marginBottom: 20, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
          className="prediction-card"
          headStyle={{ backgroundColor: '#f0f7ff', borderBottom: '1px solid #d9e8ff' }}
        >
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <Title level={4} style={{ marginBottom: 16, color: '#333' }}>AI-Recommended Settlement</Title>
              <Title level={2} style={{ color: '#1890ff', margin: 0, fontWeight: 600 }}>
                £{prediction.settlementAmount.toFixed(2)}
              </Title>
              <div style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 16, color: '#666' }}>
                  Special: £{calculateSpecialDamages(form.getFieldsValue()).toFixed(2)}, 
                  General: £{calculateGeneralDamages(form.getFieldsValue()).toFixed(2)}
                </Text>
              </div>
              <Text style={{ fontSize: 16, display: 'block', marginTop: 8 }}>
                With <strong>{(prediction.confidenceScore * 100).toFixed(0)}% confidence</strong>
              </Text>
              <Paragraph style={{ marginTop: 16, fontSize: 14 }}>
                This assessment was generated by our ML model trained on thousands of past insurance claims.
                The final settlement will be determined by our finance team after review.
              </Paragraph>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'center' }}>
              <Progress
                type="dashboard"
                percent={parseFloat((prediction.confidenceScore * 100).toFixed(0))}
                format={percent => `${percent}%`}
                status="success"
                strokeColor="#52c41a"
                strokeWidth={10}
              />
              <div style={{ marginTop: 16 }}>
                <Button 
                  type="default"
                  icon={<RocketOutlined />}
                  onClick={retryPrediction}
                  style={{ marginRight: 8 }}
                >
                  Regenerate
                </Button>
                <Button 
                  type="link" 
                  icon={<InfoCircleOutlined />} 
                  onClick={() => notification.info({
                    message: 'About This Prediction',
                    description: 'This prediction is generated by our machine learning model trained on thousands of historical claims. The confidence score indicates how certain the AI is about the prediction.',
                    placement: 'topRight'
                  })}
                >
                  Learn more
                </Button>
              </div>
            </Col>
          </Row>
        </Card>
      ) : mlUnavailable ? (
        <Card 
          style={{ marginBottom: 20, textAlign: 'center', padding: '20px 0' }}
          className="ml-error-card"
        >
          <Result
            status="warning"
            title="ML Service Currently Unavailable"
            subTitle="We're experiencing issues connecting to our ML prediction service."
            extra={
              <Button 
                type="primary" 
                onClick={retryPrediction} 
                icon={<RocketOutlined />}
                size="large"
              >
                Retry Connection
              </Button>
            }
          />
        </Card>
      ) : (
        <Card style={{ marginBottom: 20, textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 18, marginBottom: 16 }}>
            Generating AI Prediction
          </div>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>
            Please wait while we analyze your claim details...
          </p>
        </Card>
      )}
      
      <Card title="Claim Summary" style={{ marginBottom: 20 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Claim Title">{form.getFieldValue('title')}</Descriptions.Item>
          <Descriptions.Item label="Accident Type">{form.getFieldValue('AccidentType')}</Descriptions.Item>
          <Descriptions.Item label="Accident Date">
            {form.getFieldValue('AccidentDate') ? 
              form.getFieldValue('AccidentDate').format('YYYY-MM-DD') : 
              <Text type="danger">No date selected</Text>
            }
          </Descriptions.Item>
          <Descriptions.Item label="Incident Location">{form.getFieldValue('incidentLocation')}</Descriptions.Item>
          <Descriptions.Item label="Vehicle Type">{form.getFieldValue('VehicleType')}</Descriptions.Item>
          <Descriptions.Item label="Driver Age">{form.getFieldValue('DriverAge')}</Descriptions.Item>
          <Descriptions.Item label="Injury Type">{form.getFieldValue('DominantInjury')}</Descriptions.Item>
          <Descriptions.Item label="Injury Prognosis">{form.getFieldValue('InjuryPrognosis')}</Descriptions.Item>
          <Descriptions.Item label="Total Special Damages" span={2}>
            £{parseFloat(form.getFieldValue('totalSpecialDamages') || 0).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="Total General Damages" span={2}>
            £{parseFloat(form.getFieldValue('totalGeneralDamages') || 0).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="Total Claim Amount" span={2}>
            <Text strong style={{ fontSize: 16 }}>
              £{parseFloat(form.getFieldValue('totalClaim') || 0).toFixed(2)}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
      
      <Form.Item>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Button
            type="primary"
            size="large"
            onClick={submitClaim}
            loading={loading}
            icon={<SaveOutlined />}
            style={{ width: 240, height: 50, fontSize: 16 }}
            disabled={!prediction || mlUnavailable}
          >
            Submit Claim
          </Button>
          
          {!prediction && !predicting && (
            <Alert
              message="ML Prediction Required"
              description="A valid ML prediction is required to submit your claim."
              type="warning"
              showIcon
              style={{ maxWidth: 500, margin: '20px auto 0' }}
            />
          )}
          
          {mlUnavailable && (
            <Alert
              message="ML Service Unavailable"
              description="The ML service is currently unavailable. Please try again later."
              type="error"
              showIcon
              style={{ maxWidth: 500, margin: '20px auto 0' }}
            />
          )}
          
          <div style={{ marginTop: 16, maxWidth: 600, margin: '0 auto' }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              By submitting this claim, you confirm that all provided information is accurate 
              to the best of your knowledge. Fraudulent claims are subject to legal action.
            </Text>
          </div>
        </div>
      </Form.Item>
    </>
  );
  
  // Custom Result component for confirmation modal
  const Result = ({ status, title, subTitle, extra }) => (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      {status === 'success' && <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />}
      <Title level={3} style={{ marginTop: 20 }}>{title}</Title>
      <Paragraph style={{ marginBottom: 20 }}>{subTitle}</Paragraph>
      {extra}
    </div>
  );

  return (
    <>
      <Card title="Submit a New Insurance Claim" style={{ maxWidth: 900, margin: '0 auto' }}>
        <Steps current={currentStep} style={{ marginBottom: 30 }}>
          {steps.map(step => (
            <Step 
              key={step.title} 
              title={step.title} 
              description={step.description} 
              icon={step.icon}
            />
          ))}
        </Steps>
        
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          initialValues={{
            title: '',
            // Default the accident date to today
            AccidentDate: dayjs('2025-05-03'), // Using the date you provided
            AccidentType: 'Other', // Provide default value
            WeatherConditions: 'Sunny', // Provide default value
            VehicleType: 'Car', // Provide default value
            InjuryPrognosis: 'A. 1 month', // Provide default value 
            DominantInjury: 'Multiple', // Provide default value
            Gender: 'Male',
            
            // Initialize boolean fields explicitly to false
            Whiplash: false,
            PoliceReportFiled: false,
            WitnessPresent: false,
            MinorPsychologicalInjury: false,
            ExceptionalCircumstances: false,
            
            // Initialize numeric fields to prevent NaN errors
            SpecialHealthExpenses: 0,
            SpecialReduction: 0,
            SpecialOverage: 0,
            GeneralRest: 0,
            SpecialEarningsLoss: 0,
            SpecialUsageLoss: 0,
            SpecialMedications: 0,
            SpecialAssetDamage: 0,
            SpecialRehabilitation: 0,
            SpecialFixes: 0,
            GeneralFixed: 0,
            GeneralUplift: 0,
            SpecialLoanerVehicle: 0,
            SpecialTripCosts: 0,
            SpecialJourneyExpenses: 0,
            SpecialTherapy: 0,
            VehicleAge: 0,
            DriverAge: 30,
            NumberOfPassengers: 0,
            
            totalSpecialDamages: 0,
            totalGeneralDamages: 0,
            totalClaim: 0
          }}
        >
          {renderStepContent()}
          
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            {currentStep > 0 && (
              <Button style={{ marginRight: 8 }} onClick={prev}>
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={next}>
                Next
              </Button>
            )}
          </div>
        </Form>
      </Card>
      
      {renderConfirmationModal()}
    </>
  );
};

export default ImprovedClaimForm;