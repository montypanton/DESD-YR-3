import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/authService';

const PredictionSchema = Yup.object().shape({
  model_id: Yup.string().required('Model is required'),
  input_data: Yup.object().required('Input data is required'),
});

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [predictionsResponse, modelsResponse] = await Promise.all([
        apiClient.get('/ml/predictions/my_predictions/'),
        apiClient.get('/ml/models/')
      ]);
      
      setPredictions(predictionsResponse.data.results || predictionsResponse.data);
      setModels(modelsResponse.data.results || modelsResponse.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await apiClient.post('/ml/predictions/', {
        model_id: values.model_id,
        input_data: values.input_data
      });
      
      // Add new prediction to state
      setPredictions([response.data, ...predictions]);
      
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prediction History</h1>
          <p className="text-gray-600">View your prediction history and make new predictions</p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'New Prediction'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
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

      {/* New Prediction Form */}
      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Run New Prediction</h2>
          
          <Formik
            initialValues={{
              model_id: models.length > 0 ? models[0].id : '',
              input_data: { example: 'value' }
            }}
            validationSchema={PredictionSchema}
            onSubmit={handlePredictionSubmit}
          >
            {({ isSubmitting, setFieldValue, errors, touched }) => (
              <Form>
                <div className="grid grid-cols-1 gap-y-6">
                  <div>
                    <label htmlFor="model_id" className="block text-sm font-medium text-gray-700">
                      Select Model
                    </label>
                    <div className="mt-1">
                      <Field
                        as="select"
                        name="model_id"
                        id="model_id"
                        className={`form-input ${errors.model_id && touched.model_id ? 'border-red-300' : ''}`}
                      >
                        {models.filter(model => model.is_active).map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} (v{model.version}) - {model.model_type}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="model_id" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="input_data" className="block text-sm font-medium text-gray-700">
                      Input Data (JSON)
                    </label>
                    <div className="mt-1">
                      <Field
                        as="textarea"
                        name="input_data"
                        id="input_data"
                        rows="5"
                        className={`form-input ${errors.input_data && touched.input_data ? 'border-red-300' : ''}`}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFieldValue("input_data", parsed);
                          } catch (error) {
                            // Let Formik validation handle the error
                            setFieldValue("input_data", e.target.value);
                          }
                        }}
                        defaultValue={JSON.stringify({ example: "value" }, null, 2)}
                      />
                      <ErrorMessage name="input_data" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                  >
                    {isSubmitting ? 'Running...' : 'Run Prediction'}
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Prediction Details
                    </h3>
                    
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Model</h4>
                        <p className="mt-1 text-sm text-gray-900">{selectedPrediction.model?.name} (v{selectedPrediction.model?.version})</p>
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
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Created</h4>
                        <p className="mt-1 text-sm text-gray-900">{new Date(selectedPrediction.created_at).toLocaleString()}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Processing Time</h4>
                        <p className="mt-1 text-sm text-gray-900">{selectedPrediction.processing_time} seconds</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Input Data</h4>
                        <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-2 rounded-md overflow-auto max-h-32">
                          {JSON.stringify(selectedPrediction.input_data, null, 2)}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Output Data</h4>
                        <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-2 rounded-md overflow-auto max-h-32">
                          {JSON.stringify(selectedPrediction.output_data, null, 2)}
                        </pre>
                      </div>
                      
                      {selectedPrediction.error_message && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Error</h4>
                          <p className="mt-1 text-sm text-red-600">{selectedPrediction.error_message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="btn btn-secondary"
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
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {predictions.length > 0 ? (
              predictions.map((prediction) => (
                <tr key={prediction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {prediction.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {prediction.model?.name || 'Unknown'}
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
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No predictions found. Run your first prediction!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionHistory;