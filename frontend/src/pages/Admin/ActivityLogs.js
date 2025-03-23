import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/authService';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({
    action: '',
    resource_type: '',
    user: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Prepare query parameters
      const params = new URLSearchParams();
      params.append('page', currentPage);
      
      if (filter.action) params.append('action', filter.action);
      if (filter.resource_type) params.append('resource_type', filter.resource_type);
      if (filter.user) params.append('user', filter.user);
      if (filter.dateFrom) params.append('date_from', filter.dateFrom);
      if (filter.dateTo) params.append('date_to', filter.dateTo);
      
      const response = await apiClient.get(`/account/activity-logs/?${params.toString()}`);
      
      setLogs(response.data.results || response.data);
      
      // Set total pages if pagination info available
      if (response.data.count && response.data.page_size) {
        setTotalPages(Math.ceil(response.data.count / response.data.page_size));
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setError('Failed to load activity logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const resetFilters = () => {
    setFilter({
      action: '',
      resource_type: '',
      user: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-600">View all user activity in the system</p>
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

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          <button 
            onClick={resetFilters}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Reset Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700">User Email</label>
            <input
              type="text"
              id="user"
              name="user"
              value={filter.user}
              onChange={handleFilterChange}
              className="mt-1 form-input"
              placeholder="Filter by user email"
            />
          </div>
          
          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-700">Action</label>
            <input
              type="text"
              id="action"
              name="action"
              value={filter.action}
              onChange={handleFilterChange}
              className="mt-1 form-input"
              placeholder="e.g. viewed, created"
            />
          </div>
          
          <div>
            <label htmlFor="resource_type" className="block text-sm font-medium text-gray-700">Resource Type</label>
            <input
              type="text"
              id="resource_type"
              name="resource_type"
              value={filter.resource_type}
              onChange={handleFilterChange}
              className="mt-1 form-input"
              placeholder="e.g. model, prediction"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">Date From</label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filter.dateFrom}
                onChange={handleFilterChange}
                className="mt-1 form-input"
              />
            </div>
            
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">Date To</label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filter.dateTo}
                onChange={handleFilterChange}
                className="mt-1 form-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.user_email || 'Anonymous'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;