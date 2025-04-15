import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiClient } from '../../services/authService';

const ModelSchema = Yup.object().shape({
  name: Yup.string().required('Model name is required'),
  version: Yup.string().required('Version is required'),
  description: Yup.string(),
  model_type: Yup.string().required('Model type is required'),
  model_file: Yup.mixed().required('Model file is required'),
  input_format: Yup.object().required('Input format is required'),
  output_format: Yup.object().required('Output format is required'),
});

const MLModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ml/models/');
      setModels(response.data.results || response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to load ML models. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('version', values.version);
      formData.append('description', values.description);
      formData.append('model_type', values.model_type);
      formData.append('model_file', values.model_file);
      formData.append('input_format', JSON.stringify(values.input_format));
      formData.append('output_format', JSON.stringify(values.output_format));

      // Set content type to multipart/form-data and submit
      const response = await apiClient.post('/ml/models/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Handle success
      setSuccessMessage('Model uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reset form and refresh model list
      resetForm();
      setShowForm(false);
      fetchModels();
    } catch (error) {
      console.error('Error uploading model:', error);
      setError(error.response?.data?.message || 'Failed to upload model. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleModelStatus = async (modelId, isActive) => {
    try {
      const action = isActive ? 'deactivate' : 'activate';
      await apiClient.post(`/ml/models/${modelId}/${action}/`);
      fetchModels();
      
      // Show success message after toggling status
      setSuccessMessage(`Model ${action}d successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error(`Error ${isActive ? 'deactivating' : 'activating'} model:`, error);
      setError(`Failed to ${isActive ? 'deactivate' : 'activate'} model. Please try again.`);
    }
  };

  if (loading && models.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">ML Models</h1>
          <p className="text-gray-600">Manage machine learning models</p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'Upload New Model'}
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

      {successMessage && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Model Form */}
      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload New Model</h2>
          
          <Formik
            initialValues={{
              name: '',
              version: '',
              description: '',
              model_type: '',
              model_file: null,
              input_format: { example: 'input format' },
              output_format: { example: 'output format' },
            }}
            validationSchema={ModelSchema}
            onSubmit={handleModelSubmit}
          >
            {({ isSubmitting, setFieldValue, errors, touched }) => (
              <Form>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Model Name
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="name"
                        id="name"
                        className={`form-input ${errors.name && touched.name ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="name" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="version" className="block text-sm font-medium text-gray-700">
                      Version
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="version"
                        id="version"
                        className={`form-input ${errors.version && touched.version ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="version" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <div className="mt-1">
                      <Field
                        as="textarea"
                        name="description"
                        id="description"
                        rows="3"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="model_type" className="block text-sm font-medium text-gray-700">
                      Model Type
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="model_type"
                        id="model_type"
                        className={`form-input ${errors.model_type && touched.model_type ? 'border-red-300' : ''}`}
                      />
                      <ErrorMessage name="model_type" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="model_file" className="block text-sm font-medium text-gray-700">
                      Model File
                    </label>
                    <div className="mt-1">
                      <input
                        type="file"
                        id="model_file"
                        name="model_file"
                        className={`form-input ${errors.model_file && touched.model_file ? 'border-red-300' : ''}`}
                        onChange={(event) => {
                          setFieldValue("model_file", event.currentTarget.files[0]);
                        }}
                      />
                      <ErrorMessage name="model_file" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="input_format" className="block text-sm font-medium text-gray-700">
                      Input Format (JSON)
                    </label>
                    <div className="mt-1">
                      <Field
                        as="textarea"
                        name="input_format"
                        id="input_format"
                        rows="3"
                        className={`form-input ${errors.input_format && touched.input_format ? 'border-red-300' : ''}`}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFieldValue("input_format", parsed);
                          } catch (error) {
                            // Let Formik validation handle the error
                            setFieldValue("input_format", e.target.value);
                          }
                        }}
                        defaultValue={JSON.stringify({ example: "value" }, null, 2)}
                      />
                      <ErrorMessage name="input_format" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="output_format" className="block text-sm font-medium text-gray-700">
                      Output Format (JSON)
                    </label>
                    <div className="mt-1">
                      <Field
                        as="textarea"
                        name="output_format"
                        id="output_format"
                        rows="3"
                        className={`form-input ${errors.output_format && touched.output_format ? 'border-red-300' : ''}`}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFieldValue("output_format", parsed);
                          } catch (error) {
                            // Let Formik validation handle the error
                            setFieldValue("output_format", e.target.value);
                          }
                        }}
                        defaultValue={JSON.stringify({ example: "value" }, null, 2)}
                      />
                      <ErrorMessage name="output_format" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                  >
                    {isSubmitting ? 'Uploading...' : 'Upload Model'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Models List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {models.length > 0 ? (
              models.map((model) => (
                <tr key={model.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {model.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model.model_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model.created_by?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      model.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleModelStatus(model.id, model.is_active)}
                      className={`text-sm mr-3 ${
                        model.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {model.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No models found. Upload your first model!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MLModels;