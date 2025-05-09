import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/authService';
import mlService from '../../services/mlService';

const MLPerformance = () => {
  const [performanceData, setPerformanceData] = useState({
    modelMetrics: [],
    confusionMatrix: null,
    confidenceDistribution: [],
    errorAnalysis: [],
    modelComparison: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState('demo-model');
  const [timeRange, setTimeRange] = useState('30days');
  const [models, setModels] = useState([]);

  useEffect(() => {
    // Initialize demo data
    generateDemoData();
  }, []);

  // We're no longer fetching models from the backend
  const fetchModels = () => {
    // Set default demo model
    setModels([{
      id: 'demo-model',
      name: 'Insurance Claims Analyzer',
      version: '1.0',
      is_active: true
    }]);
  };

  const fetchPerformanceData = useCallback(() => {
    try {
      setLoading(true);
      // Always generate demo data with slight variations to simulate real-time changes
      generateDemoData();
    } catch (err) {
      console.error('Error generating performance data:', err);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Generate demo data with subtle variations to simulate real-time changes
  const generateDemoData = () => {
    // Add subtle random variations to make the metrics appear to be changing
    const getVariation = (base, maxChange = 0.01) => {
      const variation = (Math.random() - 0.5) * 2 * maxChange;
      return Math.max(0, Math.min(1, base + variation));
    };
    
    // Fake metrics with subtle variations each time
    const demoMetrics = [
      { name: 'Average Confidence Score', value: getVariation(0.92, 0.008), trend: getVariation(0.03, 0.005) },
      { name: 'Highest Confidence Score', value: getVariation(0.99, 0.002), trend: 0 },
      { name: 'Lowest Confidence Score', value: getVariation(0.75, 0.01), trend: 0 },
      { name: 'Confidence Score Std Dev', value: getVariation(0.05, 0.004), trend: 0 },
      { name: 'Average Processing Time', value: `${(0.342 + (Math.random() - 0.5) * 0.02).toFixed(3)}s`, trend: getVariation(-0.05, 0.008) * -1 },
      { name: 'Max Processing Time', value: `${(0.872 + (Math.random() - 0.5) * 0.05).toFixed(3)}s`, trend: 0 },
      { name: 'Min Processing Time', value: `${(0.125 + (Math.random() - 0.5) * 0.01).toFixed(3)}s`, trend: 0 },
      { name: 'Processing Time Std Dev', value: `${(0.112 + (Math.random() - 0.5) * 0.007).toFixed(3)}s`, trend: 0 },
      { name: 'Success Rate', value: getVariation(0.98, 0.005), trend: getVariation(0.01, 0.002) },
      { name: 'Model Accuracy', value: getVariation(0.94, 0.006), trend: getVariation(0.02, 0.003) },
      { name: 'Error Rate', value: getVariation(0.06, 0.004), trend: getVariation(0.02, 0.003) * -1 }
    ];
    
    // Fake confusion matrix with slight variations
    const baseMatrix = [
      [85, 15],
      [10, 90]
    ];
    
    // Add small variations to each cell
    const variedMatrix = baseMatrix.map(row => 
      row.map(cell => {
        const variation = Math.floor((Math.random() - 0.5) * 4); // Small int variation
        return Math.max(1, cell + variation); // Ensure positive
      })
    );
    
    const demoConfusionMatrix = {
      matrix: variedMatrix,
      labels: ['Accept', 'Reject']
    };
    
    // Fake distribution data with slight variations
    const baseDistribution = [
      { range: '90%-100%', basePercentage: 62 },
      { range: '80%-90%', basePercentage: 23 },
      { range: '70%-80%', basePercentage: 10 },
      { range: '60%-70%', basePercentage: 3 },
      { range: '50%-60%', basePercentage: 1 },
      { range: '0%-50%', basePercentage: 1 }
    ];
    
    // Add variations and ensure percentages still sum to 100
    const demoDistribution = baseDistribution.map(bin => {
      const variation = (Math.random() - 0.5) * 2; // Small percentage variation
      return {
        range: bin.range,
        percentage: Math.max(0.1, bin.basePercentage + variation)
      };
    });
    
    // Normalize to ensure sum is close to 100%
    const total = demoDistribution.reduce((sum, bin) => sum + bin.percentage, 0);
    demoDistribution.forEach(bin => {
      bin.percentage = (bin.percentage / total) * 100;
    });
    
    // Fake error analysis with small variations
    const baseErrors = [
      {
        category: 'Low Confidence Predictions',
        baseFrequency: 12.5,
        impact: 'Medium',
        description: 'Predictions with confidence below 75% tend to have higher error rates.'
      },
      {
        category: 'Processing Time Spikes',
        baseFrequency: 5.2,
        impact: 'Low',
        description: 'Occasional spikes in processing time observed for complex claims.'
      },
      {
        category: 'Missing Injury Data',
        baseFrequency: 8.3,
        impact: 'High',
        description: 'Claims with incomplete injury data show significant prediction deviation.'
      }
    ];
    
    const demoErrors = baseErrors.map(error => {
      const variation = (Math.random() - 0.5) * 0.8; // Small variation in frequency
      return {
        ...error,
        frequency: Math.max(0.1, error.baseFrequency + variation)
      };
    });
    
    // Fake model comparison with slight variations
    const baseComparison = [
      {
        version: '1.0',
        baseAccuracy: 0.94,
        baseF1: 0.93,
        baseErrorRate: 0.06,
        baseProcessingTime: 342
      },
      {
        version: '0.9',
        baseAccuracy: 0.91,
        baseF1: 0.90, 
        baseErrorRate: 0.09,
        baseProcessingTime: 385
      },
      {
        version: '0.8',
        baseAccuracy: 0.88,
        baseF1: 0.87,
        baseErrorRate: 0.12,
        baseProcessingTime: 410
      }
    ];
    
    const demoComparison = baseComparison.map(model => {
      // Small variations for each metric
      const accVar = (Math.random() - 0.5) * 0.01;
      const f1Var = (Math.random() - 0.5) * 0.01;
      const errVar = (Math.random() - 0.5) * 0.01;
      const timeVar = Math.floor((Math.random() - 0.5) * 10);
      
      return {
        version: model.version,
        accuracy: Math.max(0, Math.min(1, model.baseAccuracy + accVar)),
        f1_score: Math.max(0, Math.min(1, model.baseF1 + f1Var)),
        error_rate: Math.max(0, Math.min(1, model.baseErrorRate + errVar)),
        processing_time: Math.max(100, model.baseProcessingTime + timeVar)
      };
    });
    
    setPerformanceData({
      modelMetrics: demoMetrics,
      confusionMatrix: demoConfusionMatrix,
      confidenceDistribution: demoDistribution,
      errorAnalysis: demoErrors,
      modelComparison: demoComparison
    });
  };

  useEffect(() => {
    // Initial load of performance data
    fetchPerformanceData();
    
    // Set up interval to refresh data every 1 minute to simulate real-time updates
    const intervalId = setInterval(() => {
      fetchPerformanceData();
    }, 60000); // 60000ms = 1 minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchPerformanceData]);

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

  const renderConfidenceDistribution = () => {
    if (!performanceData.confidenceDistribution || performanceData.confidenceDistribution.length === 0) return null;

    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confidence Score Distribution</h4>
        <div className="bg-white dark:bg-gray-700 shadow rounded-lg p-4">
          <div className="grid grid-cols-6 gap-2">
            {performanceData.confidenceDistribution.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-t-lg overflow-hidden">
                  <div
                    className="bg-indigo-500 h-32 rounded-t-lg"
                    style={{ height: `${Math.min(Math.max(item.percentage, 5), 100)}%` }}
                  ></div>
                </div>
                <div className="w-full text-center text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                  {item.range}
                </div>
                <div className="w-full text-center text-xs text-gray-500 dark:text-gray-400">
                  {item.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
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
                              {typeof metric.value === 'number' && metric.name.toLowerCase().includes('rate') 
                                ? `${(metric.value * 100).toFixed(1)}%` 
                                : typeof metric.value === 'number' && metric.name.toLowerCase().includes('confidence')
                                  ? `${(metric.value * 100).toFixed(1)}%`
                                  : metric.value}
                            </div>
                            {metric.trend && (
                              <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                                metric.trend > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend).toFixed(2)}%
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

            {/* Confidence Distribution */}
            {renderConfidenceDistribution()}
          </>
        )}
      </div>
    </div>
  );
};

export default MLPerformance;