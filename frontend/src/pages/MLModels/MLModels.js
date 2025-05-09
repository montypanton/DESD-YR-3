import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { apiClient } from '../../services/authService';

const ModelSchema = Yup.object().shape({
  name: Yup.string().required('Model name is required'),
  version: Yup.string().required('Version is required'),
  model_file: Yup.mixed().required('Model file is required'),
  description: Yup.string(),
});

const MLModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const initialFormState = {
    name: '',
    version: '1.0',
    description: '',
    model_file: null,
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ml/models/');
      setModels(response.data.results || response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to load models. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('model_file', values.model_file);
      formData.append('version', values.version);
      formData.append('description', values.description || '');
      formData.append('model_type', 'classifier');
      formData.append('input_format', JSON.stringify({}));
      formData.append('output_format', JSON.stringify({}));

      if (editMode && currentModel) {
        // Update existing model
        await apiClient.patch(`/ml/models/${currentModel.id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSuccessMessage('Model updated successfully!');
      } else {
        // Create new model
        await apiClient.post('/ml/models/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSuccessMessage('Model uploaded successfully!');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);

      resetForm();
      setShowForm(false);
      setEditMode(false);
      setCurrentModel(null);
      fetchModels();
    } catch (error) {
      console.error('Error uploading model:', error);
      setError(error.response?.data?.message || 'Failed to upload model. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const editModel = (model) => {
    setCurrentModel(model);
    setEditMode(true);
    setShowForm(true);
  };

  const toggleModelStatus = async (modelId, isActive) => {
    try {
      const action = isActive ? 'deactivate' : 'activate';
      await apiClient.post(`/ml/models/${modelId}/${action}/`);
      fetchModels();
      setSuccessMessage(`Model ${isActive ? 'deactivated' : 'activated'} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling model status:', error);
      setError('Failed to update model status. Please try again.');
    }
  };

  const deleteModel = async (modelId) => {
    if (window.confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
      try {
        await apiClient.delete(`/ml/models/${modelId}/`);
        fetchModels();
        setSuccessMessage('Model deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('Error deleting model:', error);
        setError('Failed to delete model. Please try again.');
      }
    }
  };

  if (loading && models.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Model Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Upload New Model
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              {editMode ? 'Update Model' : 'Upload New Model'}
            </h3>
            <Formik
              initialValues={editMode && currentModel ? {
                name: currentModel.name,
                version: currentModel.version,
                description: currentModel.description || '',
                model_file: null, // File inputs can't be pre-filled for security reasons
              } : initialFormState}
              validationSchema={ModelSchema}
              onSubmit={handleModelSubmit}
            >
              {({ errors, touched, setFieldValue }) => (
                <Form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Model Name
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="name"
                        id="name"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <ErrorMessage name="name" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="version" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Version
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="version"
                        id="version"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <ErrorMessage name="version" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description (optional)
                    </label>
                    <div className="mt-1">
                      <Field
                        as="textarea"
                        name="description"
                        id="description"
                        rows={3}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Model File {editMode && "(Upload new file to replace current model)"}
                    </label>
                    <div className="mt-1">
                      <input
                        type="file"
                        onChange={(event) => {
                          setFieldValue("model_file", event.currentTarget.files[0]);
                        }}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-indigo-50 file:text-indigo-700
                          hover:file:bg-indigo-100"
                        accept=".h5,.pkl,.pt,.onnx,.pb,.joblib"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Supported formats: .h5, .pkl, .pt, .onnx, .pb, .joblib
                      </p>
                      {editMode && (
                        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                          Note: If you don't upload a new file, the current model will be kept.
                        </p>
                      )}
                    </div>
                    <ErrorMessage name="model_file" component="div" className="mt-1 text-sm text-red-600" />
                  </div>

                  <div className="pt-5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditMode(false);
                          setCurrentModel(null);
                        }}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {editMode ? 'Update Model' : 'Upload Model'}
                      </button>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Upload Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {models.map((model) => (
              <tr key={model.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {model.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(model.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    model.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {model.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editModel(model)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                    >
                      Edit/Replace
                    </button>
                    <button
                      onClick={() => toggleModelStatus(model.id, model.is_active)}
                      className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md ${
                        model.is_active
                          ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      {model.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteModel(model.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MLModels;