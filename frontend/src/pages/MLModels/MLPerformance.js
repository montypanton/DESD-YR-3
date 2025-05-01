import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/authService';

const MLPerformance = () => {
  const [performanceData, setPerformanceData] = useState({
    modelMetrics: [],
    confusionMatrix: null,
    roc: null,
    precisionRecall: null,
    errorAnalysis: [],
    modelComparison: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [timeRange, setTimeRange] = useState('30days');
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await apiClient.get('/ml/models/');
      const activeModels = response.data.filter(model => model.is_active);
      setModels(activeModels);
      if (activeModels.length > 0) {
        setSelectedModel(activeModels[0].id);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to load models. Please try again.');
    }
  };

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsResponse, confusionResponse, analysisResponse] = await Promise.all([
        apiClient.get(`/ml/performance/${selectedModel}/metrics/?timeRange=${timeRange}`),
        apiClient.get(`/ml/performance/${selectedModel}/confusion-matrix/?timeRange=${timeRange}`),
        apiClient.get(`/ml/performance/${selectedModel}/error-analysis/?timeRange=${timeRange}`)
      ]);

      setPerformanceData({
        modelMetrics: metricsResponse.data,
        confusionMatrix: confusionResponse.data,
        errorAnalysis: analysisResponse.data.errors,
        modelComparison: analysisResponse.data.comparison
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedModel, timeRange]);

  useEffect(() => {
    if (selectedModel) {
      fetchPerformanceData();
    }
  }, [selectedModel, timeRange, fetchPerformanceData]);

  const renderConfusionMatrix = () => {
    if (!performanceData.confusionMatrix) return null;

    const { matrix, labels } = performanceData.confusionMatrix;
    return (
      <div className="mt-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confusion Matrix</h4>
        <div className="relative overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700"></th>
                {labels.map(label => (
                  <th key={label} className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Predicted {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
                    Actual {labels[i]}
                  </td>
                  {row.map((cell, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 rounded ${
                        i === j
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {cell}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Model Performance Analysis</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Detailed analysis of model performance metrics and predictions
          </p>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} v{model.version}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
              {performanceData.modelMetrics.map((metric, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-700 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                            {metric.name}
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                              {typeof metric.value === 'number' ? `${(metric.value * 100).toFixed(1)}%` : metric.value}
                            </div>
                            {metric.trend && (
                              <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                                metric.trend > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
                              </div>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Confusion Matrix */}
            {renderConfusionMatrix()}

            {/* Error Analysis */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Error Analysis</h4>
              <div className="space-y-4">
                {performanceData.errorAnalysis.map((error, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-700 shadow rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                      {error.category}
                    </h5>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Frequency</p>
                        <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
                          {error.frequency}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Impact</p>
                        <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
                          {error.impact}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {error.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Comparison */}
            {performanceData.modelComparison.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Model Comparison</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Model Version
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Accuracy
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          F1 Score
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Error Rate
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Processing Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {performanceData.modelComparison.map((model, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            v{model.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {(model.accuracy * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {(model.f1_score * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {(model.error_rate * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {model.processing_time}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MLPerformance;