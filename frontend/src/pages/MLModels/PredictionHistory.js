import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/authService';

const PredictionSchema = Yup.object().shape({
  model_id: Yup.string().required('Model is required'),
  features: Yup.object().required('At least one feature is required')
});

// Mock data to display while backend is under development
const mockModels = [
  { 
    id: '1', 
    name: 'Linear Regression', 
    version: '1.0', 
    model_type: 'Regression', 
    is_active: true,
    input_format: {
      feature1: "number",
      feature2: "number"
    },
    output_format: {
      prediction: "number",
      confidence: "number"
    }
  },
  { 
    id: '2', 
    name: 'Random Forest', 
    version: '2.1', 
    model_type: 'Classification', 
    is_active: true,
    input_format: {
      feature1: "number",
      feature2: "string",
      feature3: "number"
    },
    output_format: {
      class: "string",
      probability: "number"
    }
  },
  { 
    id: '3', 
    name: 'Neural Network', 
    version: '1.5', 
    model_type: 'Deep Learning', 
    is_active: true,
    input_format: {
      text: "string",
      numeric_values: [1, 2, 3]
    },
    output_format: {
      classification: "string",
      confidence: "number"
    }
  },
];

const mockPredictions = [
  {
    id: '101',
    model: { id: '1', name: 'Linear Regression', version: '1.0' },
    status: 'COMPLETED',
    created_at: new Date().toISOString(),
    processing_time: '0.45',
    input_data: { "feature1": 12.5, "feature2": 8.3 },
    output_data: { "prediction": 42.8, "confidence": 0.92 }
  },
  {
    id: '102',
    model: { id: '2', name: 'Random Forest', version: '2.1' },
    status: 'FAILED',
    created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    processing_time: '0.0',
    input_data: { "feature1": 3.2, "feature2": "sample", "feature3": 7.1 },
    output_data: {},
    error_message: "Input data format not compatible with model"
  },
  {
    id: '103',
    model: { id: '3', name: 'Neural Network', version: '1.5' },
    status: 'PROCESSING',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    processing_time: '1.23',
    input_data: { "text": "Sample text input", "numeric_values": [5, 2, 9] },
    output_data: null
  }
];

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [useMockData, setUseMockData] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [inputFormat, setInputFormat] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let predictionsData;
      let modelsData;

      try {
        // Try to fetch real data from backend
        const [predictionsResponse, modelsResponse] = await Promise.all([
          apiClient.get('/ml/predictions/my_predictions/'),
          apiClient.get('/ml/models/')
        ]);
        
        predictionsData = predictionsResponse.data.results || predictionsResponse.data;
        modelsData = modelsResponse.data.results || modelsResponse.data;
        setUseMockData(false);
      } catch (error) {
        // If backend returns errors, use mock data
        console.warn('Backend API error, using mock data instead:', error);
        predictionsData = mockPredictions;
        modelsData = mockModels;
        setUseMockData(true);
      }
      
      setPredictions(predictionsData);
      setModels(modelsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Using demo data instead.');
      setPredictions(mockPredictions);
      setModels(mockModels);
      setUseMockData(true);
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (modelId) => {
    const model = models.find(m => m.id === modelId);
    setSelectedModel(model);
    
    if (model && model.input_format) {
      // Initialize input format with all keys from the model's input format
      const initialInputs = {};
      Object.keys(model.input_format).forEach(key => {
        // Set default values based on type
        if (model.input_format[key] === "number") {
          initialInputs[key] = 0;
        } else if (model.input_format[key] === "string") {
          initialInputs[key] = "";
        } else if (Array.isArray(model.input_format[key])) {
          initialInputs[key] = [...model.input_format[key]];
        } else {
          initialInputs[key] = "";
        }
      });
      setInputFormat(initialInputs);
    }
  };

  const handlePredictionSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      let newPrediction;
      
      // Transform features into input_data
      const input_data = values.features;
      
      if (useMockData) {
        // Create mock prediction for demo purposes
        const selectedModel = models.find(m => m.id === values.model_id);
        newPrediction = {
          id: 'temp_' + Math.random().toString(36).substr(2, 9),
          model: { 
            id: selectedModel.id,
            name: selectedModel?.name || 'Unknown Model', 
            version: selectedModel?.version || '1.0' 
          },
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
          processing_time: '0.5',
          input_data: input_data,
          output_data: generateMockOutput(selectedModel, input_data)
        };
        
        // Add mock delay
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // Real API call
        const response = await apiClient.post('/ml/predictions/', {
          model_id: values.model_id,
          input_data: input_data
        });
        newPrediction = response.data;
      }
      
      // Add new prediction to state
      setPredictions([newPrediction, ...predictions]);
      
      // Reset form and hide it
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error running prediction:', error);
      setError(error.response?.data?.message || 'Failed to run prediction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate mock output based on the model and input data
  const generateMockOutput = (model, inputData) => {
    if (!model || !model.output_format) return { result: Math.random() * 100 };
    
    const output = {};
    Object.keys(model.output_format).forEach(key => {
      if (model.output_format[key] === 'number') {
        // Generate a random number that's somewhat related to the input values
        const inputSum = Object.values(inputData)
          .filter(val => typeof val === 'number')
          .reduce((sum, val) => sum + val, 0);
        output[key] = Math.abs((inputSum * Math.random()) % 100).toFixed(2);
      } else if (model.output_format[key] === 'string') {
        const options = ['Class A', 'Class B', 'Class C'];
        output[key] = options[Math.floor(Math.random() * options.length)];
      } else {
        output[key] = 'Mock result';
      }
    });
    
    return output;
  };

  const viewPredictionDetails = (prediction) => {
    setSelectedPrediction(prediction);
  };

  if (loading && predictions.length === 0) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg mb-8 p-6 flex items-center justify-between">
        <div className="text-white">
          <h1 className="text-2xl font-bold">Prediction History</h1>
          <p className="text-blue-100">View your prediction history and make new predictions</p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className={`px-4 py-2 rounded-md font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            showForm 
              ? 'bg-white text-blue-600 hover:bg-gray-100 focus:ring-blue-500' 
              : 'bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-800'
          }`}
        >
          {showForm ? (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </span>
          ) : (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Prediction
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {useMockData && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Demo Mode:</strong> Using sample data while the backend API is under development
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Prediction Form */}
      {showForm && (
        <div className="bg-white shadow-md rounded-xl p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Run New Prediction
          </h2>
          
          <Formik
            initialValues={{
              model_id: models.length > 0 ? models[0].id : '',
              features: {}
            }}
            validationSchema={PredictionSchema}
            onSubmit={handlePredictionSubmit}
          >
            {({ isSubmitting, setFieldValue, values, errors, touched }) => (
              <Form>
                <div className="grid grid-cols-1 gap-y-6">
                  <div>
                    <label htmlFor="model_id" className="block text-sm font-medium text-gray-700">
                      Select Model
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <Field
                        as="select"
                        name="model_id"
                        id="model_id"
                        className={`block w-full pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${errors.model_id && touched.model_id ? 'border-red-300 text-red-900 placeholder-red-300' : ''}`}
                        onChange={(e) => {
                          const modelId = e.target.value;
                          handleModelChange(modelId);
                          setFieldValue("model_id", modelId);
                          setFieldValue("features", {});
                        }}
                      >
                        <option value="" disabled>Select a model</option>
                        {models.filter(model => model.is_active).map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} (v{model.version}) - {model.model_type}
                          </option>
                        ))}
                      </Field>
                      {errors.model_id && touched.model_id && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <ErrorMessage name="model_id" component="div" className="mt-1 text-sm text-red-600" />
                  </div>

                  {selectedModel && (
                    <div>
                      <h3 className="text-md font-medium text-gray-700 mb-2">Model Input Features</h3>
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        {/* Dynamic form fields based on the selected model's input format */}
                        {Object.keys(selectedModel.input_format || {}).map((featureKey) => {
                          const featureType = selectedModel.input_format[featureKey];
                          return (
                            <div key={featureKey} className="mb-4">
                              <label 
                                htmlFor={`features.${featureKey}`} 
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                {featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                <span className="text-xs text-gray-500 ml-1">({typeof featureType === 'string' ? featureType : 'array'})</span>
                              </label>
                              {/* Render different input types based on the feature type */}
                              {featureType === 'number' ? (
                                <Field
                                  type="number"
                                  name={`features.${featureKey}`}
                                  id={`features.${featureKey}`}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  placeholder={`Enter value for ${featureKey}`}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    setFieldValue(`features.${featureKey}`, isNaN(value) ? 0 : value);
                                  }}
                                />
                              ) : featureType === 'string' ? (
                                <Field
                                  type="text"
                                  name={`features.${featureKey}`}
                                  id={`features.${featureKey}`}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  placeholder={`Enter value for ${featureKey}`}
                                />
                              ) : Array.isArray(featureType) ? (
                                // For array types, we'll show a text area with JSON format
                                <div>
                                  <Field
                                    as="textarea"
                                    name={`features.${featureKey}`}
                                    id={`features.${featureKey}`}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                                    placeholder={`Enter values as [1, 2, 3]`}
                                    rows="3"
                                    onChange={(e) => {
                                      try {
                                        const arrayValue = JSON.parse(e.target.value);
                                        if (Array.isArray(arrayValue)) {
                                          setFieldValue(`features.${featureKey}`, arrayValue);
                                        }
                                      } catch (error) {
                                        // Keep the raw text if it's not valid JSON yet
                                        setFieldValue(`features.${featureKey}`, e.target.value);
                                      }
                                    }}
                                    defaultValue={JSON.stringify(featureType)}
                                  />
                                  <p className="mt-1 text-xs text-gray-500">Enter as JSON array, e.g. [1, 2, 3]</p>
                                </div>
                              ) : (
                                <Field
                                  type="text"
                                  name={`features.${featureKey}`}
                                  id={`features.${featureKey}`}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  placeholder={`Enter value for ${featureKey}`}
                                />
                              )}
                              <ErrorMessage 
                                name={`features.${featureKey}`}
                                component="div"
                                className="mt-1 text-xs text-red-600"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <ErrorMessage name="features" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedModel}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Run Prediction
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Prediction Details Modal */}
      {selectedPrediction && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Prediction Details
                    </h3>
                    
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Model</h4>
                          <p className="mt-1 text-sm text-gray-900 font-medium">{selectedPrediction.model?.name} (v{selectedPrediction.model?.version})</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Status</h4>
                          <p className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${selectedPrediction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                selectedPrediction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'}`}>
                              {selectedPrediction.status}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Created</h4>
                          <p className="mt-1 text-sm text-gray-900">{new Date(selectedPrediction.created_at).toLocaleString()}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Processing Time</h4>
                          <p className="mt-1 text-sm text-gray-900">{selectedPrediction.processing_time || '0'} seconds</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Input Data</h4>
                        <div className="mt-1 bg-gray-50 rounded-md border border-gray-200 p-3">
                          {/* Display input data as a formatted table instead of raw JSON */}
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr>
                                <th className="text-left text-gray-500 font-medium">Feature</th>
                                <th className="text-left text-gray-500 font-medium">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(selectedPrediction.input_data || {}).map(([key, value]) => (
                                <tr key={key} className="border-t border-gray-100">
                                  <td className="py-1 font-medium text-gray-700">{key}</td>
                                  <td className="py-1 text-gray-900 font-mono">
                                    {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Output Data</h4>
                        <div className="mt-1 bg-gray-50 rounded-md border border-gray-200 p-3">
                          {/* Display output data as a formatted table instead of raw JSON */}
                          {Object.keys(selectedPrediction.output_data || {}).length > 0 ? (
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr>
                                  <th className="text-left text-gray-500 font-medium">Output</th>
                                  <th className="text-left text-gray-500 font-medium">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(selectedPrediction.output_data || {}).map(([key, value]) => (
                                  <tr key={key} className="border-t border-gray-100">
                                    <td className="py-1 font-medium text-gray-700">{key}</td>
                                    <td className="py-1 text-gray-900 font-mono">
                                      {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm text-gray-500 py-2">No output data available</p>
                          )}
                        </div>
                      </div>
                      
                      {selectedPrediction.error_message && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Error</h4>
                          <div className="mt-1 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                            {selectedPrediction.error_message}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedPrediction(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Predictions List */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Recent Predictions</h2>
          <span className="text-sm text-gray-500">{predictions.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {predictions.length > 0 ? (
                predictions.map((prediction) => (
                  <tr key={prediction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {prediction.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{prediction.model?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">v{prediction.model?.version || '?'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${prediction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          prediction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {prediction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prediction.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewPredictionDetails(prediction)}
                        className="text-blue-600 hover:text-blue-900 transition-colors inline-flex items-center"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 whitespace-nowrap text-sm text-gray-500 text-center border-b border-gray-200">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600 font-medium mb-1">No predictions found</p>
                      <p className="text-gray-500 text-sm">Make your first prediction by clicking the "New Prediction" button</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PredictionHistory;